# pi-tinyfish

TinyFish Web Agent tools for **pi** — search, fetch, and goal-driven browser automation.

## Tools

| Tool | API | Description |
|------|-----|-------------|
| `tinyfish_search` | Search API | Web search with ranked results, snippets, and URLs |
| `tinyfish_fetch` | Fetch API | Render URLs and extract clean content (markdown/html/json) |
| `tinyfish_agent_run` | Agent API (SSE) | Goal-driven browser automation with real-time progress |
| `tinyfish_run_get` | Runs API | Query a specific automation run's status and result |
| `tinyfish_run_list` | Runs API | List/search historical automation runs |
| `tinyfish_run_cancel` | Runs API | Cancel an in-progress run |

## Setup

1. Install:

```bash
pi install npm:pi-tinyfish
# or local:
pi install ./pi-tinyfish
```

2. Configure your TinyFish API key (get one from [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)):

```
/tinyfish-login
```

3. Check status:

```
/tinyfish-status
```

## Configuration

API key and defaults are stored in `~/.pi/agent/pi-tinyfish.json` (permissions `0600`). No global environment variable required.

```json
{
  "apiKey": "tf_xxx",
  "defaultLocation": "US",
  "defaultLanguage": "en",
  "defaultFetchFormat": "markdown",
  "defaultBrowserProfile": "lite"
}
```

Fallback: `TINYFISH_API_KEY` env var for CI / debugging.

## Commands

| Command | Description |
|---------|-------------|
| `/tinyfish-login` | Enter your TinyFish API key interactively |
| `/tinyfish-status` | Show configuration status (key never exposed) |
| `/tinyfish-logout` | Remove stored API key |

## Development

```bash
npm install          # peer deps
npm test             # vitest
pi -e .             # load extension for testing
```

## Tool Result UI

Tool results follow a three-layer information model so the LLM gets the full picture while the user only sees what they need on screen:

| Layer | Field | Audience | Purpose |
|-------|-------|----------|---------|
| Full data | `content` | LLM | Complete output enters the next conversation turn — never truncated for the LLM |
| Structured | `details` | Renderer & state | Compact summary (status, count, urls) used by `renderResult` and persisted in session state |
| Visual | `renderResult` | Human | Default view is a one-line summary; press `Ctrl+O` (`app.tools.expand`) to expand the full markdown |

This applies to all six tools. See [src/tools/README.md](./src/tools/README.md) for the per-tool contract.

## Directory layout

```
index.ts               # Standard package entry — re-exports src/index.ts
src/
  index.ts          # Extension implementation — registers tools and /commands
  api.ts            # TinyFish REST/SSE client
  config.ts         # ~/.pi/agent/pi-tinyfish.json read/write
  format.ts         # Output text formatters
  render.ts         # Shared renderResult helpers (collapsible markdown)
  tools/
    search.ts       # tinyfish_search
    fetch.ts        # tinyfish_fetch
    agent-run.ts    # tinyfish_agent_run
    run-get.ts      # tinyfish_run_get
    run-list.ts     # tinyfish_run_list
    run-cancel.ts   # tinyfish_run_cancel
skills/
  tinyfish/
    SKILL.md        # Agent-facing usage guide
```

## Design notes

- All six tools are **synchronous** — `execute()` awaits the full response. No background runs, no `pi.sendMessage` injection. The LLM sees results in the natural tool-call return.
- `details` is the source of truth for collapsible summaries; `content` is the source of truth for LLM context. They are intentionally not derived from each other.
- `truncateOutput` (format.ts) only trims `content` when the caller passes `maxBytes`; it never silently strips data the LLM needs.
