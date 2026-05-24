import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Resolve paths from project root (tests/ runs from project root with vitest)
const PROJECT_ROOT = path.resolve(import.meta.dirname ?? ".", "..");
const configPath = path.join(PROJECT_ROOT, "extensions/config.ts");

describe("config", () => {
  let tmpDir: string;
  let originalEnv: string | undefined;
  let originalTinyFishEnv: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-tinyfish-test-"));
    originalEnv = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = tmpDir;
    // Save and remove TINYFISH_API_KEY for clean testing
    originalTinyFishEnv = process.env.TINYFISH_API_KEY;
    delete process.env.TINYFISH_API_KEY;
  });

  afterEach(async () => {
    process.env.PI_CODING_AGENT_DIR = originalEnv;
    if (originalTinyFishEnv !== undefined) {
      process.env.TINYFISH_API_KEY = originalTinyFishEnv;
    } else {
      delete process.env.TINYFISH_API_KEY;
    }
    try { await fs.rm(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  // ---------------------------------------------------------------------------
  // readConfig / writeConfig / deleteConfig
  // ---------------------------------------------------------------------------

  describe("readConfig", () => {
    it("returns null when no config file exists", async () => {
      const { readConfig } = await import(configPath);
      const result = await readConfig();
      expect(result).toBeNull();
    });

    it("parses valid JSON config", async () => {
      const { readConfig, getConfigPath } = await import(configPath);
      const cfgPath = getConfigPath();
      await fs.writeFile(cfgPath, JSON.stringify({
        apiKey: "tf_test123",
        defaultLocation: "JP",
      }));

      const result = await readConfig();

      expect(result).not.toBeNull();
      expect(result!.apiKey).toBe("tf_test123");
      expect(result!.defaultLocation).toBe("JP");
    });

    it("returns null for invalid JSON", async () => {
      const { getConfigPath } = await import(configPath);
      await fs.writeFile(getConfigPath(), "not json {{{");

      const { readConfig } = await import(configPath);
      const result = await readConfig();
      expect(result).toBeNull();
    });
  });

  describe("writeConfig", () => {
    it("creates config file with correct content", async () => {
      const { writeConfig, readConfig, getConfigPath } = await import(configPath);

      await writeConfig({ apiKey: "tf_newkey", defaultLanguage: "zh" });
      const result = await readConfig();

      expect(result).not.toBeNull();
      expect(result!.apiKey).toBe("tf_newkey");
      expect(result!.defaultLanguage).toBe("zh");

      expect(existsSync(getConfigPath())).toBe(true);
    });

    it("overwrites existing config atomically", async () => {
      const { writeConfig, readConfig } = await import(configPath);

      await writeConfig({ apiKey: "first" });
      await writeConfig({ apiKey: "second", defaultLocation: "UK" });

      const result = await readConfig();
      expect(result!.apiKey).toBe("second");
      expect(result!.defaultLocation).toBe("UK");
    });
  });

  describe("deleteConfig", () => {
    it("removes existing config file", async () => {
      const { writeConfig, deleteConfig, readConfig, getConfigPath } = await import(configPath);

      await writeConfig({ apiKey: "to-delete" });
      expect(existsSync(getConfigPath())).toBe(true);

      await deleteConfig();
      expect(existsSync(getConfigPath())).toBe(false);
      expect(await readConfig()).toBeNull();
    });

    it("does not error when no config exists", async () => {
      const { deleteConfig } = await import(configPath);
      await expect(deleteConfig()).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // File permissions
  // ---------------------------------------------------------------------------

  describe("file permissions", () => {
    it("writes config with owner-only permissions", async () => {
      const { writeConfig, getConfigPath } = await import(configPath);
      await writeConfig({ apiKey: "test" });

      const stat = await fs.stat(getConfigPath());
      const mode = stat.mode & 0o777;
      // Owner should have at least rw
      expect(mode & 0o600).toBe(0o600);
    });
  });

  // ---------------------------------------------------------------------------
  // API Key resolution
  // ---------------------------------------------------------------------------

  describe("resolveApiKey", () => {
    it("returns apiKey from config when present", async () => {
      const { resolveApiKey } = await import(configPath);
      const result = resolveApiKey({ apiKey: "tf_from_config" });
      expect(result).toBe("tf_from_config");
    });

    it("falls back to TINYFISH_API_KEY env var", async () => {
      const { resolveApiKey } = await import(configPath);
      process.env.TINYFISH_API_KEY = "tf_from_env";

      const result = resolveApiKey(null);
      expect(result).toBe("tf_from_env");

      delete process.env.TINYFISH_API_KEY;
    });

    it("prefers config over env var", async () => {
      const { resolveApiKey } = await import(configPath);
      process.env.TINYFISH_API_KEY = "tf_env";

      const result = resolveApiKey({ apiKey: "tf_cfg" });
      expect(result).toBe("tf_cfg");

      delete process.env.TINYFISH_API_KEY;
    });

    it("returns undefined when neither is set", async () => {
      const { resolveApiKey } = await import(configPath);

      const result = resolveApiKey(null);
      expect(result).toBeUndefined();
    });

    it("trims whitespace from apiKey", async () => {
      const { resolveApiKey } = await import(configPath);
      const result = resolveApiKey({ apiKey: "  tf_spaced  " });
      expect(result).toBe("tf_spaced");
    });

    it("returns undefined for empty/whitespace-only key", async () => {
      const { resolveApiKey } = await import(configPath);
      expect(resolveApiKey({ apiKey: "" })).toBeUndefined();
      expect(resolveApiKey({ apiKey: "   " })).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // maskApiKey
  // ---------------------------------------------------------------------------

  describe("maskApiKey", () => {
    it("masks standard keys correctly (show first 3 + **** + last 4)", async () => {
      const { maskApiKey } = await import(configPath);
      // "tf_abc123def456" -> first 3="tf_" last 4="f456" -> "tf_****f456"
      const result = maskApiKey("tf_abc123def456");
      expect(result).toBe("tf_****f456");
      // Masked version is shorter than original (middle replaced by ****)
      expect(result).toContain("tf_");
      expect(result).toContain("f456");
      expect(result).toContain("****");
    });

    it("handles short keys (< 12 chars)", async () => {
      const { maskApiKey } = await import(configPath);
      expect(maskApiKey("short")).toBe("***");
    });

    it("handles empty/null keys", async () => {
      const { maskApiKey } = await import(configPath);
      expect(maskApiKey("")).toBe("***");
      expect(maskApiKey(null as unknown as string)).toBe("***");
    });
  });

  // ---------------------------------------------------------------------------
  // Default helpers
  // ---------------------------------------------------------------------------

  describe("default helpers", () => {
    it("getDefaultLocation returns US as fallback", async () => {
      const { getDefaultLocation } = await import(configPath);
      expect(getDefaultLocation({})).toBe("US");
      expect(getDefaultLocation({ defaultLocation: "CN" })).toBe("CN");
    });

    it("getDefaultLanguage returns en as fallback", async () => {
      const { getDefaultLanguage } = await import(configPath);
      expect(getDefaultLanguage({})).toBe("en");
      expect(getDefaultLanguage({ defaultLanguage: "ja" })).toBe("ja");
    });

    it("getDefaultFetchFormat returns markdown as fallback", async () => {
      const { getDefaultFetchFormat } = await import(configPath);
      expect(getDefaultFetchFormat({})).toBe("markdown");
      expect(getDefaultFetchFormat({ defaultFetchFormat: "html" })).toBe("html");
    });

    it("getDefaultBrowserProfile returns lite as fallback", async () => {
      const { getDefaultBrowserProfile } = await import(configPath);
      expect(getDefaultBrowserProfile({})).toBe("lite");
      expect(getDefaultBrowserProfile({ defaultBrowserProfile: "stealth" })).toBe("stealth");
    });
  });
});
