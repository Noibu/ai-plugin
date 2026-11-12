---
name: product-analysis
description: "Analyze product and collection performance using Noibu data. Use when you want to know which products are underperforming, what your best-selling product type is, why a product isn't converting, how your collections are performing, which products get views but no sales, or where shoppers drop off in the product funnel. Also use for \"why isn't this product selling\", \"what should I promote\", \"which products should I focus on\". Use it even when Noibu isn't connected yet: the skill connects Noibu first."
---

# Noibu Product & Collection Performance Analysis

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

Surfaces which products and collections are winning or losing, and why — built from Noibu session and page data.

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "product-analysis"` and a short `skillStep` (see the `querying-noibu-data` skill).

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

- **Quick answer** (one focused question) → run 1–2 queries, answer directly, offer to go deeper.
- **Full analysis** (broad request, bare invocation, or "yes" to the offer) → the workflow below.

## Setup — before any query

**Work quietly.** Resolving the domain, loading reference files, reading field names, and running queries all happen silently — no "let me…" commentary. The triage board widget is the first substantive output.

- **Resolve the domain first.** Use what the user gave (name or UUID). If nothing, ask via `AskUserQuestion` populated from their domains — don't ask about anything else. If exactly one domain, skip the question.
- **Use the `querying-noibu-data` reference already loaded in context** — do not read it again. It maps role-based names to real tools/columns and documents query constraints.
- **Call `list_scheduled_tasks`** now — check whether any task's prompt references this domain and store the result. This sets the action bar button label later ("Schedule report" vs "Edit scheduled report") without blocking rendering.
- **Confirm every field name by role** before using it. Steps name fields by role, never hard-coded column names.
- **Default window:** from the context reference; if none, last 30 days.
- **If the entire dataset is near-zero** (total sessions 0 or a handful), say plainly the domain has no traffic in this window and offer to widen the range or pick another domain.

---

## Quick answer

For focused questions ("which products get the most views?", "how is the Sale collection performing?"):

1. Run only the 1–2 queries needed.
2. Answer directly — a few sentences and a small table if useful.
3. Offer full analysis; if yes, proceed below.

Don't load the triage-board or scheduling references for a quick answer.

---

## Full analysis

A broad request, a bare invocation, or "yes" to the quick-answer offer.

**Loading reference files:** Use the `Read` tool. All files live in a `references/` subdirectory next to this SKILL.md — derive the base path from wherever this file was loaded from.

1. Read `references/queries.md` AND `references/triage-board.md` now, before running any queries.
2. Run the four-step workflow from queries.md.
3. Render the overview card, priority cards, and action bar as one `show_widget` using triage-board.md. Use the `list_scheduled_tasks` result from setup to set the schedule button label.

After the widget, add a single short closing line so the turn ends with visible text — a `show_widget` with no following text can be read as "no visible output" and trigger a duplicate re-render. Keep it to one sentence naming what it is; don't recap the findings or restate what's in the widget.

---

## Create live dashboard

Triggered by the overview card 'Save as dashboard' button (arrives as "Save product overview as dashboard for [domain]").

Read `references/live-dashboard.md` and follow the instructions there to build and save the artifact. `references/triage-board.md` is already in context from the full analysis.

---

## Export PDF

Triggered by the action bar button (arrives as "Export product analysis as PDF for [domain]").

Read `references/export-pdf.md` and follow the instructions there.

---

## Schedule report

Triggered by the action bar button (arrives as "Schedule product analysis for [domain]" or "Edit schedule for [domain]").

Read `references/schedule-widget.md` and render it as a `show_widget`. After the widget, add a single short closing line so the turn ends with visible text — don't recap the options, just name what it is.

---

## Investigate click

A triage-board **Investigate** button arrives as a chat prompt ("Investigate this product signal: …") — handle as a focused follow-up, not a re-render of the board.

- **Don't re-run the breakdown that built the card** — reuse the evidence already gathered; only query again if genuinely new depth is needed.
- **Go one level deeper** for root cause. A single Investigate may surface more than one cause.
- **Route the what-next by cause type — decide this *after* diagnosing, never on the button click:**
  - **UX / merchandising / funnel / ops / localization** → write the action inline: one concrete, owner-routed step + the check that confirms resolution.
  - **Priority error or performance/CWV** → invoke the `tech-diagnosis` skill directly (read it via the `Read` tool using its path from the available skills list) and continue inline. Do not output a slash command or handoff text — the user should not see any `/tech-diagnosis ...` syntax.
- **Respond in plain chat text — do not use `show_widget`.** Format: root cause in 1–2 sentences, then a small markdown table of supporting evidence (≤8 rows), then the recommended action or tech-diagnosis output. Keep it tight; don't re-render the board.

---

## Data quality notes

- **CVR is only comparable within the same price tier.** High-ticket products and collections will always convert at lower rates than low-ticket items — this is expected, not a signal. Never flag low CVR as underperformance without a same-tier benchmark. Use product and collection names to infer price tier; when no same-tier benchmark exists, rely on `ATC_LIFT_OPPORTUNITY` and funnel depth instead. This limitation applies at every level — product, collection, and product type. Price data is not available in Noibu session data.
- **Revenue per product unavailable.** Order value = total cart for the session — all products in that session get credited the full value. Never label it "product revenue." Use purchase session count as the primary volume metric; median cart value as secondary.
- **Product title variants.** Same base product may appear as multiple rows (e.g. "WOMENS CLASSIC TEE - WT0200005" vs "WOMEN'S CLASSIC TEE - WT0200005"). Flag near-duplicates; don't silently merge.
- **URL fragmentation.** Always use URL CONTAINS with a SKU code or slug fragment in page visit queries.
- **Null funnel depth = viewed only.** Always label as "Viewed only", not blank or missing.

