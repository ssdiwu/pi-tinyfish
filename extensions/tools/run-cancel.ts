import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey } from "../config.js";
import { cancelRun } from "../api.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const RunCancelParams = Type.Object({
  runId: Type.String({ description: "The ID of the automation run to cancel" }),
});

type RunCancelParamsType = Static<typeof RunCancelParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_run_cancel = {
  name: "tinyfish_run_cancel",
  label: "TinyFish Cancel Run",
  description:
    "Cancel an in-progress or pending TinyFish Agent automation run.",
  parameters: RunCancelParams,

  async execute(_id: string, params: RunCancelParamsType) {
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
      await cancelRun(apiKey, params.runId);

      return {
        content: [
          {
            type: "text" as const,
            text: `Run ${params.runId} has been cancelled.`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Failed to cancel run: ${message}` }],
        isError: true,
      };
    }
  },
};
