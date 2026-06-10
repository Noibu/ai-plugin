---
name: tech-diagnosis
description: "Diagnose technical issues and Core Web Vital performance problems using Noibu data, and recommend a fix. Use when you want to know why an issue is happening, what's happening with an issue, what's causing errors, the root cause of poor performance on a page, how to fix a technical issue, why an error rate spiked, or where errors are concentrated. Requires a tech signal already in hand; for cause-unknown conversion gaps ('why is conversion low on this page?'), run conversion-technical-drag first to establish whether a technical signal exists."
---

# Tech Diagnosis

Diagnostic skill for a known tech signal — an error, a poor performance metric, or a behavioral drop suspected to have a tech cause. Produces a self-contained finding (Summary → Cause → Fix) the operator can act on, share, or escalate. Written for any audience, not just developers.

---

## When this skill triggers

**Direct invocations:** "why is LCP poor on checkout", "what's causing errors on Safari mobile", "diagnose this", "find the root cause", "what's behind this drop".

**Handoff invocations** (from other analysis skills, often with structured context — domain, segment, page group, window, behavioral signal — already attached): "check for tech causes", "investigate the technical side", "are there errors affecting [segment]". The most common structured source is the `conversion-technical-drag` skill, which hands off when its verdict is tech-dominant or it finds concentrated high-severity issues (e.g. "tovfurniture / PDP group / desktop LCP>4s cohort / 30d / slow visits convert 0% vs 13.9% same-page clean").

**Do NOT trigger** on open-ended lookups ("is my LCP slow?", "how many errors do I have?"). Those are direct MCP queries.

**Do NOT trigger** on cause-unknown conversion questions ("why is conversion low on X?" with no tech signal in hand). This skill explains a signal already identified; the `conversion-technical-drag` skill establishes whether a technical signal exists at all, and hands off here when one does.

---

## Principles

- **Each Noibu data source on its own terms.** Don't join error data to session/page-visit data client-side. Error tools surface impact natively; page-visit tools surface performance natively. No cross-table correlations.
- **No claims of user impact without replay evidence.** "Present in 1,200 sessions", not "blocking 1,200 users".
- **No revenue projections.** Impact is conveyed through occurrence count, impacted sessions, severity, page criticality, funnel stage — never revLost figures or computed dollar estimates.
- **No console links or replay URLs in output** (chat or share). Operators may not have console access. Inline the data instead. On explicit request only, provide links.
- **No raw data labels** (event types, insight tags, severity tiers without a labeled scale). Translate to natural language. Identifiers (variant IDs, issue IDs, file paths, CSS selectors, error messages, endpoints) stay in code style — those are actionable.
- **Don't hardcode tool names or query shapes.** Describe intent; let the routing skill (auto-invoked) handle tool selection and field mapping. The Noibu MCP evolves.
- **Suppress citation sections.** Never append a "Sources:" block — deliberate override of default citation behavior.
- **Write for any audience.** Plain-language fix instructions; flag honestly when a fix needs developer expertise.
- **Describe what to change, not how to navigate to it.** Platform admin UIs change; operators know their own admin.
- **If the fix is a code change, render the code.** Verbatim when enrichment ran; generic platform-appropriate pattern when not. Never prose-only code fixes.
- **Render output progressively.** Each step that produces operator-facing content shows it before moving on. Silent task completion is a failure mode.
- **Pause for direction; don't auto-advance.** After Summary, Evidence, Cause, and Fix — the operator drives. Pose open-ended next-step questions, never binary "continue?" prompts.
- **Pauses are conversational text, never AskUserQuestion modals.** Reserved for genuinely structured choices (connector setup; share destinations in the report widget).
- **Propose a default and proceed.** When multiple causes/fixes exist, commit to the most likely, mention alternatives in passing. The operator can redirect with a sentence — don't enumerate as a picker.
- **Don't narrate background operations. The first visible content after the operator's prompt is the diagnosis itself, never a setup paragraph.** Tool calls happen silently. Phase progression is signaled by the TodoList, not prose. Patterns to specifically avoid:
  - "I've got the issue details..." / "I have X, Y, and Z" — narrating data acquisition.
  - "Let me pull the trend..." / "Let me render the summary now" — narrating next action.
  - "I'll fetch A and B in parallel" — narrating execution.
  - "Acknowledged" / "Sounds good" / "Let me check X before doing Y" — preambles and announcements.
  - "Working on it" / "One moment" / "Hold on" — filler.
  - "I understand the issue, it's an X..." — narrating comprehension.

  The first visible content is either (a) an immediate clarifying question when the prompt is ambiguous, or (b) the actual diagnosis output (Summary section, or the next pause-for-direction prompt). Nothing in between.
