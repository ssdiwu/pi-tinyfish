# extensions/

Pi extension entry point and shared code for pi-tinyfish.

## Files

| File | Role |
|------|------|
| `index.ts` | Default-exported factory `(pi: ExtensionAPI) => void` — registers all six tools and three slash commands (`/tinyfish-login`, `/tinyfish-status`, `/tinyfish-logout`) |
| `api.ts` | TinyFish REST + SSE client (`search`, `fetchUrls`, `agentRunSSE`, `getRun`, `listRuns`, `cancelRun`) and shared error type `TinyFishApiError` |
| `config.ts` | Reads/writes `~/.pi/agent/pi-tinyfish.json` (apiKey, default location/language/fetchFormat/browserProfile). Resolves the active key from config → `TINYFISH_API_KEY` env |
| `format.ts` | Pure text formatters for search/fetch results and SSE event lines, plus `truncateOutput` wrapper around pi's `truncateHead` |
| `render.ts` | `renderResult` helper shared by all six tools — default compact view, `Ctrl+O` (`app.tools.expand`) expands full markdown |
| `tools/` | One file per registered tool — see [tools/README.md](./tools/README.md) |

## Conventions

- **All tool `execute()` returns are synchronous** — the LLM waits for the full result. No background runs, no `pi.sendMessage` injection, no `ctx.ui.notify` from inside a tool. Notifications only fire from command handlers.
- **API key resolution** is centralized in `resolveApiKey(config)` from `config.ts`. Every tool reads `readConfig()` at the top of `execute()` and returns the friendly `/tinyfish-login` hint when missing — never throws.
- **Errors are returned, not thrown** for missing config / missing params (those set `details: { error: ... }`). Network and API errors **are thrown** so pi marks the result `isError: true` and the LLM sees the failure.
- **TypeBox schemas** for parameters use `Type.Object` / `Type.String` / `Type.Union([Type.Literal, ...])` with explicit `description` strings — those descriptions flow into the system prompt.
