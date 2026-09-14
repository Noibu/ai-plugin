---
name: accessibility-audit
description: "Audit a website for WCAG 2.1 AA accessibility violations using automated scanning and Noibu traffic data, and optionally draft the fixes. Use when you want to know what's inaccessible across the store, check WCAG or ADA compliance, find contrast or heading errors, audit for screen reader support, generate an accessibility report, or fix accessibility violations with pull requests or tickets."
---

# Accessibility Audit

**Requires Cowork, linked to a computer with the Claude desktop app open** — see **Setup** below before anything else. This does not work in plain Claude chat, desktop app included.

- **On-demand** — someone asks for an audit right now. Produces a PDF report, then offers to open PRs/tickets for the top fixable findings immediately, and — once that's resolved — offers to put the whole thing on a recurring schedule, optionally with a digest sent to email/Slack/Notion.
- **Scheduled** — the same audit, run automatically on a cadence, with any configured fix automation applied before the report is generated. The full PDF stays in that run's session — it is never auto-shared to email, Slack, or Notion, since attaching a generated PDF to those isn't reliable. If a digest was configured, a short exec-summary-plus-links message (not the PDF) goes to the configured channel(s) instead.

---

## Setup

The scan needs `mcp__remote-devices__Claude_Browser__*`, which exists only in a Cowork session linked to a computer running the Claude desktop app — being in the desktop app isn't enough by itself. If those tools are genuinely absent (not just offline): tell the operator plainly this needs Cowork linked to a computer with the desktop app open, and stop. Never offer a reduced fallback (e.g. manual web-fetch review) — it's a materially weaker audit than this skill promises.

**Nothing else is required to run a plain audit** — it never touches a repo or ticket platform on its own.

1. **Scanning browser** — the built-in browser (`mcp__remote-devices__Claude_Browser__*`), for both on-demand and scheduled runs. Once confirmed present (see above), it still needs the linked desktop app to be open and online, not just installed, at the moment it's used. Not available at firing time (scheduled) → report the failure plainly rather than scanning some other way; this means the desktop app wasn't open then, not that anything is broken. Don't substitute Claude in Chrome or the linked-device bridge here — they share the same underlying constraint, not a way around it.
2. **Domain** — UUID → use it. Name only → `noibu_get_domain`. Neither → `noibu_list_domains`; use it if there's exactly one, else ask. Never block on this.

GitHub or a ticket platform are only needed if the operator opts into automated PRs/tickets — resolved at that point (Step 4), not up front.

There's no config file — connector status is checked at runtime.

---

## Rules

- **Never expose the scanning tool by name.** No "axe-core" in customer-facing output.
- **Every WCAG criterion links to its W3C Understanding page**: `https://www.w3.org/WAI/WCAG21/Understanding/<slug>.html`, confirmed via axe-core's `helpUrl`.
- **"Pageviews," never "visits."**
- **"GitHub Issue," never bare "Issue."**
- **"Automated tickets"** is the umbrella term for any ticket/issue automation produces. Never "Link" or split by platform in a table.
- **"Severity"** = axe-core's `impact` (critical/serious/moderate/minor). **"Priority"** = the traffic-weighted ranking score (`references/wcag-violations.md`) — determines row order, never shown as a column.
- **Automation naming**: config key `auto_pr`, card label "Auto-draft PR," button copy "Automatically draft a pull request (PR)." Never "Auto-fix."
- **Never merge anything.** A human does all merges, issue-closing, and status changes.
- **Link out, don't embed derived status** — never reproduce a GitHub Issue/ticket's live status in the report.
- **Pool before scoring or reporting anything.** Same selector + criterion = one finding (`references/wcag-violations.md` → Pooling).
- **A "link" means an actual `<a href>`, never styled text.** External URLs: `<a href="...">text</a>`. Same-document (e.g. Key Findings row → detail section): `<a name="finding-N"/>` + `<a href="#finding-N">`.
- **A subagent (the Agent/Task tool) may run Step 1's scan only** — read-only and self-contained, so delegating it to keep this session's context light is fine. It must return the raw pooled findings (data only); nothing else may be delegated. **Steps 2–5 always run directly in this session** — the PDF build, the chat reply, and every `SendUserFile`/`show_widget` call. A subagent's own tool calls (including `SendUserFile`) don't reliably surface to the operator, and its prose summary drifts from Step 3's required chat structure.