- **Distinguish measured from reasoned.** Summary is grounded data. Cause and Fix are reasoned hypotheses — different runs may produce different reasoning. Surface this with a one-line transition note at the start of Cause (in chat) or as a static caveat at the top (in shares).
- **Page criticality is internal ranking, not a labeled field.** Order: Checkout > Cart > PDP > Collection > Home > Other. Describe naturally in prose ("hits during checkout"), never as a categorical line.
- **First-party vs third-party origin matters.** Third-party stack frames are flagged but not directly actionable by the operator — name the specific service when identifiable from the data. Common examples: marketing/email tools (Klaviyo, Mailchimp), cart/upsell apps (UpCart, Rebuy), loyalty/reviews (Hey Ethos, Yotpo, Loox), analytics/pixels (GTM, Meta Pixel, TikTok Pixel), payment gateways (Shop Pay, PayPal, Klarna, Afterpay), platform infrastructure (Shopify CDN), monitoring/recording wrappers (Sentry, rrweb). When the stack trace names a specific service, call it out by name rather than saying "a third-party script".
- **Share artifacts are static documents.** Strip chat-only constructs ("let me know if", "want me to walk through"). Recipient can't follow up with the skill.

---

## Process tracking

**Creating the TodoList is the first action of Step 0** — before authentication, before any data calls. Required, not optional.

Base tasks:
1. Understanding the issue
2. Measure the impact
3. Trace the cause
4. Recommend a fix

Conditional tasks (added when opted into):
- **Review evidence** — after Measure the impact, if the operator wants replays/heatmaps.
- **Optional handoff** — at the end, if the operator wants to share or open tickets.

Mark `in_progress` on start, `completed` when done.

---

## Step 0: Initialize

1. Create the TodoList with the four base tasks.
2. Confirm the Noibu MCP is connected. If not, ask the operator to connect it and stop.

Tool selection is handled by the auto-invoked Noibu routing skill — this skill describes what data it needs, the routing skill maps to current tool names.

## Step 1: Resolve the domain

- Domain UUID provided (direct or handoff) → use it.
- Domain name only → resolve via name lookup; fall back to listing all domains and asking if no match.
- Nothing provided → list domains and ask.

Capture the **platform field** from the domain response (Shopify, Magento, WooCommerce, BigCommerce, etc.) — used later for fix-instruction tailoring.

## Step 2: Determine the window

Default: 30 days. Override on operator/handoff request. Construct ISO 8601 UTC start/end times.

## Step 3: Identify the signal

Translate the prompt into:
- **Symptom** — error, performance metric, or behavioral drop with suspected tech cause
- **Scope** — page, page group, segment, funnel stage, or "any"
- **Context** — for handoffs, the upstream behavioral signal

Examples:

| Prompt | Signal |
|---|---|
| "Why is LCP poor on checkout?" | Performance — LCP — checkout |
| "What's causing errors on Safari mobile?" | Errors — Safari mobile |
| "Investigate the Safari PDP conversion drop" | Errors + performance — Safari mobile — PDPs — context: conversion drop |
| "What's the worst LCP page?" | Performance — LCP — all pages, ranked |

