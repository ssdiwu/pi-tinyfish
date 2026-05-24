import { truncateHead, DEFAULT_MAX_BYTES } from "@earendil-works/pi-coding-agent";

// ---------------------------------------------------------------------------
// Search result formatting
// ---------------------------------------------------------------------------

export function formatSearchResults(results: Array<{
  title?: string;
  url?: string;
  snippet?: string;
  site_name?: string;
  position?: number;
}>): string {
  if (!results.length) return "No results found.";

  const lines: string[] = [];
  lines.push(`Found ${results.length} result(s):\n`);

  for (const r of results) {
    const pos = r.position != null ? `[${r.position}] ` : "";
    const site = r.site_name ? ` (${r.site_name})` : "";
    lines.push(`${pos}${r.title ?? "Untitled"}${site}`);
    if (r.url) lines.push(`  URL: ${r.url}`);
    if (r.snippet) lines.push(`  ${r.snippet}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Fetch result formatting
// ---------------------------------------------------------------------------

export function formatFetchResults(results: Array<{
  url?: string;
  title?: string;
  description?: string;
  text?: string;
  html?: string;
  error?: string;
}>): string {
  if (!results.length) return "No results returned.";

  const lines: string[] = [];
  lines.push(`Fetched ${results.length} page(s):\n`);

  for (const r of results) {
    lines.push(`## ${r.title ?? r.url ?? "Unknown"}`);
    if (r.url) lines.push(`URL: ${r.url}`);
    if (r.description) lines.push(`Description: ${r.description}`);

    if (r.error) {
      lines.push(`Error: ${r.error}`);
    } else if (r.text) {
      lines.push(r.text);
    } else if (r.html) {
      lines.push("[HTML content available — use format='html' or 'json' to retrieve]");
    } else {
      lines.push("(no extracted content)");
    }
    lines.push("---\n");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Agent run event formatting
// ---------------------------------------------------------------------------

export function formatAgentEvent(event: { type: string; data: unknown }): string {
  switch (event.type) {
    case "STARTED":
      return "🚀 Agent started...";
    case "STREAMING_URL":
      return typeof event.data === "string"
        ? `🌐 Browser preview: ${event.data}`
        : "🌐 Browser session active";
    case "PROGRESS": {
      const msg = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
      return `⏳ ${msg}`;
    }
    case "COMPLETE":
      return "✅ Agent completed.";
    case "ERROR":
      return `❌ Error: ${typeof event.data === "string" ? event.data : JSON.stringify(event.data)}`;
    default:
      return `${event.type}: ${JSON.stringify(event.data)}`;
  }
}

// ---------------------------------------------------------------------------
// Truncation wrapper around pi's built-in
// ---------------------------------------------------------------------------

export function truncateOutput(text: string, maxBytes?: number): string {
  const limit = maxBytes ?? DEFAULT_MAX_BYTES;
  const result = truncateHead(text, { maxBytes: limit });
  // truncateHead returns TruncationResult { content, truncated, ... }
  return typeof result === "string" ? result : (result?.content ?? String(result));
}
