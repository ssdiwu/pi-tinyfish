import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getAgentDir(): string {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  if (!configured) return join(homedir(), ".pi", "agent");
  if (configured === "~") return homedir();
  if (configured.startsWith("~/")) return resolve(homedir(), configured.slice(2));
  return resolve(configured);
}

export function getConfigPath(): string {
  return join(getAgentDir(), "pi-tinyfish.json");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TinyFishConfig {
  apiKey?: string;
  defaultLocation?: string;
  defaultLanguage?: string;
  defaultFetchFormat?: "markdown" | "html" | "json";
  defaultBrowserProfile?: "lite" | "stealth";
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { mode: DIR_MODE, recursive: true });
  }
}

/**
 * Atomic write: write to temp file → rename → set permissions.
 */
async function atomicWrite(filePath: string, data: string): Promise<void> {
  await ensureDir(resolve(filePath, ".."));
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tmp, data, { encoding: "utf-8", mode: FILE_MODE });
    await rename(tmp, filePath);
  } catch (e) {
    try { await unlink(tmp); } catch { /* ignore */ }
    throw e;
  }
}

/**
 * Read config from disk. Returns null if not found or invalid JSON.
 */
export async function readConfig(): Promise<TinyFishConfig | null> {
  const path = getConfigPath();
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as TinyFishConfig;
  } catch {
    return null;
  }
}

/**
 * Write config atomically.
 */
export async function writeConfig(cfg: TinyFishConfig): Promise<void> {
  await atomicWrite(getConfigPath(), JSON.stringify(cfg, null, 2) + "\n");
}

/**
 * Delete config file entirely.
 */
export async function deleteConfig(): Promise<void> {
  const path = getConfigPath();
  if (!existsSync(path)) return;
  await unlink(path);
}

// ---------------------------------------------------------------------------
// API Key resolution
// ---------------------------------------------------------------------------

/**
 * Resolve API key in priority order:
 *   1. config.json apiKey field
 *   2. TINYFISH_API_KEY env var
 *   3. undefined → caller should prompt login
 */
export function resolveApiKey(config: TinyFishConfig | null): string | undefined {
  if (config?.apiKey?.trim()) return config.apiKey.trim();
  const envKey = process.env.TINYFISH_API_KEY?.trim();
  if (envKey) return envKey;
  return undefined;
}

/**
 * Mask an API key for display: tf_****abcd
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return "***";
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Locale detection
// ---------------------------------------------------------------------------

/**
 * Detect user locale from OS environment variables.
 * Returns a BCP 47-like tag (e.g. "zh-CN", "ja", "ko") or undefined.
 *
 * Priority: PI_LOCALE > LC_ALL > LANG
 */
export function detectLocale(): string | undefined {
  const candidates = [
    process.env.PI_LOCALE,
    process.env.LC_ALL,
    process.env.LANG,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const s = raw.trim();
    if (!s) continue;
    // Strip encoding suffix: "zh_CN.UTF-8" -> "zh_CN" -> "zh-CN"
    const base = s.split(".")[0]!.replace(/_/g, "-");
    if (base) return base;
  }
  return undefined;
}

/**
 * Map a locale tag to TinyFish API location + language codes.
 * Returns { location, language } or null if unknown.
 */
export function localeToLocationLanguage(
  locale?: string,
): { location: string; language: string } | null {
  if (!locale) return null;

  const lang = locale.split("-")[0]?.toLowerCase() ?? "";
  const region = locale.split("-")[1]?.toUpperCase() ?? "";

  switch (lang) {
    case "zh": {
      // Simplified vs Traditional by region
      if (region === "TW" || region === "HK") {
        return { location: "TW", language: "zh-TW" };
      }
      return { location: "CN", language: "zh" };
    }
    case "ja":
      return { location: "JP", language: "ja" };
    case "ko":
      return { location: "KR", language: "ko" };
    case "de":
      return { location: "DE", language: "de" };
    case "fr":
      return { location: "FR", language: "fr" };
    case "es": {
      // Default to Spain; Latin America variants could use region
      if (region === "MX" || region === "AR" || region === "CO" || region === "CL" || region === "PE") {
        return { location: region, language: "es" };
      }
      return { location: "ES", language: "es" };
    }
    case "pt": {
      if (region === "BR") return { location: "BR", language: "pt-BR" };
      return { location: "PT", language: "pt" };
    }
    case "ru":
      return { location: "RU", language: "ru" };
    case "ar":
      return { location: "SA", language: "ar" };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Defaults helpers
// ---------------------------------------------------------------------------

export function getDefaultLocation(config?: TinyFishConfig | null): string {
  if (config?.defaultLocation) return config.defaultLocation;
  const mapped = localeToLocationLanguage(detectLocale());
  return mapped?.location ?? "US";
}

export function getDefaultLanguage(config?: TinyFishConfig | null): string {
  if (config?.defaultLanguage) return config.defaultLanguage;
  const mapped = localeToLocationLanguage(detectLocale());
  return mapped?.language ?? "en";
}

export function getDefaultFetchFormat(config?: TinyFishConfig | null): string {
  return config?.defaultFetchFormat ?? "markdown";
}

export function getDefaultBrowserProfile(config?: TinyFishConfig | null): string {
  return config?.defaultBrowserProfile ?? "lite";
}