If ambiguous, ask one clarifying question. Mark "Understanding the issue" as `in_progress`.

## Step 4: Fetch focused data

Targeted queries only — no broad surveys.

- **Error signals:** priority issues matching the scope; full detail (stack trace, top URLs, browser/OS distribution, funnel stage distribution, status, first/last seen) for top 1-2 issues.
- **Performance signals:** Core Web Vitals at p75 for the affected URLs/page group, segmented by device and browser within the same query.
- **Combined signals:** both, scoped to the relevant page/segment.

Run in parallel where possible.

Mark "Understanding the issue" as `completed`, "Measure the impact" as `in_progress`.

## Step 5: Cross-reference, filter, render Summary

### Post-processing

For each error:
- Flag third-party origin (stack frames in third-party domains) — surface, don't suppress.
- Compute page criticality (internal ranking, not surfaced as label).
- Read funnel stage from issue metadata (pre-computed by Noibu — no client-side join).
- Cookie-consent observability check: if the issue fires on a consent endpoint (common examples: OneTrust, Cookiebot, TrustArc) and impacted sessions are very short with no further navigation, flag as a likely observability gap (the consent platform may be removing Noibu's script, ending the recording) rather than user impact. Name the specific consent platform when identifiable.

For each performance metric, map p75 to:

| Metric | Acceptable | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| FCP | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB | ≤ 800ms | ≤ 1.8s | > 1.8s |

Identify worst segment within the same query result.

### Ranking

Severity (critical first) → page criticality → impacted sessions (errors) or distance outside acceptable (performance). **Never rank by revenue projections.** Cap at 3-5 findings.

### Render the Summary

For each finding (ranking order), render a single **Summary** section containing:

1. **Narrative paragraph** — 3-5 sentences in prose: what's broken, where (described naturally), how many shoppers affected and the trend, what they do when they hit it, origin, notable signals. No labeled fields, no bullet list, no raw tags.
2. **Impacted-sessions widget** — one visualization that IS the summary: title ("Impacted sessions, last [window]"), prominent count with **% of total traffic** as a subtitle (e.g. "15 (0.05% of total)" — total store sessions in the same window as the denominator), plain-English week-over-week change (calibrated to volume — plain English for small numbers, percentages for high volume, never "WoW" acronym, never opaque "(3 vs 1)" shorthand), and a line/area chart. All from the same time series for the count and chart; total sessions pulled separately for the % calculation. Sized compactly so axis labels don't clip. No text duplicate below.
3. **Top pages affected** — 3-5 row table with URL and impacted-session count. Lives only here, not duplicated in Technical details.

Mark "Measure the impact" as `completed`.

**Pause for direction.** Conversational text in the response stream — never an AskUserQuestion modal:

> Let me know how you'd like to proceed — want to see evidence (replays or heatmaps), the technical details (issue type, stack trace, etc.), have me dig into the cause and fix, or pause here?

This is the only place the Technical details option is offered explicitly. After this pause, the operator can still request it any time with phrases like "show me the technical details".

## Step 6: Offer evidence (conditional task)

Only if the operator chose evidence at Step 5's pause.

Use whichever Noibu tools surface session replay data (errors and interaction issues) or heatmaps/clickmaps/scrollmaps (performance and click-pattern findings). Detect availability at runtime — don't assume specific tool names.

- **Session replays** — describe 2-3 replays inline (timestamp, device, brief observed behavior). No shareable URLs by default; on-request only.
- **Heatmaps** — render inline with a one-paragraph read of what stands out.

If the relevant evidence tool isn't available for a finding type, say so and offer to continue with the data-level diagnosis.

**Pause for direction.** Conversational text:

> What next — see more replays or another segment, ask a question about what you just saw, dig into the cause and fix, or pause here?

Mark "Review evidence" as `completed` if used; skip if not.

## Step 7: Trace the cause

Three sequential sub-steps before cause-tracing runs. Each prompt is **conversational text** in the response stream, and each **forces a pause** — the skill must wait for the operator's reply before moving on. Auto-advancing past any of these prompts is a failure mode.

**7a and 7b are two SEPARATE sequential prompts. Do not combine them into one prompt.** Render 7a, stop, wait for the operator's reply. Only after they reply, render 7b. Combining them into a single ask with all options at once is a failure mode — the operator answers one question at a time, and the answer to 7a may inform 7b (e.g., if they skip both connectors, the URL paste in 7b becomes the only enrichment path remaining; if they connect GitHub but skip the URL paste, that's a deliberate "code yes, live pages no" choice the operator should make in two separate moments).

