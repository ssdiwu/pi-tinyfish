import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  readConfig,
  writeConfig,
  deleteConfig,
  resolveApiKey,
  maskApiKey,
  type TinyFishConfig,
} from "./config.js";

// Tools
import { tinyfish_search } from "./tools/search.js";
import { tinyfish_fetch } from "./tools/fetch.js";
import { tinyfish_agent_run } from "./tools/agent-run.js";
import { tinyfish_run_get } from "./tools/run-get.js";
import { tinyfish_run_list } from "./tools/run-list.js";
import { tinyfish_run_cancel } from "./tools/run-cancel.js";

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function extension(pi: ExtensionAPI) {
  // ===================================================================
  // Register tools
  // ===================================================================

  pi.registerTool(tinyfish_search);
  pi.registerTool(tinyfish_fetch);
  pi.registerTool(tinyfish_agent_run);
  pi.registerTool(tinyfish_run_get);
  pi.registerTool(tinyfish_run_list);
  pi.registerTool(tinyfish_run_cancel);

  // ===================================================================
  // Register commands
  // ===================================================================

  // --- /tinyfish-login ---
  pi.registerCommand("tinyfish-login", {
    description: "Configure your TinyFish API key",
    async handler(_args, ctx) {
      const existing = await readConfig();

      if (existing?.apiKey) {
        const masked = maskApiKey(existing.apiKey);
        const confirmed = await ctx.ui.confirm(
          "Replace existing key?",
          `Current key: ${masked}\nDo you want to replace it?`,
        );
        if (!confirmed) {
          ctx.ui.notify("Login cancelled.", "info");
          return;
        }
      }

      const apiKey = await ctx.ui.input(
        "TinyFish API Key",
        "Paste your API key (get one at https://agent.tinyfish.ai/api-keys)",
      );

      if (!apiKey?.trim()) {
        ctx.ui.notify("No key provided. Login cancelled.", "warning");
        return;
      }

      const config: TinyFishConfig = {
        ...existing,
        apiKey: apiKey.trim(),
      };

      await writeConfig(config);
      ctx.ui.notify(`API key saved: ${maskApiKey(apiKey.trim())}`, "success");
    },
  });

  // --- /tinyfish-status ---
  pi.registerCommand("tinyfish-status", {
    description: "Show TinyFish configuration status",
    async handler(_args, ctx) {
      const config = await readConfig();
      const apiKey = resolveApiKey(config);

      if (!apiKey) {
        ctx.ui.notify(
          "TinyFish is not configured.\nRun /tinyfish-login to set up your API key.",
          "warning",
        );
        return;
      }

      const source = config?.apiKey ? "config file" : "environment variable";
      const masked = maskApiKey(apiKey);

      ctx.ui.notify(
        [
          `TinyFish Status: ✅ Connected`,
          `Key source: ${source}`,
          `Key: ${masked}`,
          `Default location: ${config?.defaultLocation ?? "US"}`,
          `Default language: ${config?.defaultLanguage ?? "en"}`,
          `Fetch format: ${config?.defaultFetchFormat ?? "markdown"}`,
          `Browser profile: ${config?.defaultBrowserProfile ?? "lite"}`,
        ].join("\n"),
        "info",
      );
    },
  });

  // --- /tinyfish-logout ---
  pi.registerCommand("tinyfish-logout", {
    description: "Remove stored TinyFish API key",
    async handler(_args, ctx) {
      const config = await readConfig();

      if (!config?.apiKey && !process.env.TINYFISH_API_KEY) {
        ctx.ui.notify("No TinyFish API key is currently stored.", "info");
        return;
      }

      const confirmed = await ctx.ui.confirm(
        "Remove API key?",
        "This will delete your saved TinyFish API key from local storage.",
      );

      if (!confirmed) {
        ctx.ui.notify("Logout cancelled.", "info");
        return;
      }

      await deleteConfig();
      ctx.ui.notify("TinyFish API key removed.", "success");
    },
  });
}
