import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey } from "../config.js";
import { listRuns } from "../api.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const RunListParams = Type.Object({
  status: Type.Optional(
    Type.Union([
      Type.Literal("COMPLETED"),
      Type.Literal("FAILED"),
      Type.Literal("CANCELLED"),
    ], {
      description: "Filter by run status",
    }),
  ),
  goal: Type.Optional(Type.String({
    description: "Search runs by goal text (fuzzy match)",
  })),
  createdAfter: Type.Optional(Type.String({
    description: "ISO timestamp to filter runs created after this time",
  })),
  createdBefore: Type.Optional(Type.String({
    description: "ISO timestamp to filter runs created before this time",
  })),
  sortDirection: Type.Optional(
    Type.Union([Type.Literal("asc"), Type.Literal("desc")], {
      description: "Sort order by creation time",
    }),
  ),
  limit: Type.Optional(Type.Number({
    description: "Number of results to return (1-100, default: 20)",
  })),
});

type RunListParamsType = Static<typeof RunListParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_run_list = {
  name: "tinyfish_run_list",
  label: "TinyFish List Runs",
  description:
    "List and search historical TinyFish Agent automation runs. Filter by status, goal text, or date range.",
  promptSnippet: "List and search past automation runs by status, goal text, or time range",
  promptGuidelines: [
    "Use tinyfish_run_list to find previous automation runs or check run history.",
    "Filter by status='COMPLETED' to find successful runs with results.",
    "Use the goal parameter for fuzzy text search across run descriptions.",
  ],
  parameters: RunListParams,

  async execute(_id: string, params: RunListParamsType) {
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

    const response = await listRuns(apiKey, {
      status: params.status,
      goal: params.goal,
      created_after: params.createdAfter,
      created_before: params.createdBefore,
      sort_direction: params.sortDirection,
      limit: params.limit ?? 20,
    });

    const runs = response.runs ?? [];
    if (!runs.length) {
      return {
        content: [{ type: "text" as const, text: "No runs found matching the criteria." }],
        details: { count: 0 },
      };
    }

    const lines: string[] = [`Found ${runs.length} run(s):\n`];

    for (const r of runs) {
      lines.push(`### ${r.id}`);
      lines.push(`Status: ${r.status}`);
      lines.push(`Goal: ${r.goal}`);
      lines.push(`URL: ${r.url}`);
      if (r.created_at) lines.push(`Created: ${r.created_at}`);
      if (r.error) lines.push(`Error: ${r.error}`);
      lines.push("");
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: { count: runs.length },
    };
  },
};