### 7a. Connector preferences prompt (cached)

Check `.tech-diagnosis-config.json`. For each applicable connector that's unset, ask once:

- **GitHub** — always applicable.
- **Platform connector** — based on the domain's platform field (e.g. Shopify → official Shopify MCP). For platforms without an available MCP, skip.

Conversational prompt:

> Before digging into the cause, connecting these would let me verify against actual data rather than infer:
> - **GitHub** — if you use a Git workflow for your theme or codebase. Lets me check source files for line-level fix recommendations.
> - **Shopify** — your store data: variants, products, app configurations, store settings. Lets me verify configuration hypotheses against actual data (e.g., is this variant out of stock, is this app misconfigured).
>
> Want to connect either, both, or skip?

**Stop. Wait for the operator's reply.** Don't proceed until they've answered. Three outcomes per connector, cached:

- **Yes** — for GitHub, ask for `org/repo`; for platform, verify the MCP is connected (if not, surface the directory install URL and save `pending_connection`).
- **Not now** — proceed without; ask again next run.
- **Don't ask again** — save `skipped`; never prompt again for that connector.

If all applicable connectors are already cached (connected or skipped), skip this prompt entirely.

### 7b. Live page inspection prompt (per-session, no caching)

Conversational prompt:

> To inspect actual pages on your store as part of the diagnosis, paste your store's URL (e.g. `https://your-store.com`) so I can fetch affected pages and check the actual templates, scripts, and elements. Skip if you'd rather I reason from the Noibu data only.

**Stop. Wait for the operator's reply.** Don't proceed until they've answered.

If the operator pastes the URL with protocol, it satisfies the provenance constraint for `web_fetch` — all paths under that domain become reachable for the rest of the session. If they skip or decline, fall back to pattern-based recommendations for any finding that would have benefited from HTML inspection.

This prompt runs **every session** (no caching) because the provenance constraint resets per session.

### 7c. Cause-tracing enrichment

Once both prompts above are resolved, run cause-tracing with whatever enrichments are available.

**Foundation: Noibu's AI-generated issue diagnosis** (Title / What / Why / Impact + confidence). The "Why" content forms the basis of the "What's likely causing it" narrative — Noibu's AI has product-specific context the skill's LLM doesn't.

**HTML inspection (`web_fetch`).** Applies whenever a finding could benefit from seeing the actual rendered page — not just LCP/CLS, but also JS errors on specific pages (to see scripts/elements in play), HTTP errors (to see the form/button that triggered the failing request), image errors (to confirm if the URL still 404s), and CWV findings generally.

- Construct URL as `https://{domain}{path}` from the data (normalize relative vs absolute).
- Skip silently if the operator didn't paste a URL in 7b; fall back to pattern-based recommendations gracefully.
- Look for anti-patterns:
  - **LCP** — likely LCP element's `loading`, `fetchpriority`, `width`/`height` attributes; preload hints; render-blocking scripts; third-party script count.
  - **CLS** — images without dimensions; late-injected content; font-display strategy in inline CSS.
  - **INP** — element selector if known; otherwise stay pattern-based (HTML inspection has limited value for runtime issues).
  - **Errors** — context around the affected page: what scripts are loaded, what the affected element looks like, the form/button that triggers a failing request, whether a broken image URL is still 404'ing.

