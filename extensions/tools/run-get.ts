import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey } from "../config.js";
import { getRun } from "../api.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const RunGetParams = Type.Object({
  runId: Type.String({ description: "The ID of the automation run to query" }),
});

type RunGetParamsType = Static<typeof RunGetParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_run_get = {
  name: "tinyfish_run_get",
  label: "TinyFish Get Run",
  description:
    "Get detailed status and result of a specific TinyFish Agent automation run by its ID.",
  parameters: RunGetParams,

  async execute(_id: string, params: RunGetParamsType) {
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

    try {
      const run = await getRun(apiKey, params.runId);

      let output = [
        `## Run ${run.id}`,
        `Status: ${run.status}`,
        `Goal: ${run.goal}`,
        `URL: ${run.url}`,
        `Created: ${run.created_at ?? "N/A"}`,
        `Updated: ${run.updated_at ?? "N/A"}`,
      ].join("\n");

      if (run.result) {
        output += `\n\n## Result\n${JSON.stringify(run.result, null, 2)}`;
      }

      if (run.error) {
        output += `\n\n## Error\n${run.error}`;
      }

      return {
        content: [{ type: "text" as const, text: output }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Failed to get run: ${message}` }],
        isError: true,
      };
    }
  },
};
