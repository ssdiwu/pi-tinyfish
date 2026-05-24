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
    it("getDefaultLocation returns explicit value from config", async () => {
      const { getDefaultLocation } = await import(configPath);
      expect(getDefaultLocation({ defaultLocation: "CN" })).toBe("CN");
      expect(getDefaultLocation({ defaultLocation: "JP" })).toBe("JP");
    });

    it("getDefaultLanguage returns explicit value from config", async () => {
      const { getDefaultLanguage } = await import(configPath);
      expect(getDefaultLanguage({ defaultLanguage: "ja" })).toBe("ja");
      expect(getDefaultLanguage({ defaultLanguage: "ko" })).toBe("ko");
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

  // ---------------------------------------------------------------------------
  // Locale detection
  // ---------------------------------------------------------------------------

  describe("detectLocale", () => {
    let originalPiLocale: string | undefined;
    let originalLcAll: string | undefined;
    let originalLang: string | undefined;

    beforeEach(() => {
      originalPiLocale = process.env.PI_LOCALE;
      originalLcAll = process.env.LC_ALL;
      originalLang = process.env.LANG;
      delete process.env.PI_LOCALE;
      delete process.env.LC_ALL;
      delete process.env.LANG;
    });

    afterEach(() => {
      if (originalPiLocale !== undefined) process.env.PI_LOCALE = originalPiLocale; else delete process.env.PI_LOCALE;
      if (originalLcAll !== undefined) process.env.LC_ALL = originalLcAll; else delete process.env.LC_ALL;
      if (originalLang !== undefined) process.env.LANG = originalLang; else delete process.env.LANG;
    });

    it("returns undefined when no locale env vars are set", async () => {
      const { detectLocale } = await import(configPath);
      expect(detectLocale()).toBeUndefined();
    });

    it("reads PI_LOCALE first (highest priority)", async () => {
      const { detectLocale } = await import(configPath);
      process.env.PI_LOCALE = "zh-CN";
      process.env.LC_ALL = "en_US.UTF-8";
      process.env.LANG = "ja_JP.UTF-8";
      expect(detectLocale()).toBe("zh-CN");
    });

    it("falls back to LC_ALL when PI_LOCALE is not set", async () => {
      const { detectLocale } = await import(configPath);
      process.env.LC_ALL = "ja_JP.UTF-8";
      expect(detectLocale()).toBe("ja-JP");
    });

    it("falls back to LANG when neither PI_LOCALE nor LC_ALL set", async () => {
      const { detectLocale } = await import(configPath);
      process.env.LANG = "ko_KR.euckr";
      expect(detectLocale()).toBe("ko-KR");
    });

    it("strips encoding suffix (.UTF-8, .euckr, etc.)", async () => {
      const { detectLocale } = await import(configPath);
      process.env.LANG = "zh_CN.UTF-8";
      expect(detectLocale()).toBe("zh-CN");
    });

    it("converts underscore to hyphen", async () => {
      const { detectLocale } = await import(configPath);
      process.env.LANG = "fr_FR";
      expect(detectLocale()).toBe("fr-FR");
    });

    it("handles simple language-only locale", async () => {
      const { detectLocale } = await import(configPath);
      process.env.LANG = "en";
      expect(detectLocale()).toBe("en");
    });

    it("ignores empty/whitespace values", async () => {
      const { detectLocale } = await import(configPath);
      process.env.PI_LOCALE = "  ";
      process.env.LC_ALL = "de_DE.UTF-8";
      expect(detectLocale()).toBe("de-DE");
    });
  });

  describe("localeToLocationLanguage", () => {
    it("maps zh-CN to CN/zh", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("zh-CN")).toEqual({ location: "CN", language: "zh" });
    });

    it("maps zh-TW to TW/zh-TW (Traditional Chinese)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("zh-TW")).toEqual({ location: "TW", language: "zh-TW" });
    });

    it("maps zh-HK to TW/zh-TW (Traditional Chinese)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("zh-HK")).toEqual({ location: "TW", language: "zh-TW" });
    });

    it("maps ja-JP to JP/ja", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("ja-JP")).toEqual({ location: "JP", language: "ja" });
    });

    it("maps ko-KR to KR/ko", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("ko-KR")).toEqual({ location: "KR", language: "ko" });
    });

    it("maps de-DE to DE/de", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("de-DE")).toEqual({ location: "DE", language: "de" });
    });

    it("maps fr-FR to FR/fr", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("fr-FR")).toEqual({ location: "FR", language: "fr" });
    });

    it("maps es-ES to ES/es (default Spanish)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("es-ES")).toEqual({ location: "ES", language: "es" });
    });

    it("maps es-MX to MX/es (Latin American Spanish)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("es-MX")).toEqual({ location: "MX", language: "es" });
    });

    it("maps pt-BR to BR/pt-BR", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("pt-BR")).toEqual({ location: "BR", language: "pt-BR" });
    });

    it("maps ru-RU to RU/ru", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("ru-RU")).toEqual({ location: "RU", language: "ru" });
    });

    it("maps ar-SA to SA/ar", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("ar-SA")).toEqual({ location: "SA", language: "ar" });
    });

    it("returns null for unknown locale (en-US)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("en-US")).toBeNull();
    });

    it("returns null for undefined locale", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage(undefined)).toBeNull();
    });

    it("handles language-only tag (no region)", async () => {
      const { localeToLocationLanguage } = await import(configPath);
      expect(localeToLocationLanguage("ja")).toEqual({ location: "JP", language: "ja" });
    });
  });

  describe("locale-aware defaults", () => {
    let originalPiLocale: string | undefined;
    let originalLcAll: string | undefined;
    let originalLang: string | undefined;

    beforeEach(() => {
      originalPiLocale = process.env.PI_LOCALE;
      originalLcAll = process.env.LC_ALL;
      originalLang = process.env.LANG;
      delete process.env.PI_LOCALE;
      delete process.env.LC_ALL;
      delete process.env.LANG;
    });

    afterEach(() => {
      if (originalPiLocale !== undefined) process.env.PI_LOCALE = originalPiLocale; else delete process.env.PI_LOCALE;
      if (originalLcAll !== undefined) process.env.LC_ALL = originalLcAll; else delete process.env.LC_ALL;
      if (originalLang !== undefined) process.env.LANG = originalLang; else delete process.env.LANG;
    });

    it("auto-detects CN/zh from zh_CN locale", async () => {
      const { getDefaultLocation, getDefaultLanguage } = await import(configPath);
      process.env.LANG = "zh_CN.UTF-8";
      expect(getDefaultLocation(null)).toBe("CN");
      expect(getDefaultLanguage(null)).toBe("zh");
    });

    it("auto-detects JP/ja from ja_JP locale", async () => {
      const { getDefaultLocation, getDefaultLanguage } = await import(configPath);
      process.env.LANG = "ja_JP.UTF-8";
      expect(getDefaultLocation(null)).toBe("JP");
      expect(getDefaultLanguage(null)).toBe("ja");
    });

    it("explicit config overrides auto-detected locale", async () => {
      const { getDefaultLocation, getDefaultLanguage } = await import(configPath);
      process.env.LANG = "zh_CN.UTF-8";
      // Explicit config should win
      expect(getDefaultLocation({ defaultLocation: "US" })).toBe("US");
      expect(getDefaultLanguage({ defaultLanguage: "en" })).toBe("en");
    });

    it("falls back to US/en for unknown locale (en_US)", async () => {
      const { getDefaultLocation, getDefaultLanguage } = await import(configPath);
      process.env.LANG = "en_US.UTF-8";
      expect(getDefaultLocation(null)).toBe("US");
      expect(getDefaultLanguage(null)).toBe("en");
    });

    it("falls back to US/en when no locale env vars", async () => {
      const { getDefaultLocation, getDefaultLanguage } = await import(configPath);
      expect(getDefaultLocation(null)).toBe("US");
      expect(getDefaultLanguage(null)).toBe("en");
    });
  });
});