---

# On-demand flow

## Step 1 — Resolve and scan

1. Confirm the built-in browser is available, then resolve the domain.
2. Pull the top 10 pages by 30-day pageviews.
3. For each page: navigate to the plain URL (no query parameter), inject axe-core, call `axe.run()`. See `references/wcag-violations.md` → **Scan mechanics**. No screenshots — selector + HTML snippet is enough to locate a finding.
4. Pool every violation (see **Pooling**), score with the Priority formula, sort descending.

This step alone may run in a subagent (see **Rules**) if that helps keep the session's context light — it must hand back the pooled, ranked findings as data, and nothing more. Steps 2 onward always run directly in this session.

## Step 2 — Generate the PDF

Read the `pdf` skill, then build the report from the pooled, ranked findings.

- **File name**: `[Domain] Accessibility Audit [MM] [DD] [YYYY]` (e.g. `Carsncards.com Accessibility Audit 09 09 2026`).
- Title, subtitle (domain, standard, page count), audit date, one-line spacer, divider rule.
- Disclaimer (verbatim): *"This skill generates automated WCAG 2.1 AA accessibility reports. Automated tools detect 30%–90% of issues on the pages that were scanned. Results are informational only, not legal advice or a compliance certification. Manual testing by a qualified professional is required for complete coverage."*
- **Executive summary** — intro paragraph, stats paragraph, then severity metric cards. No specific finding named here.
  - **Intro** (2–3 sentences): pages scanned and why, total pageviews covered, AA-is-the-legal-standard line, and (if automation already ran this cycle) how many findings were auto-filed as tickets.
  - **Stats paragraph**: raw instance count + pooled/unique fix count, with the pooling relationship spelled out. E.g. *"We found 271 violation instances across the pages. Many repeat the same issue on multiple pages — once pooled, that's 27 unique fixes."* No severity breakdown or rule-type count here.
  - **Metric cards** — one row, four cards (Critical/Serious/Moderate/Minor), each a bordered/shaded `Table` cell with a large bold number over a small label. Colors: critical `#A32D2D`/`#FCEBEB`, serious `#854F0B`/`#FAEEDA`, moderate `#8A6D0B`/`#FEF6DA`, minor neutral gray. Zero counts still get a card.
    - Equal-width cards, full content width, matching padding/border/corner style.
    - Number and label are separate `Paragraph`s; give the number real `leading` (~32–34 for a 28pt font) and non-zero `spaceAfter` so they don't overlap.
- **Pages scanned** — table: page (hyperlinked to its live URL), 30-day pageviews, violation instances.
- **Key findings** — table: # / Finding (links to detail section) / WCAG (linked) / Severity / Automated tickets (only if at least one exists at generation time).
- One detail section per finding: severity badge inline and left-aligned at the start of the "Pages affected / Pageviews affected" line (e.g. **Severity:** SERIOUS | Pages affected: 10 | Pageviews affected (30-day, est.): 95,120); WCAG Violation line (criterion + link); plain-English description; CSS selector and HTML snippet from `nodes` (monospace block); Suggested fix (+ ticket link if one exists); Scanned pages affected (comma-separated, each hyperlinked) as the final line.
  - **Every element in a finding's detail section is its own `Paragraph`/`Table` with real spacing, never packed tight against its neighbor.** This applies to every adjacent pair, not just the two called out below: the severity/pages-affected header line, the WCAG line, the description, the Selector label, the Selector block, the Example HTML label, the Example HTML block, the Suggested fix line, the Automated ticket link line (when present), and the Scanned pages affected line. Give each a non-zero `spaceAfter` (or the next element a `spaceBefore`) sized to its font — a label sitting directly above a monospace block, or a "Suggested fix" line sitting directly above an "Automated ticket" link, are the two places this has visibly broken before, but the rule is general: nothing in this section should render with less than ~4–6pt of breathing room from what's above or below it.
  - The whole PDF is left-aligned by default; the only centered elements are the metric cards' number/label.

