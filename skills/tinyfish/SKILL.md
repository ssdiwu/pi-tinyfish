# TinyFish

Use TinyFish tools when the user needs:

- **Current web search results** — use `tinyfish_search`
- **Rendered page content from known URLs** — use `tinyfish_fetch`
- **Goal-driven website automation** — use `tinyfish_agent_run` (extract data, fill forms, navigate multi-step workflows)
- **Check automation run status** — use `tinyfish_run_get`, `tinyfish_run_list`, `tinyfish_run_cancel`

## When to use which tool

1. **Need to discover URLs or find information?** → `tinyfish_search` first
2. **Already have URLs and need content?** → `tinyfish_fetch`
3. **Need to automate a multi-step task on a real website?** → `tinyfish_agent_run`
4. **Need to check on a running or past automation?** → `tinyfish_run_get` / `tinyfish_run_list`

## Writing good goals for tinyfish_agent_run

Goals should be explicit and structured:

- **What to do** (navigate, click, extract, fill)
- **What to extract** (field names, format: JSON / text / list)
- **Constraints** (timeout, stop conditions, pages to avoid)
- **Expected output format**

### Good goal examples

```
"Go to the pricing page, extract all plan names, prices, and features. Return as JSON with fields: name, price, features[]."
"Log in with the saved credentials, go to dashboard, list the last 5 orders with order IDs and totals."
"Search for 'AI browser automation', collect the top 10 results with title, URL, and snippet."
```

### Tips

- Be specific about output format when you need structured data
- Mention `Return as JSON` when you want parseable results
- Use `browser_profile: "stealth"` for sites with bot detection
- Set reasonable timeouts via `maxBytes` for large extraction tasks

## API key

The user does NOT need to set environment variables. The extension manages its own config at `~/.pi/agent/pi-tinyfish.json`. If unconfigured, suggest `/tinyfish-login`.
