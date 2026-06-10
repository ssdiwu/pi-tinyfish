# tools/

One file per registered tool. Each file exports a single `tinyfish_*` object with the standard Pi tool shape.

## Required fields on every tool

```ts
export const tinyfish_xxx = {
  name: "tinyfish_xxx",                  // registered tool name (LLM calls this)
  label: "Human Label",                  // header shown in TUI
  description: "...",                    // multi-line, shown in system prompt
  promptSnippet: "...",                  // one-liner in "Available tools" section
  promptGuidelines: [                    // bullets appended to "Guidelines" section
    "Use tinyfish_xxx when ...",
    "Each guideline must name the tool explicitly.",
  ],
  parameters: Type.Object({...}),        // TypeBox schema with descriptions

  async execute(_id, params, signal, onUpdate?, ctx?) { ... },
};
```

## Result contract: three-layer information model

Every tool returns the same shape. The LLM, the renderer, and the user each see a different slice.

| Field | Goes to | What goes here |
|-------|---------|----------------|
| `content: [{ type: "text", text: string }]` | LLM (next turn) | **Full output** — markdown-formatted. Never truncated silently. If the caller passes `maxBytes`, `truncateOutput` trims the head and the LLM sees the truncation marker. |
| `details: Record<string, unknown>` | `renderResult` + session state | **Structured summary** — `status`, `count`, `urls`, `runId`, `eventCount`, etc. Compact, machine-readable. |
| `renderResult(result, { expanded, isPartial }, theme, context)` | Human in TUI | **Visual** — `isPartial: true` shows a one-line "Running…" placeholder; `expanded: false` shows a one-line summary; `expanded: true` (after `Ctrl+O`) renders the full markdown via `Markdown` component. |

The shared `renderCollapsibleMarkdown` helper in `../render.ts` implements the default contract — most tools just pass a one-line summary string.

## Per-tool summary strings (default view)

| Tool | Summary when collapsed |
|------|------------------------|
| `tinyfish_search` | `🔍 Found 12 results` (count from `details.resultCount`) |
| `tinyfish_fetch` | `📄 Fetched 3 page(s)` (count from `details.resultCount`) |
| `tinyfish_agent_run` | `✅ Agent completed (87 events)` (event count from `details.eventCount`); `isPartial` shows `⏳ Running…` |
| `tinyfish_run_get` | `📋 Run abc123 — COMPLETED` (status from `details.status`) |
| `tinyfish_run_list` | `📜 20 runs` (count from `details.count`) |
| `tinyfish_run_cancel` | `🚫 Run abc123 cancelled` (no expand needed — terminal state) |

## When NOT to use `renderResult`

- Don't override `renderResult` if a one-line `Text` is enough — use the shared helper, don't reinvent the expand toggle.
- Don't put **full content in `details`**. `details` is for summaries; `content` is for the full data. Mixing them defeats the point of the three-layer model.
- Don't suppress the expand hint on tools that return more than ~200 bytes of `content` — users always need a way to see the full thing.
