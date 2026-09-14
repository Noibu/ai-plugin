---
name: checkout-analysis
description: "Analyze checkout performance and health using Noibu data. Use when you want to know where shoppers drop off in the checkout funnel, what payment or delivery methods customers are using, why completion rates are low, what priority errors are hurting checkout, or how cart and order values benchmark."
---

# Noibu Checkout Performance & Health Analysis

Surfaces where shoppers drop off in checkout and what to do about it, as a ranked
triage board built from Noibu session, value, and error data.

## How it works

Run Setup, then pick one of two behaviors from the user's prompt:

- **Quick answer** (one focused question) → run 1–2 queries, answer directly, offer to go deeper.
- **Full analysis** (broad request, bare invocation, or "yes" to the offer) → the four-step workflow below.

Full analysis flow: **(1)** broad overview (Q1–Q7, plus Q1b when available, current + prior window) → **(2)** cross-reference + period-over-period → **(3)** pick the top 3 regressions → **(4)** run targeted follow-ups → render the board (one widget). Signals are flagged on **change vs the prior window**, not absolute level — see `references/queries.md` "Signal model".

## Setup — before any query

**Work quietly.** Don't narrate plumbing — resolving the domain, loading reference files, reading the board format, and deciding which tools, queries, or fields to use all happen silently, with no "let me…" commentary or explanation of *how* the analysis will be assembled. The first thing the user sees is the Step 1 overview line ("Starting with a broad look…"); after that, narrate only real analytical progress (what the data shows), never file reads, tool setup, field-name lookups, or other implementation/processing detail about how the answer was produced.

- **Resolve the domain first; keep the company id it returns.** If the user gave a domain (name or UUID), use it. If not, ask which one via `AskUserQuestion` populated from the user's domains — don't interrogate for anything else; take the default window and proceed. If the account has exactly one domain, skip the question and use it. Domain resolution returns a company id alongside the domain UUID; some tools (priority errors, data-connection checks) need that company id too — carry both.
- **Load the Noibu context reference** (the `querying-noibu-data` skill/reference). It maps the role-based names used here ("session query tool", "funnel depth field", etc.) to the real Noibu tools/columns and documents query constraints. If it isn't available, discover tools and field names from the live Noibu API / tool schema instead — don't stop or guess.
- **Confirm every field name by role before using it** (from the context reference, else the live schema). Steps below name fields by role, never by hard-coded column, so when the API changes only the lookup moves.
- **Default analysis window:** the one in the context reference; if none, last 30 days.
- **Call `list_scheduled_tasks` now** — note whether any task's prompt references this domain; this sets the action-bar Schedule button label later ("Schedule insights" vs "Edit scheduled insights") without blocking rendering.

### Session tool — what it can group and filter by

- **Group by:** device, country, browser, OS, UTM source/medium, landing URL, bounced, discount-applied, and **funnel depth** (how far the session got).
- **Filter on:** device, country, bounced, checkout-completed, landing URL, UTM source.
- **Funnel depth — confirm the exact field name; the prefix matters.** It *is* groupable (working name ~`CONVERSION_FUNNEL_DEPTH`), but near-variants are rejected. If a group-by is rejected, look up the exact name and retry; only fall back to per-stage count measures if it truly isn't available.
- **Payment and delivery method are NOT groupable.** Attempt those slices only if the reference/schema exposes such a field; if not, skip them (see Principle 1).
- **Checkout sub-step submission counts (contact / address / shipping / payment) and cart value are per-session fields, not group-by dimensions.** They feed Q1b's abandonment-reason classification (row-level, one row per session), not the grouped session queries above. These are standard fields on every account — run Q1b unconditionally; only skip its output (whole table, or individual buckets) if the results actually come back empty (Principle 1 applied to the data, not to whether the fields are named in a reference doc).

## Two principles that govern everything

**Principle 1 — analyze what's present, never flag what's missing.** Which fields are populated varies by platform, integration, and account. An empty/null result is normal — that signal just isn't available for this domain, not broken.

- Silently skip any empty/null slice and build from the data you *do* have. Omit its table entirely — no zero-rows, no "no data" placeholder.
- Never create a finding, action, chip, or caveat about missing data, tracking, capture, or coverage. That's out of scope.
- There's always a useful story in the present data (funnel progression, device/country splits, conversion, errors, populated value/method fields). Lead with it confidently, as if it's the full picture.

**Principle 2 — trust cart → completion when intermediate events are uninstrumented.** If checkout-started and/or payment-submitted are near-zero while completions are healthy, those events aren't instrumented here. Don't treat the apparent "drops" as real — use cart → completion as the headline conversion metric and lean on segment splits (device, country, discount) for the drop story.

**Exception to Principle 1 — the whole domain is empty.** If the *entire* dataset is near-zero (total sessions 0 or a handful), there's no story to tell. Say plainly the domain has essentially no traffic in this window and offer to widen the range or pick another domain. This is a "no data in the window" statement (fine to surface), not a tracking-coverage complaint (still out of scope).

---

## Quick answer

A specific, focused question ("where do people drop off?", "what payment methods are used?", "errors on my checkout pages?"):

1. Load `references/queries.md` and run only the 1–2 query specs needed (e.g. funnel → Q1, why people abandon → Q1b, payment methods → Q3, errors → Q5).
2. Answer in a few sentences + a small table if useful.
3. Offer a deeper analysis; if yes, run Full analysis.

Don't load the triage-board or scheduling references for a quick answer.

## Investigate click