No appendix, no per-page violation matrix.

**Before delivering the PDF**, verify a link resolves in each of: a Pages Scanned row, a Key Findings row, a WCAG criterion, a finding's Scanned pages affected line. Also visually check **every** finding's full detail section — not a sample — for overlap between any two adjacent elements (metric cards included). Fix any defect before Step 3 — don't ship and caveat.

## Step 3 — Reply and deliver the report

One turn, exactly these two pieces in order, nothing else. The PDF's file card always renders last regardless of call order, so call it last — and once it's called, the turn is over: no closing sentence, no recap, no "let me know if..." after it.

1. **Chat reply**, three short paragraphs:
   - **Scope** — pages scanned and why, total pageviews, AA-standard line. Same content as the PDF's intro.
   - **Stats** — raw instance count + pooled/unique fix count with the pooling relationship, then severity as a bullet list (always all four, even at zero):
     > We found 271 violation instances across the pages. Many repeat the same issue on multiple pages — once pooled, that's 27 unique fixes:
     > - 24 serious
     > - 2 moderate
     > - 1 minor
     > - 0 critical
   - **Top violation** — name the single highest-priority finding, e.g. *"The highest-priority issue is **[finding name]**, affecting an estimated [pageviews] pageviews across [N] pages"* — close with *"...the rest of the findings and suggested fixes are in the report below."* This is the only finding named in chat; the PDF's own intro/stats stay aggregate-only.
2. **Deliver the PDF.** No text of any kind after this call.

Step 4's fix-automation offer comes after, as its own turn — don't fold it into this one.

## Step 4 — Offer fix automation

Render `references/automation-nudge-widget.md` as a `show_widget`. Required — confirm it actually rendered before treating this step as done. It offers **Auto-draft PR** and **Auto-create tickets** for the findings just generated — no Skip button, ignoring it is the decline.

**If a button is clicked**, apply the fix-selection rule now, against the report just generated:

> **Fix-selection rule**: for the top 10 fixable pooled findings (by Priority), draft a PR (`references/platforms/<platform>.md`) or open a ticket, whichever was chosen. Not traceable to a file → ticket only, labelled `needs-investigation`, doesn't consume a slot. Never touch checkout code or merchant-managed settings. Never merge anything.

1. Resolve what's needed for the chosen path if not already known this session (no persisted config — status is always checked at runtime, this session only):
   - **Auto-draft PR**: if GitHub tools aren't active in this session, clicking the button triggers GitHub setup right here — call `suggest_connectors` with `uuids: ["fe983ccb-92c7-4df1-85af-b1c3340b89bb"]`, tell the operator to connect it, and wait for confirmation before doing anything else. Once active, ask once: "Which GitHub repo holds the theme? (owner/name)".
   - **Auto-create tickets**: ticket platform + team/project, asked once. Confirm the relevant connector is actually active — not just that a value exists — calling `suggest_connectors` for it if it isn't, before writing anything.
2. Run the fix-selection rule. Every ticket and PR description uses the same fields as the PDF's finding detail section (Step 2): severity/pages affected/pageviews affected header line, WCAG line (linked), plain-English description, selector + HTML snippet, suggested fix (or the `needs-investigation` note), and a **Scanned pages affected** line listing every page the pooled finding appears on — each one an actual hyperlink to its live URL, same as the **Rules** section's link requirement, never bare page names like "Homepage."

   Reply with one line per finding that got something created — the finding name, then an arrow, then the ticket/PR reference **hyperlinked to that ticket or PR's real URL** (the platform tool's create call returns it; if a platform ever doesn't return a URL, use the platform's standard item-URL pattern rather than posting a bare ID like `NOI-12454` or `#172` with no link). Don't reuse the wording of any example below verbatim — it's illustrating the shape, not text to copy. More than 10 fixable findings → append *"N more findings weren't addressed this run — they'll be picked up on the next scan."* The PDF isn't regenerated.