**Source-code enrichment (GitHub).** If connected, search the repo for the element identified by HTML inspection; fetch with ~20 lines of context; identify specific lines.

- SPA caveat: hashed class names produce multiple candidate files. Surface them and acknowledge the dev will need to pick the right one.

**Platform-data enrichment.** If the platform MCP is connected (e.g. Shopify), query actual store data to **confirm or refute** hypotheses — variant settings, product status, app configurations, store settings. With confirmation, state the cause confidently. Without, stay in working-hypothesis framing.

(Note: the Shopify MCP does not expose theme files. For theme source, GitHub is the path.)

**Stack-frame tracing (for error findings).** First-party (theme/codebase) vs third-party — name the specific service when identifiable (e.g. monitoring wrappers affect data collection not the user experience; marketing-tool scripts affect that tool specifically; payment-gateway frames affect that gateway). Identify the function/operation running when the error fired.

**Data-HTML mismatch is itself a finding.** If data says slow but HTML looks clean (no lazy hero, no missing dimensions, scripts deferred), cause is likely runtime (server response time, slow CDN, render-blocking JS execution).

### Render the cause

For each finding, output **"What's likely causing it"** inline.

Open with the transition note (exactly once per finding):

> *From here on, I'm reasoning over the data rather than reporting it. The cause and fix below are my best read of what it suggests — treat them as a working hypothesis, not a verdict, and use your judgment.*

If multiple causes are plausible, list them briefly ranked by likelihood, then commit to walking through the primary fix next — don't render as a picker:

> Two possibilities, in order of likelihood: 1. [...]. 2. [...]. I'll walk through the fix for #1 next. Let me know if you'd rather start with #2.

Mark "Trace the cause" as `completed`.

## Step 8: Recommend a fix

Render the **"How to fix it"** section for the fix in focus (primary, or the alternative the operator chose).

### Fix authoring

- **Name the change, not the navigation.** Specific file, attribute, setting, variant, or value. No admin-UI walkthroughs.
- **Always show code for code-based fixes:**
  - With enrichment → verbatim "before" from the fetched HTML/template + copy-paste "after".
  - Without enrichment → generic platform-appropriate pattern (Shopify Liquid, Magento template, WooCommerce PHP, generic HTML/JS).
  - Never prose-only descriptions of code changes.
- **For configuration fixes** (inventory settings, payment toggles, app configs) — name the specific setting and the value it should have.
- **Risk level** (low / medium / high) + "test on a preview before publishing" note. Calibrate risk to the change.
- **When a fix needs developer expertise**, say so plainly — don't pretend a complex change is self-serviceable. The technical details (available on request or in shares) are the handoff package.
- **Single fix at a time.** If alternatives exist, close with a one-line reference:

> If this doesn't resolve it, the alternative is [one-sentence summary]. Let me know if you want me to walk through that fix.

If source enrichment identified a specific file/line, mention it inline.

### Closing offer (conversational text, never a modal)

> Let me know if you'd like to walk through the alternative fix, see the technical details, share this with someone, or open a ticket. Otherwise, we're done here.

Mark "Recommend a fix" as `completed`.

### Per-finding output structure (reference)

```
## [Finding title — what's broken or slow, plain English]

### Summary  [Step 5]
[3-5 sentence narrative paragraph]
[Impacted-sessions widget: title + count (with % of total subtitle) + plain-English WoW change + line/area chart]
**Top pages affected:**
| URL | Impacted sessions |
|---|---|
| ... | ... |

### What's likely causing it  [Step 7]
*From here on, I'm reasoning over the data rather than reporting it...*
[2-4 sentences explaining cause. If multiple causes, brief ranked list + commitment to primary.]

### How to fix it  [Step 8]
**Risk level:** [low / medium / high]
[Code snippet or specific configuration change. Closing line about testing + alternative pointer if applicable.]

### Technical details  [Not in chat by default — see section below]
```

### Technical details

Rendered only when:
- The operator explicitly asks ("show me the technical details"), OR
- The Technical details chip is selected in the share widget (Step 9).

