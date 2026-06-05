# skills/tinyfish/

Agent-facing usage guide for the TinyFish tools. Loaded by pi when the agent needs web search, page fetching, or goal-driven browser automation.

## Files

| File | Role |
|------|------|
| `SKILL.md` | The skill manifest. `name`, `description` (frontmatter) + usage guidance for the agent — when to pick which tool, how to write good `tinyfish_agent_run` goals, API key setup. |

## Editing the skill

- The `description` in the frontmatter is what the agent sees when deciding whether to load the skill. Keep it specific and avoid trigger-word stuffing.
- The body of `SKILL.md` is shown to the agent only after it decides to load. Put concrete examples (good goals, good/bad use cases) there.
- This file is **agent-facing**, not user-facing. Don't document the three-layer result model here — that's an implementation detail the agent doesn't need. Point it at the right tool instead.
