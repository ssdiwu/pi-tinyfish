import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey, getDefaultFetchFormat } from "../config.js";
import { fetchUrls } from "../api.js";
import { formatFetchResults, truncateText } from "../format.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const FetchParams = Type.Object({
  url: Type.Optional(Type.String({
    description: "Single URL to fetch content from",
  })),
  urls: Type.Optional(Type.Array(Type.String(), {
    description: "Multiple URLs to fetch (max 10)",
  })),
  format: Type.Optional(
    Type.Union([
      Type.Literal("markdown"),
      Type.Literal("html"),
      Type.Literal("json"),
    ], {
      description: "Output format",
    }),
  ),
  links: Type.Optional(Type.Boolean({
    description: "Extract links from pages",
  })),
  imageLinks: Type.Optional(Type.Boolean({
    description: "Extract image links from pages",
  })),
  maxBytes: Type.Optional(Type.Number({
    description: "Maximum output size in bytes (default: 50KB, max: 200KB)",
  })),
});

type FetchParamsType = Static<typeof FetchParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_fetch = {
  name: "tinyfish_fetch",
  label: "TinyFish Fetch",
  description:
    "Fetch and extract clean content from one or more URLs. Renders JavaScript-heavy pages and returns text in markdown, HTML, or JSON format.",
  parameters: FetchParams,

  async execute(_id: string, params: FetchParamsType) {
    // Resolve config & API key
    const config = await readConfig();
    const apiKey = resolveApiKey(config);
    if (!apiKey) {
      return {
        content: [
          {
            type: "text" as const,
            text: "TinyFish API key not configured. Run /tinyfish-login to set it up.",
          },
        ],
      };
    }

    // Validate URLs
    const urls: string[] = [];
    if (params.url) urls.push(params.url);
    if (params.urls) urls.push(...params.urls);

    if (urls.length === 0) {
      return {
        content: [{ type: "text" as const, text: "Either 'url' or 'urls' parameter is required." }],
        isError: true,
      };
    }

    if (urls.length > 10) {
      return {
        content: [{ type: "text" as const, text: "Maximum 10 URLs per request." }],
        isError: true,
      };
    }

    // Apply defaults
    const format = params.format ?? getDefaultFetchFormat(config);

    try {
      const response = await fetchUrls(apiKey, {
        urls,
        format: format as "markdown" | "html" | "json",
        links: params.links,
        imageLinks: params.imageLinks,
      });

      let output = formatFetchResults(response.results ?? []);
      if (params.maxBytes) {
        output = truncateText(output, params.maxBytes);
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Fetch failed: ${message}` }],
        isError: true,
      };
    }
  },
};
