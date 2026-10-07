---
name: segment-analysis
description: "Analyze segment and traffic performance using Noibu data. Use when you want to know which channels, devices, or countries convert best, how mobile compares to desktop, where your traffic is coming from, which segments are underperforming, or where to find your best and worst converting customer segments."
---

# Noibu Segment Conversion Analysis

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "segment-analysis"` and a short `skillStep` (see the `querying-noibu-data` skill).

## How it works

- **Quick answer** (focused question) → run 1–2 queries, answer directly, offer to go deeper.
- **Full analysis** (broad request, bare invocation, or "yes" to the offer) → the workflow below.

## Setup — before any query

**Work quietly.** The first thing the user sees is the triage board widget — no "let me…" commentary before it.

- **Resolve the domain first.** Use what the user gave (name or UUID). If nothing, ask via `AskUserQuestion` — don't ask about anything else. If exactly one domain, skip the question.
- **Call `list_scheduled_tasks`** now — store whether a task already exists for this domain. This sets the action bar button label at render time ("Edit schedule" vs "Schedule Insights") without blocking queries.
- **Confirm every field name by role** before using it. Reference files name fields by role, never hard-coded column names.
- **Default window:** last 30 days unless the user specifies otherwise.
- **If the dataset is near-zero** (total sessions 0 or a handful), say plainly that the domain has no traffic in this window and offer to widen the range.

---

## Quick answer

For focused questions ("which channel converts best?", "how does mobile compare to desktop?", "which countries are underperforming?"):

1. Run only the 1–2 queries needed and answer directly.
2. Offer full analysis via `AskUserQuestion` (not prose):
   - "Yes — survey device, country, and channel, then dig into anomalies"
   - "No thanks"

Don't load the triage-board or scheduling references for a quick answer.

---

## Full analysis

**Loading reference files:** Use the `Read` tool. All files live in a `references/` subdirectory next to this SKILL.md — derive the base path from wherever this file was loaded from.

1. Read `references/queries.md` AND `references/triage-board.md` now, before running any queries.
2. Run the workflow from queries.md.
3. Render the overview card, priority cards, and action bar as one `show_widget` using triage-board.md.

After the widget, add a single short closing line so the turn ends with visible text — a `show_widget` with no following text can be read as "no visible output" and trigger a duplicate re-render. Keep it to one sentence naming what it is; don't recap the findings or restate what's in the widget.

---

## Investigate click

Arrives as "Investigate this segment signal: …" — handle as a focused follow-up, not a re-render of the board.

- Reuse evidence already gathered; only re-query if genuinely new depth is needed.
- Diagnose root cause first, then route the action:
  - UX / campaign / localization / tracking gap → one concrete owner-routed action + the check that confirms resolution.
  - Priority error or CWV → invoke `tech-diagnosis` skill inline. No slash commands or handoff text visible to the user.
- **Respond in plain chat text — do not use `show_widget`.** Format: root cause in 1–2 sentences · evidence table (≤8 rows) · recommended action.

---

## Save as Artifact

Triggered by "Save segment overview as dashboard for [domain]".

Read `references/live-dashboard.md` and follow the instructions there to build and save the artifact. `references/triage-board.md` is already in context from the full analysis.

---

## Download Report

Triggered by "Export segment analysis as PDF for [domain]".

Read `references/export-pdf.md` and follow the instructions there.

---

## Schedule Insights

Triggered by "Schedule segment analysis for [domain]" or "Edit schedule for [domain]".

Read `references/schedule-widget.md` and render it as a `show_widget`.
