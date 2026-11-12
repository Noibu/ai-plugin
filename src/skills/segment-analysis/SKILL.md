---
name: segment-analysis
description: "Analyze segment and traffic performance using Noibu data. Use when you want to know which channels, devices, or countries convert best, how mobile compares to desktop, where your traffic is coming from, which segments are underperforming, or where to find your best and worst converting customer segments. Also use for \"where is my traffic coming from\", \"is my marketing working\", \"which ads or campaigns bring buyers\". Use it even when Noibu isn't connected yet: the skill connects Noibu first."
---

# Noibu Segment Conversion Analysis

## Noibu connection check

Runs before anything else in this skill.

- **Check:** Noibu is connected when a tool ending in `noibu_get_domain` is available (load it with ToolSearch if tools are deferred) and the first `noibu_*` call doesn't fail on authentication. Connected → continue with the skill silently.
- **Not connected, user present:** stop the skill and reply with:
  - **A message, every time** (including later questions in the same chat), before the question. Two or three sentences: restate the user's question, say what you'll do once connected (time windows, comparisons, what they'll get back, from this skill's workflow), and end with "First, Noibu needs to be connected." No numbers or guesses about their store. With no question, describe what the skill does by default. This overrides "work quietly" and "no narration" rules, which apply only once connected.
    - Example: "Good question. I'll compare checkout over the last 30 days with the 30 days before, find the step where shoppers started dropping off, and check whether errors, devices or a segment explain it. First, Noibu needs to be connected."
  - **Then one `AskUserQuestion`:**
    - header: "Noibu"
    - question: "To <what they asked, in a few words>, Noibu needs to be connected. Do you have a Noibu account?" (under 120 characters)
    - options: "I have an account" ("Sign in to Noibu to connect it, then I'll continue") and "Start a free trial" ("Create a Noibu account at noibu.com/free-trial-claude")
  - Never send the user to Settings or mention other connectors or Noibu servers (local, staging, test).
- **"I have an account":**
  - Desktop, Cowork or claude.ai (`suggest_connectors` available): call `search_mcp_registry(["noibu"])`, keep only the result whose `url` is exactly `https://mcp.noibu.com/mcp`, and call `suggest_connectors` once with only its `directoryUuid` and `keywords: ["store data"]`. Then say "Click **Connect** on the Noibu card to sign in, then tell me when you're done and I'll pick up where we left off." No match or an empty card → no second card; say "Open **Connectors**, find **Noibu**, and click **Connect** to sign in. Tell me when you're done and I'll pick up where we left off." Never mention `/mcp` here.
  - Claude Code: say "Type `/mcp`, choose **plugin:noibu:noibu**, and select **Authenticate** to open the Noibu sign-in page. Tell me when you're done and I'll pick up where we left off."
  - When they're done, check again. Connected → resume the original request without re-asking. Still not connected → say the tools can take a new session to appear, and stop.
- **"Start a free trial":** reply only "[Start your free Noibu trial](https://www.noibu.com/free-trial-claude). Once your account is set up, run this again and choose **I have an account**." and stop.
- **Any other reply:** answer briefly and offer the question again.
- **Unattended (scheduled run):** no question or card; say "Noibu isn't connected, so this run couldn't read store data. Sign in to Noibu and the next run will work." and stop.

---

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "segment-analysis"` and a short `skillStep` (see the `querying-noibu-data` skill).

## Cards (`show_widget`)

This skill renders its cards with `mcp__visualize__show_widget`. That tool can be missing
on one turn and present on the next, so whether cards work is a fact about **this turn**,
never about the thread.

- **Check fresh before every card.** Right before each `show_widget` call, run
  ToolSearch `select:mcp__visualize__show_widget,mcp__visualize__read_me`. Never reuse
  an earlier turn's result, and never trust an earlier message in the thread (your own
  included) that said cards couldn't be shown.
- **Not found: refresh once, then fall back.** Call `RefreshMcpTools` if it is in your
  tool list and repeat the ToolSearch once. Still not found → use the fallback below.
  No further retries on this turn; the next card checks fresh again.
- **Never narrate it.** Don't name the tool, and don't say cards or widgets were
  unavailable or couldn't render. The fallback is simply the output.
- **Fallback.** Give the card's content as concise chat text, the summary and findings
  once each, and ask the card's question with `AskUserQuestion` using the card's button
  labels in the same order (four at most; name the rest in the question text). Where
  this skill forbids `AskUserQuestion`, ask it as one plain chat question listing those
  labels. A step below that gives its own fallback wins. In a scheduled run nobody is
  there to answer: skip the question and carry on as the task prompt says.

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