3. Then ask in plain chat: *"Want this to run automatically on a schedule going forward?"* If yes, go to Step 5.

**If the widget is ignored**, nothing happens — no follow-up question, no scheduling offer. The operator can still ask for either, any time.

**If `show_widget` isn't available**: ask in plain chat whether to auto-draft PRs, auto-create tickets, or skip — same behavior once answered.

## Step 5 — Set up a recurring schedule

Only reached from Step 4's "run this automatically" question, or an explicit later request. **Scheduling always includes fix automation — there's no report-only schedule.** Step 5 can't be entered without a fix automation choice in hand:

- Reached from Step 4's question → a choice already ran this session, carry it forward.
- Reached by an explicit request with no Step 4 run yet this session → before rendering the widget, ask in plain chat: *"Scheduling automatically drafts PRs or creates tickets each run — which would you like: Auto-draft PR or Auto-create tickets?"* This is a forced choice, not optional — if the operator wants a one-off report with no automation, that's Step 1–3 on demand, not something to schedule. Resolve repo/platform/team the same way Step 4 does, including the connector check, before rendering the widget.

1. Render `references/schedule-widget.md` as a `show_widget`. It only configures cadence and an optional digest (email/Slack/Notion) — it does not re-offer Auto-draft PR / Auto-create tickets; that choice is inherited automatically from whatever ran in Step 4 this session, or from the forced-choice question above.
2. On submit, resolve fix-automation inheritance and digest destinations per that file's **On submit** section.
3. Create the task with `create_trigger` and `requires_local_device: true` (never in-process cron; omit `folders` — the built-in browser needs no local files, just the device binding). Confirm in one or two sentences — no widget — and note that the Claude desktop app needs to be open and online at each scheduled time: if it's ever closed when the schedule fires, the whole recurring task pauses silently rather than just skipping that run, so it's worth checking the task's status occasionally. Offer to run it once now via `fire_trigger` so any misconfiguration surfaces immediately; only fire if the operator says yes.

**If `show_widget` isn't available**: ask for frequency/day/time as plain chat questions.

---

# Scheduled flow

Each firing is a fresh session; the trigger prompt is fully self-contained.

1. Confirm the built-in browser is available → resolve domain (already in the prompt) → scan top 10 pages → pool and rank. Not available (desktop app not open at firing time) → report the failure plainly rather than scanning some other way; this means the app wasn't open then, not that anything is broken.
2. If Auto-draft PR or Auto-create tickets is enabled, apply the fix-selection rule (Step 4) now, before generating the report — so the report can show real links.
3. Generate the PDF (Step 2) — Automated tickets column now populated.
4. **Deliver the PDF into this run's chat with `SendUserFile`, same as Step 3 on-demand** — "stays in this session" means never attached to an external destination (email/Slack/Notion), not that it goes undelivered. The operator opens this scheduled task's history to see it, so the file card needs to actually be there. If a digest was configured, also send the exec-summary-plus-links digest (see `references/schedule-widget.md` → **Scheduled task prompt**) to each configured channel; otherwise nothing further happens.

No compliance-log document, no CI/GitHub Actions path — scheduling goes through `create_trigger` only.

---

## Configuration

See `references/schedule-widget.md` — triggered by Step 4's "run this automatically" question, or an explicit request. Configures frequency/day/time and an optional digest (email/Slack/Notion) for future runs; Auto-draft PR / Auto-create tickets aren't reconfigured here — they're inherited from Step 4. Never touches the report already delivered.