A triage-board **Investigate** button arrives as a new chat prompt ("Investigate this checkout signal: …") via `sendPrompt` — handle it as a focused follow-up, not a re-render of the board. The follow-up specs are in `references/queries.md` (Step 4).

- **Don't re-run the breakdown that built the card.** The Step 4 follow-up for this signal already ran to rank and headline it — reuse that evidence; only query again if the needed data wasn't pulled.
- **Go one level deeper** for root cause: e.g. error detail on the affected page, or live page inspection — genuinely new work beyond the breakdown. A single Investigate may surface more than one cause, and of mixed type (e.g. a UX/form issue *plus* two priority errors, or a slow page).
- **Route the what-next by cause type — decide this *after* diagnosing, never on the button click:**
  - **UX / funnel / market / discount / ops causes** → write the what-next inline: one concrete, owner-routed step + the check that confirms resolution.
  - **Priority error or performance/CWV causes** → if **tech-diagnosis** is available, hand each one off to it (it owns root-cause-to-fix, platform guidance, and the ticket/share flow). Emit one handoff per issue (carrying its own `humanId` or page), so multiple causes become multiple handoffs the user can pick from:
    - Fixable error → `/tech-diagnosis fix #[humanId] on [domain]`
    - Vendor/third-party error → `/tech-diagnosis share with vendor #[humanId] on [domain]`
    - Performance → `/tech-diagnosis fix [LCP|INP|CLS] on [page-url] for [domain]`
    - **If tech-diagnosis is NOT available, don't emit a dead `/tech-diagnosis …` command.** Handle the cause inline: name the issue (`humanId` / page), give a one-line likely root cause and a concrete next step. Don't mention or recommend installing another skill.
- **Offer to run the next step yourself when it's Noibu-answerable — this applies across every cause type above, not just performance ones.** Before handing a what-next off entirely to a human team, check whether it's something the Noibu MCP tools can actually answer right now: page-visit Core Web Vitals (LCP/INP/CLS) for the affected URL, session replay or session detail for the sessions in this bucket, a heatmap/click-map for the page, or a deeper breakdown of this same segment. When it is, end the answer with a one-line offer naming the specific action (e.g. "Want me to pull LCP/INP for the checkout page on mobile?" or "Want me to show you a few session replays from this bucket?") instead of only describing it as a task for someone else's team to go check manually. Don't offer this for what-nexts that are genuinely external (e.g. "have the payment processor check gateway logs," "ask the theme team to review the code") — only for what the Noibu toolset itself can pull. This offer is separate from (and can sit alongside) a tech-diagnosis handoff — it's for the cases where Claude can just go get the answer directly.
- **Answer in chat with:** the *why* (the breakdown already gathered, ≤8 rows, plus any deeper root-cause finding), per cause either the inline what-next or the tech-diagnosis handoff, and — where it applies — the one-line offer to pull further Noibu data directly. Keep it tight; don't re-render the board.

## Full analysis

A broad request, a bare invocation, or "yes" to the quick-answer offer. Run the whole workflow, then render the board in **one `show_widget`**:

1. **Broad overview** — fire Q1–Q7, plus Q1b when its fields are available, for the current window plus the prior-window counterparts for the change-detection metrics (`queries.md`, Step 1).
2. **Cross-reference + period-over-period** — compute current rates and their delta vs the prior window (Step 2).
3. **Pick the top 3 regressions** to dig into, using the routing table (Step 3). The only non-regression card is a qualified active error (Q5).
4. **Follow-up queries** — run only the follow-ups those signals call for (Step 4).
5. **Render the board** — load `references/triage-board.md` and render it as a single `show_widget` (title: `"checkout_board"`): the Overview card (with its 'Save as artifact' button), then the ranked Priority cards (cap 3) with Investigate buttons, then the action bar (Download report + Schedule insights). Use the `list_scheduled_tasks` result from setup for the Schedule button label.

**After the board, add one short closing line** so the turn ends with visible text — a `show_widget` with no following text can be read as "no visible output" and trigger a duplicate re-render. Keep it to a single sentence naming what it is, e.g. "Here's your checkout triage board for [domain] — last 30 days vs. the prior 30." Do **not** recap the findings, list the priorities, or add a prose scheduling offer; the board and action bar carry those. The same goes for any turn that ends with a `show_widget` (the schedule card included): follow it with one short line.

## Create live dashboard

Triggered by the Overview card's 'Save as artifact' button (arrives as "Save checkout overview as dashboard for [domain]").

Read `references/triage-board.md` (already in context if full analysis just ran) and `references/live-dashboard.md`, then follow the instructions in live-dashboard.md to build and save the artifact.

## Export PDF

Triggered by the action bar (arrives as "Export checkout analysis as PDF for [domain]").

Export-only — **do not re-run the analysis or any queries.** Reuse the results already in this conversation. Read `references/export-pdf.md` and follow the instructions there.

## Schedule report

Triggered by the action bar (arrives as "Schedule checkout analysis for [domain]" or "Edit schedule for [domain]").

Read `references/schedule-widget.md` and render it as a `show_widget`.

## Ignore issue

Triggered by an error card's Ignore link (arrives as "Ignore issue #[humanId] on [domain]").

Call `noibu_update_issue` to set that issue's status to Ignored/Closed (confirm the exact status value from the tool schema), then confirm in one line (e.g. "Ignored #445 — it won't surface on future runs"). Don't re-render the board. If `noibu_update_issue` isn't available, say so briefly rather than failing.
