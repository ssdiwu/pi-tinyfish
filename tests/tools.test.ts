import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? ".", "..");

// Tool file paths (absolute)
const toolImports = {
  search: path.join(PROJECT_ROOT, "extensions", "tools", "search.ts"),
  fetch: path.join(PROJECT_ROOT, "extensions", "tools", "fetch.ts"),
  "agent-run": path.join(PROJECT_ROOT, "extensions", "tools", "agent-run.ts"),
  "run-get": path.join(PROJECT_ROOT, "extensions", "tools", "run-get.ts"),
  "run-list": path.join(PROJECT_ROOT, "extensions", "tools", "run-list.ts"),
  "run-cancel": path.join(PROJECT_ROOT, "extensions", "tools", "run-cancel.ts"),
} as const;

type ToolShape = {
  name: string;
  label: string;
  description: string;
  parameters: { properties: Record<string, unknown> };
  execute: (...args: unknown[]) => Promise<unknown>;
};

describe("tools — registration shape validation", () => {
  let tmpDir: string;
  let originalEnvDir: string | undefined;
  let originalApiKeyEnv: string | undefined;

  // Isolate from real config file and env vars
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-tinyfish-tools-test-"));
    originalEnvDir = process.env.PI_CODING_AGENT_DIR;
    originalApiKeyEnv = process.env.TINYFISH_API_KEY;
    process.env.PI_CODING_AGENT_DIR = tmpDir;
    delete process.env.TINYFISH_API_KEY;
  });

  afterEach(() => {
    process.env.PI_CODING_AGENT_DIR = originalEnvDir;
    if (originalApiKeyEnv !== undefined) {
      process.env.TINYFISH_API_KEY = originalApiKeyEnv;
    } else {
      delete process.env.TINYFISH_API_KEY;
    }
    // Clean up temp dir
    fs.rm(tmpDir, { recursive: true }).catch(() => {});
  });

  // ---------------------------------------------------------------------------
  // Each tool must have required ToolDefinition fields
  // ---------------------------------------------------------------------------

  for (const [name, toolPath] of Object.entries(toolImports)) {
    describe(name, () => {
      let tool: ToolShape;

      beforeAll(async () => {
        const mod = await import(toolPath);
        const exportName = `tinyfish_${name.replace("-", "_")}`;
        tool = mod[exportName];
      });

      it("exports a named tool object", () => {
        expect(tool).toBeDefined();
        expect(typeof tool).toBe("object");
      });

      it("has a non-empty string name", () => {
        expect(typeof tool.name).toBe("string");
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.name).toMatch(/^tinyfish_/);
      });

      it("has a non-empty string label", () => {
        expect(typeof tool.label).toBe("string");
        expect(tool.label.length).toBeGreaterThan(0);
      });

      it("has a non-empty string description", () => {
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
      });

      it("has a TypeBox parameters schema with properties", () => {
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.properties).toBeDefined();
        expect(typeof tool.parameters.properties).toBe("object");
        expect(Object.keys(tool.parameters.properties).length).toBeGreaterThan(0);
      });

      it("has promptSnippet for system prompt visibility", () => {
        expect(typeof tool.promptSnippet).toBe("string");
        expect(tool.promptSnippet.length).toBeGreaterThan(0);
      });

      it("has promptGuidelines array with tool-specific instructions", () => {
        expect(Array.isArray(tool.promptGuidelines)).toBe(true);
        expect(tool.promptGuidelines.length).toBeGreaterThan(0);
        for (const guideline of tool.promptGuidelines) {
          expect(typeof guideline).toBe("string");
          expect(guideline.length).toBeGreaterThan(10);
        }
      });

      it("has an execute function", () => {
        expect(typeof tool.execute).toBe("function");
      });

      it("execute returns a Promise (async)", async () => {
        // No API key in isolated env → should return error result quickly
        const resultPromise = tool.execute("test-call-id", {} as Record<string, unknown>);
        expect(resultPromise).toBeInstanceOf(Promise);

        const result = await resultPromise;
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("details");
        expect(Array.isArray(result.content)).toBe(true);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Parameter-specific validations
  // ---------------------------------------------------------------------------

  describe("search parameters", () => {
    it("requires 'query' as a string parameter", async () => {
      const mod = await import(toolImports.search);
      const queryProp = mod.tinyfish_search.parameters.properties.query;
      expect(queryProp).toBeDefined();
      expect(typeof queryProp).toBe("object");
    });
  });

  describe("fetch parameters", () => {
    it("has url or urls parameter", async () => {
      const mod = await import(toolImports.fetch);
      const props = Object.keys(mod.tinyfish_fetch.parameters.properties);
      const hasUrlParam = props.includes("url") || props.includes("urls");
      expect(hasUrlParam).toBe(true);
    });
  });

  describe("agent-run parameters", () => {
    it("requires url and goal", async () => {
      const mod = await import(toolImports["agent-run"]);
      const props = Object.keys(mod.tinyfish_agent_run.parameters.properties);
      expect(props).toContain("url");
      expect(props).toContain("goal");
    });

    it("has sequential execution mode", async () => {
      const mod = await import(toolImports["agent-run"]);
      expect(mod.tinyfish_agent_run.executionMode).toBe("sequential");
    });
  });

  describe("run management tools require runId", () => {
    it("run-get requires runId", async () => {
      const mod = await import(toolImports["run-get"]);
      const props = Object.keys(mod.tinyfish_run_get.parameters.properties);
      expect(props).toContain("runId");
    });

    it("run-cancel requires runId", async () => {
      const mod = await import(toolImports["run-cancel"]);
      const props = Object.keys(mod.tinyfish_run_cancel.parameters.properties);
      expect(props).toContain("runId");
    });
  });

  // ---------------------------------------------------------------------------
  // No API key behavior
  // ---------------------------------------------------------------------------

  describe("no API key configured", () => {
    it("all tools return helpful error message in content", async () => {
      for (const [name, toolPath] of Object.entries(toolImports)) {
        const mod = await import(toolPath);
        const exportName = `tinyfish_${name.replace("-", "_")}`;
        const tool = mod[exportName];

        const result = await tool.execute("test-id", {} as Record<string, unknown>);
        const textContent = result.content
          .filter((c: { type: string; text?: string }) => c.type === "text")
          .map((c: { text?: string }) => c.text)
          .join("\n");

        expect(textContent).toContain("API key");
        expect(textContent).toContain("/tinyfish-login");
      }
    });
  });
});