The field list below is **exhaustive**. Render exactly these fields, in order, omitting any with no data. Render no other fields — not state, not endpoint, not funnel reach, not behavioral symptoms, not frustration signals, not sample URLs, not origin classification, not anything else the API response includes. Those belong elsewhere (the Summary) or nowhere.

**For errors:**
- **Issue ID** — plain identifier (e.g. `#445`).
- **Issue type** — one descriptive line (e.g. "HTTP 422 Unprocessable Entity", "JavaScript TypeError").
- **Error message** — exact, in code style.
- **Error signature** — when available.
- **Pattern** — short prose description Noibu provides for occurrence context.
- **Stack trace** — top 3-5 frames, first-party vs third-party labeled.
- **HTTP debug data** — request headers, response headers, request payload, response body. Only when the API populates them. May contain sensitive data.
- **Browser impact** — horizontal bar chart, % of occurrences, top 5 with long-tail indicator.
- **OS impact** — same format.
- **Browser version impact** — only when one version concentrates ≥30% of occurrences.
- **OS version impact** — only when one version concentrates ≥30% of occurrences.
- **File/line** — only when source enrichment ran.

**For performance:**
- **Score** — one combined line: `[Metric] p75 [value] — [band]`.
- **Sub-metric breakdown** — when available.
- **Affected element** — CSS selector from HTML inspection.
- **Detected anti-pattern** — specific pattern found in HTML.
- **Browser impact** — when applicable.
- **OS impact** — when applicable.
- **File/line** — only when source enrichment ran.

**Hard rules — no exceptions:**

- Omit fields with no data. No "Not applicable", "—", "None", or placeholder text.
- No commentary or prose appended to or interleaved with the block. The block ends with the last data field, period.
- No pause-for-direction questions inside or immediately after the block. If a pause is needed for the broader flow, it happens in the surrounding step, not attached to this block.

## Step 9: Handoff (conditional task)

Reached only if the operator chose to share/ticket from Step 8's closing offer.

### First question (conversational)

> Share as tickets for follow-up, or as a report to send someone?

### Ticket path

Full content always included (Summary + Technical details + Cause + Fix). No widget, no content selection.

1. **Detect the connected ticket connector** (Linear / Jira / GitHub Issues / Notion task database).
   - **One connected** → use it directly.
   - **None connected** → use `suggest_connectors` to prompt installation.
   - **Multiple connected** → conversational question: which one?
2. **Ask for project/repo** if not cached. Save to config.
3. **Create tickets** — one per finding:
   - Title: `[severity] [summary] (affecting [segment])`.
   - Body in markdown: Summary → Technical details → Cause → Fix.
   - Priority mapping (where supported): critical → high; standard → medium; third-party-origin → default/low.
   - Labels (only if pre-existing): `tech-diagnosis`, `error` or `performance`, severity, `noibu`.
   - Assignee: unset unless operator specifies.
4. **Surface ticket URLs** after creation. Report partial failures honestly.

### Report path

Render the **share-configuration widget** inline (custom HTML widget — not AskUserQuestion). Match the visual style of the store-pulse and find-opportunities scheduling widgets: rounded pill chips, soft fill on selected, consistent typography, the platform-icon-then-label pattern. Widget structure:

- **Title:** "Share findings for issue #X"
- **Subtitle:** "Pick a destination and what to include with the summary." — the Summary is implicitly always included; the subtitle makes that clear so no locked chip is needed.
- **Destination chips** (multi-select; PDF pre-selected as default):
  - PDF (saves to workspace) — always available.
  - Email (Gmail draft) — only if connector connected.
  - Slack — only if connector connected.
  - Notion — only if connector connected.
- **Include chips** (multi-select, all optional add-ons to the Summary):
  - Cause — default on.
  - Fix — default on.
  - Technical details — default off.
- **Submit** ("Generate report" or similar) fires `sendPrompt` with structured selections.

