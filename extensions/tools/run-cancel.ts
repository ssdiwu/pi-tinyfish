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
  promptSnippet: "Cancel a running or pending automation run to stop execution and save resources",
  promptGuidelines: [
    "Use tinyfish_run_cancel when a tinyfish_agent_run is taking too long or no longer needed.",
    "Always confirm with the user before cancelling a run unless they explicitly asked to stop.",
  ],
  parameters: RunCancelParams,

  async execute(_id: string, params: RunCancelParamsType) {
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

    await cancelRun(apiKey, params.runId);

    return {
      content: [
        { type: "text" as const, text: `Run ${params.runId} has been cancelled.` },
      ],
      details: { runId: params.runId, cancelled: true },
    };
  },
};
