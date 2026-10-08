---
name: store-pulse
description: An instant, at-a-glance read on your store's health from the last 24 hours — with the option to save it as a live Cowork dashboard artifact or schedule a recurring report. Use to check on how the overall store is doing, save a live dashboard, or schedule a recurring summary.
---

# Store Pulse

Daily-driver ecommerce snapshot. Every invocation leads with a fresh inline answer (24h
summary, KPI row, funnel). Saving a dashboard artifact and scheduling a recurring report
are explicit, optional actions — never prerequisites.

**One dashboard + one schedule per domain.** Different domains can each have their own,
side by side.

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "store-pulse"` and a short `skillStep` (see the `querying-noibu-data` skill).

## Default flow

Runs on every invocation ("how's my store doing", "check on flyinmiata.com", a bare
`/store-pulse`). No existence check gates this and no `list_artifacts` call here —
always fresh, and never mentions an existing saved dashboard even if one exists (see
"Save as artifact" for the one place existence *is* checked).

1. **Resolve the domain** — use it without asking if already clear from context;
   otherwise `noibu_list_domains` (one result → use it; multiple with none named →
   `AskUserQuestion`).
2. **Read `references/inline-snapshot.md`** and follow it exactly — it owns the full
   response shape (summary, widget, closing line, investigate-thread question).

---

## Save as artifact

Triggered by the snapshot widget's **"Save as artifact"** button (arrives as
`Save Store Pulse dashboard for [domain]`) or a direct request ("save this as a
dashboard").

1. **Check for an existing dashboard.** `list_artifacts` — match on id/title containing
   `store-pulse-[domain-slug]`, or a legacy `store-pulse-dashboard` whose
   `SP_CONFIG.domain.name` matches (see Migration note; leave its id alone).
   - Same call also decides the **title**: drop the domain suffix by default
     (`Store Pulse — Atari`), add it back only on a Label collision with another live
     dashboard (e.g. `atari.ca` already exists) — see `references/live-dashboard.md`.
2. **Exists?** Ask: *"You already have one, do you want to edit it?"*
   - Yes → ask what to change, go to "Edit an existing dashboard".
   - No → acknowledge, stop.
3. **Doesn't exist?** Ask once about optional blocks (multi-select, all default-off;
   `core-kpis`/`purchase-funnel` are always included, don't ask about those):

   > "Your dashboard will include Core KPIs (sessions, engagement, conversion, AOV,
   > revenue per session) and a Purchase Funnel by default. Anything else you'd like
   > to add?"
   > - **Top products** — top 5 by traffic with add-to-cart rate
   > - **Channel performance** — sessions and conversion by traffic source
   > - **Paid ad performance** — sessions, conversions, revenue per ad platform

   Exactly these 3 — no "None of these" option (redundant on a multi-select; unchecked
   or Skip already covers it). Read `references/blocks/<id>.md` for each picked block.
4. **Build it** — read `references/live-dashboard.md` and follow it exactly (tool-name
   resolution, template, placeholders, id/title). Config shape:

   ```json
   { "version": 1, "domain": { "id": "uuid", "name": "..." }, "blocks": ["core-kpis", "purchase-funnel", "..."] }
   ```
5. Confirm: *"Store Pulse for [domain] is live in your sidebar — open it whenever you
   want to check that store."*
6. **Offer scheduling** (skip if already scheduled for this domain), then stop your turn:

   > "Want me to set up a recurring report for this too? I can send it on whatever
   > cadence works for you — email or Slack."

   Declined → end, don't re-offer this turn.

---

## Edit an existing dashboard

Reached from "Save as artifact" step 2, or directly ("add channel performance to my
flyinmiata.com dashboard", "switch my atari.com dashboard to a different domain").

Read `SP_CONFIG` from the target artifact, mutate, rebuild via
`references/live-dashboard.md`, `update_artifact` on the *same* `id` — never create a
second artifact for a domain that already has one.

Every rebuild silently re-resolves the live `noibu_search_sessions` tool name from your
current session (never reuse the one baked into the old artifact — its instance id may
have changed) and passes it as `mcp_tools`. This self-heals stale tool names on every
edit — an "mcp_tools allowlist" error just means rebuild + update. Don't narrate this
resolution to the user.

- **Block change** → update `blocks`, rebuild, update.
- **Domain change on *this* artifact:**
  1. `noibu_list_domains`, match case-insensitively (accept `www.` variants); not found
     → list options, stop.
  2. Confirm: *"Switching this dashboard from [current] to [new] — it'll replace this
     dashboard's data source. Continue?"*
  3. Update `SP_CONFIG.domain`, rebuild, update. Id/title stay derived from the *old*
     domain unless asked to rename — cosmetic mismatch is harmless.
  4. Schedule exists for the old domain → `update_scheduled_task` (new domain baked in)
     and rename the task to `store-pulse-[new-domain-slug]`.
  - Want a *second* dashboard for a different domain instead? → "Save as artifact" for
    that domain; leave this one untouched.
- **Artifact missing** → its config went with it; re-run "Save as artifact".

---

## Schedule report

Triggered by the snapshot widget's **"Schedule report"** button (arrives as
`Schedule Store Pulse report for [domain]`), a direct request, or step 6 above. Never
requires a saved artifact — the cron bakes its own config and never reads the live
dashboard.

1. **Check for an existing schedule.** `list_scheduled_tasks`, look for
   `store-pulse-[domain-slug]` (see `references/schedule.md`'s Task identity section) —
   found → this is an edit.
2. Read `references/schedule.md`'s `## Scheduling form widget` and pass that HTML
   verbatim (the JS depends on every selector).
