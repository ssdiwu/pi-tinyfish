import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config.js", () => ({
  readConfig: () => ({ apiKey: "tf_test" }),
  resolveApiKey: () => "tf_test",
  getDefaultBrowserProfile: () => "lite",
}));
vi.mock("../src/api.js", () => ({
  agentRunSSE: vi.fn(async (_key: unknown, _params: unknown, onEvent: (event: unknown) => void) => {
    onEvent({ type: "PROGRESS", data: { step: "one", critical: "kept" } });
    return { status: "done", critical: "kept", nested: { value: 1 } };
  }),
  getRun: vi.fn(async () => ({
    id: "r1",
    status: "COMPLETED",
    goal: "g",
    url: "u",
    result: { critical: "kept", nested: { value: 1 } },
  })),
}));

import { tinyfish_agent_run } from "../src/tools/agent-run.ts";
import { tinyfish_run_get } from "../src/tools/run-get.ts";

describe("run result projection", () => {
  it("projects the agent result as nested Markdown, not JSON", async () => {
    const result = await tinyfish_agent_run.execute("id", { url: "u", goal: "g" });
    const output = result.content[0].text;

    expect(output).toContain("- **critical**: kept");
    expect(output).toContain("- **nested**:\n  - **value**: 1");
    expect(output).not.toContain('{"');
  });

  it("projects the queried run result as nested Markdown, not JSON", async () => {
    const result = await tinyfish_run_get.execute("id", { runId: "r1" });
    const output = result.content[0].text;

    expect(output).toContain("- **critical**: kept");
    expect(output).toContain("- **nested**:\n  - **value**: 1");
    expect(output).not.toContain('{"');
  });
});
