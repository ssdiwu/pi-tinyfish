import type { TinyFishConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEARCH_BASE = "https://api.search.tinyfish.ai";
const FETCH_BASE = "https://api.fetch.tinyfish.ai";
const AGENT_BASE = "https://agent.tinyfish.ai";

export const DEFAULT_TIMEOUT = 60_000;
export const DEFAULT_SSE_TIMEOUT = 300_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class TinyFishApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(`TinyFish API ${status}: ${message}`);
    this.name = "TinyFishApiError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

async function fetchJson<T>(
  url: string,
  options: RequestInit & { apiKey: string },
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: buildHeaders(options.apiKey, options.headers as Record<string, string> | undefined),
    });

    if (!res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
      throw new TinyFishApiError(res.status, `Request failed`, body);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  site_name?: string;
  position?: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  query?: string;
  total_results?: number;
}

export async function search(
  apiKey: string,
  params: {
    query: string;
    location?: string;
    language?: string;
    page?: number;
  },
): Promise<SearchResponse> {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set("query", params.query);
  if (params.location) url.searchParams.set("location", params.location);
  if (params.language) url.searchParams.set("language", params.language);
  if (params.page != null) url.searchParams.set("page", String(params.page));

  return fetchJson<SearchResponse>(url.toString(), {
    method: "GET",
    apiKey,
  });
}

// ---------------------------------------------------------------------------
// Fetch API
// ---------------------------------------------------------------------------

export interface FetchResultItem {
  url: string;
  title?: string;
  description?: string;
  text?: string;
  html?: string;
  links?: Array<{ text: string; url: string }>;
  image_links?: Array<{ src: string; alt?: string }>;
  error?: string;
}

export interface FetchResponse {
  results: FetchResultItem[];
}

export async function fetchUrls(
  apiKey: string,
  params: {
    urls: string[];
    format?: "markdown" | "html" | "json";
    links?: boolean;
    image_links?: boolean;
  },
): Promise<FetchResponse> {
  return fetchJson<FetchResponse>(FETCH_BASE, {
    method: "POST",
    apiKey,
    body: JSON.stringify({
      urls: params.urls,
      format: params.format ?? "markdown",
      links: params.links ?? false,
      image_links: params.image_links ?? false,
    }),
  });
}

// ---------------------------------------------------------------------------
// Agent Run SSE API
// ---------------------------------------------------------------------------

export type AgentEventType =
  | "STARTED"
  | "STREAMING_URL"
  | "PROGRESS"
  | "COMPLETE"
  | "ERROR";

export interface AgentEvent {
  type: AgentEventType;
  data: unknown;
}

export interface AgentRunParams {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  use_vault?: boolean;
  credential_item_ids?: string[];
  proxy_config?: {
    enabled?: boolean;
    type?: "tetra" | "custom";
    country_code?: string;
    url?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Execute an agent run via SSE. Calls onUpdate for each event.
 * Returns the final data from the COMPLETE event (or last event).
 */
export async function agentRunSSE(
  apiKey: string,
  params: AgentRunParams,
  onUpdate?: (event: AgentEvent) => void,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_SSE_TIMEOUT,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) { clearTimeout(timer); throw new DOMException("Aborted", "AbortError"); }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${AGENT_BASE}/v1/automation/run-sse`, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text(); }
      throw new TinyFishApiError(res.status, `Agent run failed`, body);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body from SSE stream");

    const decoder = new TextDecoder();
    let buffer = "";
    let finalData: unknown;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const raw = trimmed.slice(5).trim();
        if (raw === "[DONE]") continue;

        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { continue; }

        const event: AgentEvent = { type: "PROGRESS", data: parsed };
        finalData = parsed;

        onUpdate?.(event);
      }
    }

    return finalData;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Runs Management API
// ---------------------------------------------------------------------------

export interface RunInfo {
  id: string;
  goal: string;
  url: string;
  status: "COMPLETED" | "FAILED" | "CANCELLED" | "RUNNING" | "PENDING";
  result?: unknown;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getRun(apiKey: string, runId: string): Promise<RunInfo> {
  return fetchJson<RunInfo>(`${AGENT_BASE}/v1/runs/${runId}`, {
    method: "GET",
    apiKey,
  });
}

export async function listRuns(
  apiKey: string,
  params?: {
    status?: string;
    goal?: string;
    created_after?: string;
    created_before?: string;
    sort_direction?: "asc" | "desc";
    limit?: number;
  },
): Promise<{ runs: RunInfo[] }> {
  const url = new URL(`${AGENT_BASE}/v1/runs`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  return fetchJson<{ runs: RunInfo[] }>(url.toString(), {
    method: "GET",
    apiKey,
  });
}

export async function cancelRun(apiKey: string, runId: string): Promise<void> {
  await fetchJson<void>(`${AGENT_BASE}/v1/runs/${runId}`, {
    method: "DELETE",
    apiKey,
  });
}
