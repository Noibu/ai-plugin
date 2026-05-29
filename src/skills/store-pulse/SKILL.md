---
name: store-pulse
description: A live, at-a-glance overview of your store's health — surfaced as a Cowork dashboard artifact tracking your key ecommerce metrics. Use to check on how the overall store is doing, set up or customize what the dashboard tracks, or schedule a recurring summary.
---

# Store Pulse

A daily-driver ecommerce dashboard. The artifact (`id: store-pulse-dashboard`) is the source of truth — config lives inside its HTML as `SP_CONFIG`.

## Routing

Call `mcp__cowork__list_artifacts` first. If `store-pulse-dashboard` exists, read `SP_CONFIG.domain.name` out of its HTML before deciding.

| Artifact? | User intent | Flow |
|---|---|---|
| Yes | Open-ended ("show me my dashboard") | **Open** |
| Yes | Edit request ("change domain", "add a block", "update schedule") | **Reconfigure** |
| Yes | Names a *different* domain than `SP_CONFIG.domain.name` | **Reconfigure → domain change** |
| No | Any | **Setup** |

When intent is ambiguous and an artifact exists, default to **Open** — don't silently overwrite a working setup. In particular, if the user names a new domain while an artifact for a different one exists, route to domain change so the swap is explicit; never silently use the wrong store's data.

---

## Open flow

User already has Store Pulse. Don't re-render or update the artifact — there's no "surface this artifact" API that doesn't rewrite the HTML, and rewriting on every Open trigger is wasteful churn.

1. **Read `SP_CONFIG`** from the existing artifact (`list_artifacts` → Read the returned path). If missing, re-route to Setup.
2. **Point to the artifact** via `show_widget`:
   - Left: a left-pointing arrow icon in a soft shape.
   - Right, two lines (regular weight 400; bold parts at 500):
     - **Look in your sidebar for a live artifact called Store Pulse Dashboard**
     - (smaller, greyed) or find it in the **Live artifacts** area
   - Add a paragraph gap after the callout.
3. Run **Editorial snapshot helper** below (Open variant: 2-3 bullet points, 4th thread option is "Edit my dashboard").

---

## Setup flow

Open with this exact sentence:

> "Setting up your Store Pulse dashboard — a live artifact that shows your key store metrics, ready whenever you want to check in. Let's personalize it with a few quick questions."

### 1. Domain

- Always call `noibu_list_domains` first.
- **User named a domain** → find a case-insensitive match (accept `www.` variants). If matched, use that UUID + name. If not, tell them the named domain isn't in their Noibu account, list what is, and stop. Never silently substitute a different domain.
- **User didn't name a domain** → one result, use it; multiple, ask via `AskUserQuestion`.
- Save to `config.domain = { id, name }`. Only ever use names `noibu_list_domains` returned.

### 2. Optional blocks

`core-kpis` and `purchase-funnel` are always included — don't ask. Then ask once (multi-select, all default-off):

> "Your dashboard will include Core KPIs (sessions, engagement, conversion, AOV, revenue per session) and a Purchase Funnel by default. Anything else you'd like to add?"
> - **Top products** — top 5 by traffic with add-to-cart rate
> - **Channel performance** — sessions and conversion by traffic source
> - **Paid ad performance** — sessions, conversions, revenue per ad platform

Read `references/blocks/<id>.md` for each picked block before continuing.

### 3. Render the artifact

Config is baked into the HTML as `const SP_CONFIG = {...}` via the `__CONFIG_JSON__` placeholder. The artifact is the only persistent store — don't write config to disk.

```json
{ "version": 1, "domain": { "id": "uuid", "name": "..." }, "blocks": ["core-kpis", "purchase-funnel", "..."] }
```

Procedure:

1. Read `assets/dashboard.html`.
2. Run `scripts/render_dashboard.py` to substitute `__CONFIG_JSON__` exactly. Don't touch anything else.
3. Call `mcp__cowork__create_artifact` with:
   - `id: "store-pulse-dashboard"`
   - `html_path: <substituted file>`
   - `mcp_tools: ["mcp__a53d8516-38be-4a45-bddb-88be145c1e57__noibu_search_sessions"]`

   The `mcp__a53d8516-...__` prefix is the official, stable identifier for the production Noibu MCP connector — same for every user, safe to hardcode here and in `dashboard.html`. **This UUID is duplicated in `assets/dashboard.html` (inside the `callNoibu` helper).** If Noibu rotates its MCP UUID, both sites must be updated together — there's no shared constant, just two literal strings.

Use the template verbatim — renderers, labels, funnel step names, and per-cell empty states are all built in. Don't call discovery tools (`mcp__mcp-registry__list_connectors`, `noibu_list_connections`). On failure, retry with the same HTML.

Confirm: "Store Pulse is set up. The dashboard is live in your sidebar — open it whenever you want to check the store."

### 4. Offer the scheduled report

Ask, then **stop your turn**:

> "Want me to set up a recurring Store Pulse report? I can send it on whatever cadence works for you — email or Slack."

If declined, skip to step 5 — don't bring scheduling up again.

If confirmed:

