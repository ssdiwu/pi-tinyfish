import { Type, Static } from "@earendil-works/pi-ai";
import { readConfig, resolveApiKey, getDefaultBrowserProfile } from "../config.js";
import { agentRunSSE } from "../api.js";
import { formatAgentEvent, truncateOutput } from "../format.js";

// ---------------------------------------------------------------------------
// Parameters schema
// ---------------------------------------------------------------------------

const AgentRunParams = Type.Object({
  url: Type.String({ description: "Target URL to automate on" }),
  goal: Type.String({
    description:
      "Natural language description of what to accomplish. Be specific about actions (click, extract, fill) and expected output format.",
  }),
  browserProfile: Type.Optional(
    Type.Union([Type.Literal("lite"), Type.Literal("stealth")], {
      description: "Browser profile: 'lite' for speed, 'stealth' for bot detection avoidance",
    }),
  ),
  useVault: Type.Optional(Type.Boolean({
    description: "Use credentials from TinyFish Vault password manager",
  })),
  credentialItemIds: Type.Optional(
    Type.Array(Type.String(), {
      description: "Specific credential IDs from Vault to use",
    }),
  ),
  proxyConfig: Type.Optional(
    Type.Object({
      enabled: Type.Optional(Type.Boolean()),
      type: Type.Optional(Type.Union([Type.Literal("tetra"), Type.Literal("custom")])),
      countryCode: Type.Optional(Type.String()),
      url: Type.Optional(Type.String()),
      username: Type.Optional(Type.String()),
      password: Type.Optional(Type.String()),
    }),
  ),
  maxBytes: Type.Optional(Type.Number({
    description: "Maximum output size in bytes (default: 50KB, max: 200KB)",
  })),
});

type AgentRunParamsType = Static<typeof AgentRunParams>;

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const tinyfish_agent_run = {
  name: "tinyfish_agent_run",
  label: "TinyFish Agent Run",
  description:
    "Execute a goal-driven browser automation task via TinyFish Agent. The agent navigates a real browser to complete tasks like data extraction, form filling, multi-step workflows. Results stream in real-time.",
  parameters: AgentRunParams,
  executionMode: "sequential" as const,

  async execute(
    _id: string,
    params: AgentRunParamsType,
    signal: AbortSignal | undefined,
    onUpdate?: (partialResult: { content: Array<{ type: string; text: string }>; details: Record<string, unknown> }) => void,
  ) {
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

    const browser_profile = params.browserProfile ?? getDefaultBrowserProfile(config);

    // Collect SSE events into output buffer
    const outputLines: string[] = [];

    const result = await agentRunSSE(
      apiKey,
      {
        url: params.url,
        goal: params.goal,
        browser_profile: browser_profile as "lite" | "stealth",
        use_vault: params.useVault,
        credential_item_ids: params.credentialItemIds,
        proxy_config: params.proxyConfig as AgentRunParamsType["proxyConfig"],
      },
      (event) => {
        const line = formatAgentEvent(event);
        outputLines.push(line);

        // Stream progress to UI via proper AgentToolUpdateCallback shape
        onUpdate?.({
          content: [{ type: "text", text: line + "\n" }],
          details: { eventType: event.type },
        });
      },
      signal,
    );

    // Append final structured result
    if (result && typeof result === "object") {
      outputLines.push("\n## Result");
      outputLines.push(JSON.stringify(result, null, 2));
    }

    let output = outputLines.join("\n");
    if (params.maxBytes) {
      output = truncateOutput(output, params.maxBytes);
    }

    return {
      content: [{ type: "text" as const, text: output }],
      details: { completed: true },
    };
  },
};