3. Render via `show_widget`, title `schedule_store_pulse` — the only renderer that
   auto-sends on submit. Load `read_me` (`modules: ["interactive"]`) once, silently, if
   not already loaded.
4. On submit (`frequency`, `day`, `time`, `delivery`, `detail`), resolve each picked
   delivery's connector *before* asking for its target — never fall back to a
   plain-text install link, use the connector-recommendation widget instead:
   - **Email** → look for a live Gmail (`create_draft`/`search_threads`/`list_drafts`)
     or Outlook draft tool.
     - Found → ask for the email address (ask which inbox first if both are available).
     - Neither found → `search_mcp_registry(["gmail","email"])` and
       `search_mcp_registry(["outlook","microsoft 365","email"])`, then
       `suggest_connectors(keywords:["email"], uuids: <both>)` so Gmail and Microsoft
       365 show up together. Skip this delivery until connected; keep going with the
       rest.
   - **Slack** → look for a live `slack_search_channels` tool.
     - Found → ask which channel, resolve it.
     - Missing or unauthenticated → `search_mcp_registry(["slack","messages","chat"])`,
       then `suggest_connectors(keywords:["messages"], uuids: <match>)`. Same
       skip-don't-block rule.
   - All deliveries unresolved → don't create the cron; tell them to come back once
     something's connected.
5. **Create/update the cron** — `update_scheduled_task` (existing) or
   `create_scheduled_task` name `store-pulse-[domain-slug]` (new). Bake
   frequency/day/time/detail plus only the *resolved* deliveries into the prompt
   template (`references/schedule.md`). Resolve and substitute the connector tool-name
   placeholders (`{{slack_canvas_tool}}`, `{{slack_message_tool}}`,
   `{{gmail_draft_tool}}`, `{{outlook_draft_tool}}`) from your current session's tools —
   see `references/schedule.md`'s "Connector tool names must also be baked in".
6. Confirm, including the permission note:

   > "Scheduled — your Store Pulse report for [domain] will go out [readable summary].
   > One heads-up: you'll need to run the task once manually from your scheduled tasks
   > to grant the permissions it needs. After that first run, it'll deliver on its own."

Skipped form → acknowledge, move on.

---

## Migration note

Pre-multi-domain dashboards sit at the fixed id `store-pulse-dashboard` — leave exactly
as-is (no rename, recreate, or migrate). Any "does domain X already have a dashboard"
check must treat it as that domain's dashboard (match via `SP_CONFIG.domain.name`). Only
new dashboards use the domain-derived id scheme.

---

## File map

```
store-pulse/
├── SKILL.md
├── references/blocks/{core-kpis,purchase-funnel,top-products,channel-performance,paid-performance}.md
├── references/inline-snapshot.md
├── references/live-dashboard.md
└── references/schedule.md
```

- `references/blocks/<id>.md` — block specs (metrics, queries, tooltips); shared by the
  snapshot, the dashboard, and scheduled reports.
- `references/inline-snapshot.md` — default response shape: summary, KPI+funnel widget,
  action buttons, investigate-thread question.
- `references/live-dashboard.md` — persistent artifact: template, tool-name resolution,
  id/title convention.
- `references/schedule.md` — cron windows, task naming, message formats, and the
  scheduling form widget.