If a chosen destination's connector isn't connected, surface the directory install URL inline rather than blocking — operator can install and resubmit.

**Conversational follow-up** (after submit, for each selected destination that needs recipient details):
- Email → "What email address?"
- Slack → "Which channel?"
- PDF → no follow-up; save and confirm path.
- Notion → "Which page or database?"

Multiple destinations are processed in parallel — generate the PDF, draft the email, post to Slack, etc. — and follow-up asks come as needed per destination.

**Generate the share artifact** with the Summary always present plus any selected add-ons, in this order: Summary → Technical details → Cause → Fix.

**Static-document rewrite required.** Strip all chat-only constructs:
- No "let me know if" / "want me to walk through" hooks.
- No pause-for-direction text.
- Alternative-fix mentions become static framing ("If the primary fix doesn't resolve, the alternative is [X]") not conversational.
- The reasoning-vs-measurement disclaimer, if included, becomes a single-line static caveat at the top.

**Per-channel:**
- **PDF** — `tech-diagnosis-[domain]-[date].pdf` in workspace. Confirm path.
- **Email** — subject `Tech findings for [domain] — [N] items to investigate`. HTML body, scannable.
- **Slack** — lead-in `*Tech findings for [domain]* — [N] items, last [window].` One mrkdwn section per finding.
- **Notion** — title `Tech findings for [domain] — [date]`. Sectioned page.

### No console/replay URLs in shared content (both paths)

Same rule as in-chat. Issue IDs as plain identifiers are fine. On explicit operator request only, include a console or replay link.

Mark "Optional handoff" as `completed`.

---

## Configuration file

`.tech-diagnosis-config.json` in the workspace folder, read at the start of Step 7:

```json
{
  "github": {
    "status": "connected" | "skipped" | "pending_connection",
    "repo": "org/repo"
  },
  "shopify": {
    "status": "connected" | "skipped" | "pending_connection"
  }
}
```

Platform-specific connectors keyed by platform name. Only consult the entry matching the current domain's platform. Skipped connectors are never prompted again.

---

## Common pitfalls

1. **Marking TodoList tasks completed without surfacing visible output.** Each step that produces operator-facing content must render it before moving on.
2. **Rendering pauses as AskUserQuestion modals.** Conversational text only — except for connector setup and share destination/content chips.
3. **Enumerating multiple options as a picker.** Propose a default, proceed, mention alternatives in one sentence.
4. **Narrating background operations.** No "I've got X" / "I have Y" / "Let me pull Z" / "Let me render W" / "I'll fetch A and B in parallel" / "Acknowledged" / "Let me check X before Y" / "Working on it" / visible file reads. First visible content is the diagnosis itself, never a setup paragraph.
5. **Echoing raw Noibu data labels.** Translate to natural language. Identifiers stay in code style — those are actionable.
6. **Synthesizing reproduction recipes or admin-UI navigation.** Don't invent steps. Use what Noibu actually provides; describe what to change, not how to navigate to it.
7. **Joining error data to session/page-visit data client-side.** Each data source on its own terms.
8. **Surfacing revenue projections** (Noibu's revLost figures or computed sessions × RPS estimates).
9. **Including console links or replay URLs** by default in any output. Operators may not have access. Inline the data.
10. **Hardcoding tool names or query shapes.** Describe intent; the routing skill handles tool selection.
11. **Describing code changes in prose without showing the code.** Always render the snippet.
12. **Using "WoW" acronym or "(3 vs 1)" raw-counts shorthand.** Plain-English week-over-week, calibrated to volume.
13. **Fetching URLs without provenance.** Ask for the protocol-prefixed domain in chat first.
14. **Leaking chat-only constructs into shares.** Strip "let me know" / "want me to" / pause questions when rewriting for static documents.
15. **Asking which ticket platform when only one is connected.** Use the connected one; only ask if multiple.
16. **Pretending complex fixes are self-serviceable.** When developer expertise is needed, say so plainly.
