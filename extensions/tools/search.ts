import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey, getDefaultLocation, getDefaultLanguage } from "../config.js";
import { search } from "../api.js";
import { formatSearchResults, truncateOutput } from "../format.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const SearchParams = Type.Object({
  query: Type.String({ description: "Search query string" }),
  location: Type.Optional(Type.String({
    description: "Country code for localized results (e.g. US, CN, JP)",
  })),
  language: Type.Optional(Type.String({
    description: "Language code (e.g. en, zh, ja)",
  })),
  page: Type.Optional(Type.Number({
    description: "Page number (0-based)",
  })),
  maxBytes: Type.Optional(Type.Number({
    description: "Maximum output size in bytes (default: 50KB, max: 200KB)",
  })),
});

type SearchParamsType = Static<typeof SearchParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_search = {
  name: "tinyfish_search",
  label: "TinyFish Search",
  description:
    "Search the web using TinyFish Search API. Returns ranked results with titles, snippets, and URLs.",
  promptSnippet: "Search the web for current information, discover URLs, find answers to factual questions",
  promptGuidelines: [
    "Use tinyfish_search when the user needs to find information on the web, discover URLs, or get up-to-date search results.",
    "Prefer tinyfish_search over tinyfish_fetch when you don't have a specific URL yet.",
    "Use location and language parameters to match the user's context (e.g., CN/zh for Chinese users).",
    "Set maxBytes when you only need a few top results to save context space.",
  ],
  parameters: SearchParams,

  async execute(_id: string, params: SearchParamsType) {
    const config = await readConfig();
    const apiKey = resolveApiKey(config);
    if (!apiKey) {
      return {
        content: [
          { type: "text" as const, text: "TinyFish API key not configured. Run /tinyfish-login to set it up." },
        ],
        details: {},
      };
    }

    const location = params.location ?? getDefaultLocation(config);
    const language = params.language ?? getDefaultLanguage(config);

    const response = await search(apiKey, {
      query: params.query,
      location,
      language,
      page: params.page,
    });

    let output = formatSearchResults(response.results ?? []);
    if (params.maxBytes) {
      output = truncateOutput(output, params.maxBytes);
    }

    return {
      content: [{ type: "text" as const, text: output }],
      details: { resultCount: response.results?.length ?? 0 },
    };
  },
};
