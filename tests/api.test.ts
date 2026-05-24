import { describe, it, expect, beforeEach, vi } from "vitest";
import * as path from "node:path";

// Mock fetch globally before importing api module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const apiPath = path.join(PROJECT_ROOT, "extensions", "api.ts");

describe("api — TinyFish REST client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Search API
  // ---------------------------------------------------------------------------

  describe("search()", () => {
    it("calls GET search endpoint with query params", async () => {
      const { search } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { title: "Test", url: "https://example.com", snippet: "A result" },
          ],
        }),
      });

      const result = await search("tf_key", { query: "hello world" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("api.search.tinyfish.ai");
      expect(url).toContain("query=hello+world");
      expect(opts.method).toBe("GET");
      expect(opts.headers["X-API-Key"]).toBe("tf_key");
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("Test");
    });

    it("passes location and language params", async () => {
      const { search } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await search("tf_key", {
        query: "test",
        location: "CN",
        language: "zh",
        page: 2,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("location=CN");
      expect(url).contains("language=zh");
      expect(url).toContain("page=2");
    });

    it("throws TinyFishApiError on non-2xx response", async () => {
      const { search, TinyFishApiError } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      let caughtError: Error | undefined;
      try {
        await search("bad_key", { query: "test" });
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeInstanceOf(TinyFishApiError);
      expect((caughtError as TinyFishApiError).status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Fetch API
  // ---------------------------------------------------------------------------

  describe("fetchUrls()", () => {
    it("calls POST fetch endpoint with URLs body", async () => {
      const { fetchUrls } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { url: "https://example.com", title: "Example", text: "Hello" },
          ],
        }),
      });

      const result = await fetchUrls("tf_key", {
        urls: ["https://example.com"],
        format: "markdown",
      });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe("POST");
      expect(opts.headers["X-API-Key"]).toBe("tf_key");

      const body = JSON.parse(opts.body);
      expect(body.urls).toEqual(["https://example.com"]);
      expect(body.format).toBe("markdown");
      expect(result.results).toHaveLength(1);
    });

    it("defaults format to markdown and links to false", async () => {
      const { fetchUrls } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await fetchUrls("tf_key", { urls: ["https://x.com"] });

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.format).toBe("markdown");
      expect(body.links).toBe(false);
      expect(body.image_links).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Agent SSE
  // ---------------------------------------------------------------------------

  describe("agentRunSSE()", () => {
    async function createSSEStream(events: string[]): Promise<ReadableStream> {
      const data = events.map(e => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
        },
      });
    }

    it("parses SSE events and calls onUpdate for each", async () => {
      const { agentRunSSE } = await import(apiPath);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: await createSSEStream([
          { type: "STARTED" },
          { type: "PROGRESS", data: "navigating..." },
          { type: "COMPLETE", data: { result: "done" } },
        ]),
      });

      const events: unknown[] = [];
      const result = await agentRunSSE(
        "tf_key",
        { url: "https://example.com", goal: "extract prices" },
        (event) => events.push(event),
      );

      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events[0].type).toBe("PROGRESS"); // first event gets default PROGRESS
      // Last event should be COMPLETE data
      expect(result).toBeDefined();
    });

    it("throws on non-2xx response", async () => {
      const { agentRunSSE, TinyFishApiError } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Bad request" }),
      });

      await expect(
        agentRunSSE("tf_key", { url: "https://x.com", goal: "test" })
      ).rejects.toThrow(TinyFishApiError);
    });

    it("throws when no response body", async () => {
      const { agentRunSSE } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      await expect(
        agentRunSSE("tf_key", { url: "https://x.com", goal: "test" })
      ).rejects.toThrow("No response body");
    });
  });

  // ---------------------------------------------------------------------------
  // Runs Management
  // ---------------------------------------------------------------------------

  describe("getRun()", () => {
    it("fetches a single run by ID", async () => {
      const { getRun } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "run_123",
          goal: "test goal",
          url: "https://example.com",
          status: "COMPLETED",
          result: { data: "ok" },
        }),
      });

      const result = await getRun("tf_key", "run_123");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/runs/run_123");
      expect(result.id).toBe("run_123");
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("listRuns()", () => {
    it("fetches runs list with filter params", async () => {
      const { listRuns } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runs: [
            { id: "r1", status: "COMPLETED", goal: "g1", url: "https://a.com" },
            { id: "r2", status: "FAILED", goal: "g2", url: "https://b.com" },
          ],
        }),
      });

      const result = await listRuns("tf_key", {
        status: "COMPLETED",
        limit: 5,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("status=COMPLETED");
      expect(url).toContain("limit=5");
      expect(result.runs).toHaveLength(2);
    });
  });

  describe("cancelRun()", () => {
    it("sends DELETE request for a run", async () => {
      const { cancelRun } = await import(apiPath);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await cancelRun("tf_key", "run_abc");

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/runs/run_abc");
      expect(opts.method).toBe("DELETE");
    });
  });

  // ---------------------------------------------------------------------------
  // Timeout constants
  // ---------------------------------------------------------------------------

  describe("timeout constants", () => {
    it("exports DEFAULT_TIMEOUT as a reasonable value (60s)", async () => {
      const { DEFAULT_TIMEOUT } = await import(apiPath);
      expect(DEFAULT_TIMEOUT).toBe(60_000);
    });

    it("exports DEFAULT_SSE_TIMEOUT as a reasonable value (5min)", async () => {
      const { DEFAULT_SSE_TIMEOUT } = await import(apiPath);
      expect(DEFAULT_SSE_TIMEOUT).toBe(300_000);
    });
  });
});
