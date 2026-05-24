import { describe, it, expect } from "vitest";
import * as path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const formatPath = path.join(PROJECT_ROOT, "extensions", "format.ts");

describe("format — output formatting", () => {
  // ---------------------------------------------------------------------------
  // formatSearchResults
  // ---------------------------------------------------------------------------

  describe("formatSearchResults", () => {
    it("formats search results with title, url, snippet", async () => {
      const { formatSearchResults } = await import(formatPath);
      const result = formatSearchResults([
        {
          position: 1,
          title: "Google",
          url: "https://google.com",
          snippet: "A search engine",
          site_name: "Google",
        },
        {
          position: 2,
          title: "Bing",
          url: "https://bing.com",
          snippet: "Another search engine",
        },
      ]);

      expect(result).toContain("Found 2 result(s)");
      expect(result).toContain("[1] Google (Google)");
      expect(result).toContain("URL: https://google.com");
      expect(result).toContain("A search engine");
      expect(result).toContain("[2] Bing");
      expect(result).toContain("https://bing.com");
    });

    it("handles empty results", async () => {
      const { formatSearchResults } = await import(formatPath);
      expect(formatSearchResults([])).toBe("No results found.");
    });

    it("handles results with missing optional fields", async () => {
      const { formatSearchResults } = await import(formatPath);
      const result = formatSearchResults([
        { title: "Only Title" }, // no url, snippet, etc.
      ]);

      expect(result).toContain("Only Title");
      expect(result).toContain("Found 1 result(s)");
    });
  });

  // ---------------------------------------------------------------------------
  // formatFetchResults
  // ---------------------------------------------------------------------------

  describe("formatFetchResults", () => {
    it("formats fetch results with text content", async () => {
      const { formatFetchResults } = await import(formatPath);
      const result = formatFetchResults([
        {
          url: "https://example.com",
          title: "Example Page",
          description: "A test page",
          text: "<p>Hello world</p>",
        },
      ]);

      expect(result).toContain("Fetched 1 page(s)");
      expect(result).toContain("## Example Page");
      expect(result).toContain("URL: https://example.com");
      expect(result).toContain("Description: A test page");
      expect(result).toContain("<p>Hello world</p>");
    });

    it("shows error when present", async () => {
      const { formatFetchResults } = await import(formatPath);
      const result = formatFetchResults([
        { url: "https://blocked.com", error: "403 Forbidden" },
      ]);

      expect(result).toContain("Error: 403 Forbidden");
    });

    it("handles empty results", async () => {
      const { formatFetchResults } = await import(formatPath);
      expect(formatFetchResults([])).toBe("No results returned.");
    });

    it("indicates HTML-only content availability", async () => {
      const { formatFetchResults } = await import(formatPath);
      const result = formatFetchResults([
        { url: "https://example.com", html: "<html>...</html>" },
      ]);

      expect(result).toContain("HTML content available");
    });

    it("handles multiple pages", async () => {
      const { formatFetchResults } = await import(formatPath);
      const result = formatFetchResults([
        { url: "https://a.com", text: "Content A" },
        { url: "https://b.com", text: "Content B" },
        { url: "https://c.com", text: "Content C" },
      ]);

      expect(result).toContain("Fetched 3 page(s)");
      expect(result).toContain("Content A");
      expect(result).toContain("Content B");
      expect(result).toContain("Content C");
    });
  });

  // ---------------------------------------------------------------------------
  // formatAgentEvent
  // ---------------------------------------------------------------------------

  describe("formatAgentEvent", () => {
    it("formats STARTED event", async () => {
      const { formatAgentEvent } = await import(formatPath);
      expect(formatAgentEvent({ type: "STARTED", data: null })).toContain("started");
    });

    it("formats STREAMING_URL event with string data", async () => {
      const { formatAgentEvent } = await import(formatPath);
      const result = formatAgentEvent({ type: "STREAMING_URL", data: "https://preview.example.com" });
      expect(result).toContain("Browser preview");
      expect(result).toContain("https://preview.example.com");
    });

    it("formats PROGRESS event", async () => {
      const { formatAgentEvent } = await import(formatPath);
      const result = formatAgentEvent({ type: "PROGRESS", data: "Clicking button..." });
      expect(result).toContain("⏳");
      expect(result).toContain("Clicking button...");
    });

    it("formats COMPLETE event", async () => {
      const { formatAgentEvent } = await import(formatPath);
      expect(formatAgentEvent({ type: "COMPLETE", data: {} })).toContain("completed");
    });

    it("formats ERROR event", async () => {
      const { formatAgentEvent } = await import(formatPath);
      const result = formatAgentEvent({ type: "ERROR", data: "Timeout exceeded" });
      expect(result).toContain("❌");
      expect(result).toContain("Timeout exceeded");
    });

    it("formats unknown events as JSON", async () => {
      const { formatAgentEvent } = await import(formatPath);
      const result = formatAgentEvent({ type: "CUSTOM_EVENT", data: { x: 1 } });
      expect(result).toContain("CUSTOM_EVENT");
    });
  });

  // ---------------------------------------------------------------------------
  // truncateOutput
  // ---------------------------------------------------------------------------

  describe("truncateOutput", () => {
    it("passes through short text unchanged", async () => {
      const { truncateOutput } = await import(formatPath);
      const short = "Hello, this is a short text.";
      const result = truncateOutput(short);
      // Should contain the original text
      expect(result).toContain(short);
    });

    it("truncates long text to default max bytes", async () => {
      const { truncateOutput } = await import(formatPath);
      // Generate text larger than 50KB
      const longText = "A".repeat(100_000);
      const result = truncateOutput(longText);

      // Should be a string much shorter than original
      expect(typeof result).toBe("string");
      expect(result.length).toBeLessThan(longText.length);
    });

    it("respects custom maxBytes", async () => {
      const { truncateOutput } = await import(formatPath);
      const text = "B".repeat(10_000);
      const small = truncateOutput(text, 1000);
      const large = truncateOutput(text, 50_000);

      // Both should be strings
      expect(typeof small).toBe("string");
      expect(typeof large).toBe("string");
      // Smaller limit should produce shorter or equal output
      expect(small.length).toBeLessThanOrEqual(large.length);
    });
  });
});
