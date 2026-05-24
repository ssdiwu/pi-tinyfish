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

## Design

See [ISSUE-1.md](./ISSUE-1.md) for the complete design document.