1. Read the `## Scheduling form widget` section of `references/schedule.md`. Pass that HTML verbatim — the JS depends on every selector.
2. Render via `mcp__visualize__show_widget` with title `schedule_store_pulse`. This is the only renderer that auto-sends on submit; inline HTML or `create_artifact` will only pre-fill the input. Load `mcp__visualize__read_me` with `modules: ["interactive"]` once (silently) if you haven't already.
3. On submit, `sendPrompt` fires with `Schedule Store Pulse report: frequency=X, day=Y, time=Z, delivery=..., detail=...`. Parse all five fields, then ask for each picked delivery's target:
   - **Email** → "What email address should the draft be addressed to?"
   - **Slack** → "Which Slack channel should it post to?" Use `slack_search_channels`. If that errors, tell them once: "You'll need the Slack connector — install it at https://claude.ai/directory/connectors/slack" and stop.
4. Create one cron via `mcp__scheduled-tasks__create_scheduled_task`. Bake frequency/day/time/deliveries/detail directly into the prompt template — the cron is its own source of truth and the dashboard renders nothing schedule-related. **Don't update the artifact.** The prompt template, window math, and channel-specific message bodies live in `references/schedule.md`.

   **Resolve connector tool names before substituting placeholders.** The cron runs cold (no chat history) and can't discover MCP server prefixes at run time, so every Slack / Gmail / Outlook tool name has to be baked in at creation. For each channel in the user's deliveries, resolve the prefix from your current session's available tools and substitute the matching placeholder — Slack uses `{{slack_canvas_tool}}` and `{{slack_message_tool}}`, Gmail uses `{{gmail_draft_tool}}`, Outlook uses `{{outlook_draft_tool}}`. See the "Connector tool names must also be baked in" section of `references/schedule.md` for the donor tools to use and the exact fully-qualified names. If an Outlook delivery is requested and no Outlook draft tool is visible in your session, tell the user and don't create the cron.
5. Confirm, **including the permission note** — the cron must be run manually once to grant permission to send on the user's behalf, or the first scheduled run stalls on an unattended prompt:

   > "Scheduled — your Store Pulse report will go out [readable summary]. One heads-up: you'll need to run the task once manually from your scheduled tasks to grant the permissions it needs. After that first run, it'll deliver on its own."

If the form is Skipped, acknowledge and move on.

### 5. Offer to dig into the data

Ask, then **stop your turn**:

> "Want to dig into the data? I can surface a quick read of how the store is doing right now and some threads worth investigating."

If declined, end. Don't bring it up again. If confirmed, run **Editorial snapshot helper** below (Setup variant: 2-3 sentences prose, 4th thread option is "Not right now").

---

## Editorial snapshot helper

Shared by Open flow step 3 and Setup step 5.

1. **Fetch a 24h snapshot** — headline KPIs for the last 24h and prior 24h (deltas). Use `references/blocks/core-kpis.md`. Don't fetch other blocks. Tell the user what you're doing.
2. **Write the summary inline.** Lead with the most notable thing, mix wins and concerns, specific numbers but not exhaustive. No sub-bullets, headers, or extra markdown.
   - **Open variant** → 2-3 bullet points.
   - **Setup variant** → 2-3 sentences of plain prose, no bullets.
3. **Offer threads via `AskUserQuestion`** (single-select):
   - Header: "Where to next?"
   - Question: "Pick a thread to pull on."
   - 3 options drawn from the summary you just wrote — each targeting a specific signal (drop, surprise, trend, outlier), in the same order as the bullets/sentences. Frame as something to investigate, e.g. "Why did conversion fall 8pp?"
   - 4th option: **"Edit my dashboard"** (Open) or **"Not right now"** (Setup).
   - If fewer than 3 distinct threads surfaced, fill in with defaults: "Where's the biggest revenue opportunity?", "What changed since last week?"
4. **Route the pick**:
   - **Investigation prompt** → treat as a fresh question. Don't answer from the snapshot alone — let normal skill-selection pick the right Noibu skill. Frame in the user's terms, not Store Pulse's block names.
   - **"Edit my dashboard"** → Reconfigure flow.
   - **"Not right now"** → acknowledge briefly, end.

---

## Reconfigure flow

Read `SP_CONFIG` from the existing artifact, mutate, re-render via `scripts/render_dashboard.py`, call `mcp__cowork__update_artifact`. Never recreate unless missing.

- **Block change** → update `blocks`, update artifact.
- **Domain change** — single-domain in v1, so this *replaces* the dashboard:
  1. `noibu_list_domains`, match the new name with Setup step 1's logic. If not found, list what's available and stop.
  2. Confirm before mutating: > "Switching your Store Pulse from [current] to [new] — this replaces the existing dashboard's data source. Continue?"
  3. Update `SP_CONFIG.domain`, re-render, update artifact. If a cron exists, also `mcp__scheduled-tasks__update_scheduled_task` so the baked-in domain matches.
- **Scheduled report change** (frequency / channel / time / target / detail level) → `mcp__scheduled-tasks__update_scheduled_task` with a fresh pre-substituted prompt. Don't touch the artifact.
- **Disable schedule** → delete the cron. Don't touch the artifact.
- **Artifact missing** ("I deleted my dashboard") → config went with it. Re-run Setup.

---

## File map

```
store-pulse/
├── SKILL.md
├── references/blocks/{core-kpis,purchase-funnel,top-products,channel-performance,paid-performance}.md
├── references/schedule.md
├── scripts/render_dashboard.py
└── assets/dashboard.html
```

Read `references/blocks/<id>.md` for block specs (metrics, queries, tooltips); `references/schedule.md` for cron windows, expressions, message formats, and the prompt template.
