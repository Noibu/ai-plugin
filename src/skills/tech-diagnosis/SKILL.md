---
name: tech-diagnosis
description: "Diagnose technical issues and Core Web Vital performance problems using Noibu data, and fix them, drafting a pull request when the code repo is connected. Use when you want to know what's broken across the store, why an error is happening, what's causing errors, the root cause of poor page performance, how to fix a technical issue, why an error rate spiked, or where errors are concentrated. Also use for \"something's broken on my site\", \"my site is slow\", \"customers say a page won't load\", \"is anything broken\", or a bug on the store. Use it even when Noibu isn't connected yet: the skill connects Noibu first."
---

# Tech Diagnosis

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

- **Proactive** — no specific issue. Scans for highest-value errors and CWV problems, surfaces a prioritized list.
- **Reactive** — a specific signal is named. Produces a self-contained finding (Summary → Cause → Fix).

---

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "tech-diagnosis"` and a short `skillStep` (see the `querying-noibu-data` skill).

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

## Setup (always runs first)

1. **Domain** — UUID → use it. Name only → resolve. Nothing → list and ask. Capture **platform** (Shopify, Magento, etc.).
2. **Mode + window** — detect mode (see below). Default window: 30 days.
3. **TodoList** — create with mode-appropriate tasks.

There is no config file. Connector status is detected at runtime by checking tool availability. Preferences are asked per session.

## Mode detection

- **Proactive** — no specific issue given. Domain name alone is proactive. Examples: "run tech diagnosis", "what's broken", "scan for issues".
- **Share with vendor** — message starts with "Share with vendor:". Skip setup and diagnosis → go to Step P4 Share with vendor.
- **Ignore issue** — message starts with "Ignore issue #". Skip setup and diagnosis → go to Ignore issue flow.
- **Reactive** — specific issue named alongside domain: error name, metric + page, Noibu issue ID, page URL, or structured handoff. Also reactive for connector reconfiguration requests.
- **Ambiguous** — ask: "Are you looking for a scan of what's broken across the store, or do you have a specific issue in mind?"

---

## Rules

- **No client-side data joins.** Each Noibu source on its own terms.
- **Don't overstate impact.** "Present in X sessions", not "blocking X users". No revenue projections or revLost figures.
- **Plain language.** Translate Noibu labels; keep identifiers in code style.
- **Suppress citation sections.**
- **First visible output is the result, never narration.** No preambles, filler, or "let me pull X".
- **Never narrate internals.** No tool names, query parameters, API state values, filter logic, or fallback decisions. Retries happen silently.
- **Pause only at designated points.** Reactive: the connector check before diagnosis (Stage 1, plus Stage 2 only when GitHub was declined), then once after the closing offer widget. Proactive: after findings widget. Open-ended questions only; never AskUserQuestion modals.
- **After every `show_widget` call, output one line only.** Proactive: "Select an option on a card above to get started." Reactive (closing offer): "Select an option above, or choose another issue to fix." No summary, no recap, nothing else.
- **Page criticality is internal only.** Checkout > Cart > PDP > Collection > Home > Other. Never a labeled field.
- **Name third-party services specifically.** Stack trace says Klaviyo, GTM, Shop Pay → use that name.
- **Never render a widget from memory.** If resuming from a compacted conversation, re-read this SKILL.md before any output.

---

# Proactive mode

**First action — before TodoList, before any queries:** send "Scanning [domain] for the top technical errors and performance issues — this may take a moment."

## Tasks
1. Scan errors
2. Scan performance
3. Rank findings and render widget
4. Deep-dive *(added when operator picks a finding)*

## Step P1: Scan for errors

**Before fetching any errors:** read `references/platforms/[platform].md` (fall back to `generic.md`). Extract the merchant code paths, platform paths, and telemetry paths. These are the patterns used to classify frames — do not skip this step.

Two passes in parallel.

**Pass 1 — Fixable errors:**
Use an error search query — **not the pre-ranked priority list** — so you control the candidate pool.

Search the last 7 days of errors, sorted by occurrence count highest first, 30 per page, active states only (new, open, in-progress). **Exclude at query time:** HTTP errors (4XX/5XX), network/connection errors (status 0, ERR_NETWORK), and "Script error" type. Metadata only — no stack traces in this call.

**Always fetch up to 3 pages.** Process each page before fetching the next — use the pagination cursor from the response to request subsequent pages. Stop early only if you already have 2 or more fixable candidates. After 3 pages or when no more pages are available, proceed with whatever you found.

For each candidate on each page, apply filters:
1. **Recency** — at least one occurrence in the last 48 hours. If not → skip.
2. **Volume** — more than 10 occurrences in the 7-day window. If not → skip.

For each survivor, fetch the full error detail individually to get the JavaScript stack trace frames. Classify using the paths extracted from the platform file:
- **No frames** → skip.
- **All frames match platform or telemetry paths** → skip.
- **At least one frame matches a merchant path** → keep as fixable candidate.

Before extracting top 2: **deduplicate** — if two candidates share the same primary file and error message/type, keep only the higher-scoring one and note the other ID as a related issue. Second slot goes to the next distinct error.

**Pass 2 — Vendor errors:**
Use the same search — last 7 days, sorted by occurrence count, 30 per page. Apply 48h recency and >10 volume floor. For each survivor, fetch the full error detail individually and classify frames against the platform file. Extract top 2 vendor candidates by score.

**Classification** — use the platform file already loaded above.
- **Fixable** — at least one frame in merchant-owned code paths.
- **Platform** — frames only in core platform infrastructure (Shopify CDN scripts, monorail, checkout, shopifysvc.com); or any HTTP error (4XX/5XX) with no JS stack trace; or any network/connection failure (status 0, ERR_NETWORK, request aborted) with no JS stack trace. Discarded regardless of endpoint. No exceptions.
- **Telemetry** — frames in known analytics/pixel/beacon scripts (see platform file). Discard silently.
- **Vendor** — third-party frames that aren't telemetry, including `*.shopifyapps.com` and Shopify product endpoints with their own support channel (Shop app, Shop Pay).

Discard platform and telemetry. **Classification is mechanical — no judgment calls.**

**Score:** `occurrences (7-day total) × criticality_weight`
Weights: Checkout=5, Cart=4, PDP=3, Collection=2, Home=1, Other=0.5

## Step P2: Scan for performance

Fetch CWV (LCP, INP, CLS) across all page groups. Filter to pages with at least one metric outside the Good band (see `references/performance.md`).

**Score:** `traffic_weight × severity_score` — traffic_weight normalized (highest=1.0); severity: Poor=3pts, Needs Improvement=1pt per metric.

Take top 2. Capture: page/group, worst metric + p75 value, band, traffic volume.

## Step P3: Rank findings and render widget

Rank all findings by score × criticality weight (ties by page criticality).

Load `show_widget` via ToolSearch (`select:mcp__visualize__show_widget`), fresh on this turn (see **Cards** above). If it isn't found after one refresh, give the findings as text with each card's prompts written out and ask which to start with in one plain chat question. Call with `title: "tech_findings"` and loading messages `["Scanning for errors...", "Checking performance...", "Ranking findings..."]`.

Badge styles: Active `background:#FCEBEB;color:#A32D2D` · Re-emerging `background:#FAEEDA;color:#854F0B` · Improving `background:#EAF3DE;color:#3B6D11`

sendPrompt formats:
- Fixable → `/tech-diagnosis fix #[issue-id] on [domain]`
- Vendor → `/tech-diagnosis share with vendor #[issue-id] on [domain]`
- Performance → `/tech-diagnosis fix [LCP|INP|CLS] on [page-url] for [domain]`

```html
<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;">Tech findings for [domain] — last 30 days</h2>

<div style="display:flex;flex-direction:column;gap:24px;padding:4px;">

  <div>
    <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Issues you can fix</p>

    [Repeat for each fixable error, up to 2:]
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:10px;">
      <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">[Error type]</span>
        <span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;[badge inline style]">[Active|Re-emerging|Improving]</span>
      </div>
      <div style="background:var(--color-background-primary);padding:20px;">
        <p style="font-size:15px;font-weight:500;margin:0 0 8px;color:var(--color-text-primary);">[Plain-English title]</p>
        <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 12px;">[1–2 sentences: what's wrong, where, who's affected]</p>
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 16px;">[number] occurrences · last seen [date] · [pages] · [browser/OS]</p>
        <div style="display:flex;align-items:center;gap:16px;">
          <button onclick="sendPrompt('/tech-diagnosis fix #[issue-id] on [domain]')" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Get fix ↗</button>
          <button onclick="sendPrompt('Ignore issue #[issue-id] on [domain]')" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Ignore</button>
        </div>
      </div>
    </div>

    [If no fixable errors:]
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:16px 20px;"><p style="font-size:14px;color:var(--color-text-secondary);margin:0;">No active errors found that you can fix directly.</p></div>
  </div>

  <div>
    <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Performance</p>

    [Repeat for each performance finding, up to 2:]
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:10px;">
      <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">[LCP|INP|CLS]</span>
        <span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;[badge inline style]">[Active|Re-emerging|Improving]</span>
      </div>
      <div style="background:var(--color-background-primary);padding:20px;">
        <p style="font-size:15px;font-weight:500;margin:0 0 8px;color:var(--color-text-primary);">[Plain-English title]</p>
        <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 12px;">[1–2 sentences: what's slow, where, how bad]</p>

        [Benchmark bar — flex values and marker per metric:
          LCP: green=25/yellow=15/red=60, scale 0–10s, labels "2.5s" "4.0s", marker=value/10*100%
          INP: green=20/yellow=30/red=50, scale 0–1000ms, labels "200ms" "500ms", marker=value/1000*100%
          CLS: green=10/yellow=15/red=25, scale 0–0.5, labels "0.1" "0.25", marker=value/0.5*100%
          Cap marker at 95%]
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
            <span style="font-size:20px;font-weight:500;color:var(--color-text-primary);min-width:48px;">[p75 value]</span>
            <div style="flex:1;position:relative;height:24px;">
              <div style="display:flex;height:100%;border-radius:5px;overflow:hidden;">
                <div style="flex:[green-flex];background:#D1FAE5;display:flex;align-items:center;justify-content:center;"><span style="font-size:10px;color:#065F46;">✓</span></div>
                <div style="width:1px;background:white;"></div>
                <div style="flex:[yellow-flex];background:#FEF3C7;display:flex;align-items:center;justify-content:center;"><span style="font-size:10px;color:#92400E;">!</span></div>
                <div style="width:1px;background:white;"></div>
                <div style="flex:[red-flex];background:#FEE2E2;display:flex;align-items:center;justify-content:center;"><span style="font-size:10px;color:#991B1B;">✕</span></div>
              </div>
              <div style="position:absolute;top:-3px;left:[marker-position];transform:translateX(-50%);width:2.5px;height:30px;background:var(--color-text-primary);border-radius:2px;"></div>
            </div>
          </div>
          <div style="display:flex;padding-left:60px;">
            <div style="flex:[green-flex];"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary);transform:translateX(-50%);">[threshold-1]</span>
            <div style="flex:[yellow-flex];"></div>
            <span style="font-size:10px;color:var(--color-text-tertiary);transform:translateX(-50%);">[threshold-2]</span>
            <div style="flex:[red-flex];"></div>
          </div>
        </div>

        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 16px;">[traffic volume · page group · device]</p>
        <button onclick="sendPrompt('/tech-diagnosis fix [LCP|INP|CLS] on [page-url] for [domain]')" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Get fix ↗</button>
      </div>
    </div>

    [If no performance issues:]
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:16px 20px;"><p style="font-size:14px;color:var(--color-text-secondary);margin:0;">No significant performance issues found.</p></div>
  </div>

  [If vendor errors exist:]
  <div>
    <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Vendor issues</p>

    [Repeat for each vendor error, up to 2:]
    <details style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;margin-bottom:10px;">
      <summary style="background:var(--color-background-secondary);padding:8px 20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">[Vendor name] — [Error type]</span>
        <span class="details-toggle" style="font-size:12px;font-weight:500;color:var(--color-text-secondary);">Show details</span>
      </summary>
      <div style="background:var(--color-background-primary);padding:20px;border-top:0.5px solid var(--color-border-tertiary);">
        <p style="font-size:15px;font-weight:500;margin:0 0 8px;color:var(--color-text-primary);">[Plain-English title]</p>
        <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 12px;">[1–2 sentences: what's happening, which vendor, impact]</p>
        <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 16px;">[occurrence count · vendor name · pages affected]</p>
        <div style="display:flex;align-items:center;gap:16px;">
          <button onclick="sendPrompt('/tech-diagnosis share with vendor #[issue-id] on [domain]')" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Share with vendor ↗</button>
          <button onclick="sendPrompt('Ignore issue #[issue-id] on [domain]')" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Ignore</button>
        </div>
      </div>
    </details>

    [If no vendor errors:]
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:16px 20px;"><p style="font-size:14px;color:var(--color-text-secondary);margin:0;">No third-party app errors detected.</p></div>
  </div>

  <div style="border-top:0.5px solid var(--color-border-tertiary);padding-top:16px;">
    <button onclick="sendPrompt('Schedule recurring tech scan for [domain]')" style="padding:9px 20px;font-size:14px;font-weight:500;color:var(--color-background-primary);background:var(--color-text-primary);border:0.5px solid var(--color-text-primary);border-radius:var(--border-radius-md);cursor:pointer;">Set up automations ↗</button>
  </div>

</div>

<script>
document.querySelectorAll('details').forEach(function(el) {
  el.addEventListener('toggle', function() {
    var lbl = el.querySelector('.details-toggle');
    if (lbl) lbl.textContent = el.open ? 'Hide details' : 'Show details';
  });
});
</script>
```

---

## Fix (triggered)

Triggered by a "Get fix" button click or `/tech-diagnosis fix … on [domain]`.

Add "Deep-dive" task, mark `in_progress`. Enter reactive flow from Step 2 (domain, platform, window already resolved).

---

## Share with vendor (triggered)

Triggered by "Share with vendor" button or `/tech-diagnosis share with vendor #[id] on [domain]`.

Fetch error detail. Generate a copyable vendor-facing summary (what, which pages, occurrence count, browser/OS breakdown).

**Do not use `references/share.md`, do not read or write the `share` config key, and do not ask the operator where to send it.** Just present the summary as copyable text, then ask in one line: "Want me to send this via email or Slack?" — but only if those connectors are already active in the session. If neither is connected, output the summary only. No preferences are saved.

---

## Ignore issue (triggered)

Triggered by "Ignore" button or "Ignore issue #[id] on [domain]".

Extract issue ID. Call `noibu_update_issue` to close/ignore. Confirm: "Issue #[id] marked as ignored." No further output.

---

## Schedule scan (triggered)

Triggered by "Schedule recurring tech scan for [domain]".

Read `references/schedule-widget.md` and render it as a `show_widget`. No prose before or after.

---

# Reactive mode

## Connector check (runs once before diagnosis)

Silently check which tools are available in the current session: GitHub, Claude in Chrome, and (if platform is Shopify) Shopify.

Runs in two stages. **Shopify is GitHub's fallback, so it is only ever asked once the GitHub outcome is known.** Never offer both in the same message.

The messages below are the copy to send, verbatim. Include only the bullets for connectors that are actually missing, and drop a bullet entirely rather than rewording it.

### Stage 1 — GitHub and Chrome

If both are already available, send nothing and go to Stage 2. Otherwise send **one combined message** and wait for a single reply — do not step through them one at a time:

> "Before I start — a couple of connections would make this more accurate:
> - **GitHub** — lets me point to the exact file and line that's broken, and draft a PR with the fix.
> - **Claude in Chrome** — lets me open your live pages in a real browser and run performance tests, which matters most on mobile.
>
> Want to connect any of these, or should I go ahead without them?"

If only one of the two is missing, keep the same shape with a single bullet, but make the whole message singular: open with "one quick connection would make this more accurate:" and close with "Want to connect it, or should I go ahead without it?"

For anything they choose to connect: call `suggest_connectors` (GitHub: `fe983ccb-92c7-4df1-85af-b1c3340b89bb`; Chrome: direct them to Settings → Customize). Wait for confirmation.

### Stage 2 — Shopify (only if GitHub is still unconnected)

After Stage 1 resolves, ask this **only if all three are true:** GitHub is still not connected (declined, or the connection didn't complete), the platform is Shopify, and Shopify tools aren't already available.

If GitHub is connected, skip this stage — the repo covers it. **Do not mention Shopify, do not explain why it's being skipped, say nothing.** Same if the platform isn't Shopify.

> "Since I won't have your code repo — connecting **Shopify** lets me check your live theme and settings, so the fix is based on your real store rather than a guess. Want to connect it, or go ahead without it?"

If they connect: call `suggest_connectors` with UUID `80917cb7-3071-4fca-b053-a4262d356c60` and keyword `store`. Wait for confirmation.

If they skip or say go ahead at either stage: proceed immediately, no follow-up. If all tools are already available, proceed immediately with no message at all.

## Tasks
- Understanding the issue
- Measure the impact
- Trace the cause
- Recommend a fix
- Optional handoff *(conditional)*

## Step 1: Identify the signal

Translate the prompt to symptom, scope, and context. If clear, fetch immediately — don't narrate it back. If ambiguous, ask one clarifying question.

| Prompt | Signal |
|---|---|
| "Why is LCP poor on checkout?" | Performance — LCP — checkout |
| "What's causing errors on Safari mobile?" | Errors — Safari mobile |

## Step 2: Fetch focused data

Targeted queries only — no broad surveys. Run in parallel where possible.
- **Errors** — priority issues matching scope; full detail for top 1–2. If this issue had related issues noted during proactive deduplication, fetch those too. Surface in the fix: "This fix should also resolve issue #[id] — same root cause, different trigger path."
- **Performance** — CWV at p75 for affected URLs/page group, by device and browser.
- **Combined** — both, scoped to the relevant page/segment.

## Step 3: Render Summary

For each finding:
1. Finding title as `##` heading
2. 2–3 sentence narrative: impact only — who's affected, how many, what they experience, trend. No error codes or endpoint names.
3. Impacted-sessions widget: two metric cards (session count + % of total) + line/area chart.
4. Top pages affected: 3–5 row table (URL + sessions)

Post-processing: see `references/errors.md` (errors) and `references/performance.md` (performance). Rank by severity → page criticality → sessions. Cap at 3–5 findings.

## Step 4: Trace the cause

- **Noibu AI diagnosis** — use Why/Impact as the basis for the cause narrative.
- **Live page inspection** — prefer Chrome (apply device emulation for worst segment) → fall back to web_fetch `https://{domain}{path}` (construct from resolved domain + Noibu paths, no need to ask) → pattern-based only. web_fetch is for fetching store URLs, not WebSearch. After fetching, extract only `<script>` `src` and `crossorigin` — discard full HTML immediately. For INP without Chrome, fetch clicked selectors from Noibu.
- **GitHub enrichment** — search for the affected element, fetch ~20 lines context.
- **Platform enrichment** — query store data to confirm/refute hypothesis.

If any enrichment source errors, skip it immediately and continue — treat as unavailable, no retries.

See `references/errors.md` and `references/performance.md` for guidance.

**Render cause:** open with "From here on, I'm reasoning over the data rather than reporting it…". Commit to the primary cause; note alternatives in one sentence.

## Step 5: Closing offer

Determine the fix internally but **do not render it yet**. Commit to the most likely fix; note alternatives in one sentence. Load `show_widget` (`title: "next_steps"`, loading: `["What's next..."]`). Nothing renders after the widget.

**Button visibility:**
- **"Automatically draft a pull request (PR)"** — always shown. If GitHub tools are not active in the session, clicking it triggers GitHub setup. If fix is not a code change, show disabled with explanation.
- **"Show me the fix"** — always.
- **"Open a ticket"** — hide only if all ticket connectors explicitly declined.
- **"Share findings"** — always.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:20px;">
  <p style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin:0 0 16px;">What would you like to do next?</p>
  [If fix is not a code change → disabled:]
  <div style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);margin-bottom:8px;opacity:0.5;cursor:not-allowed;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-tertiary);margin:0 0 4px;">Automatically draft a pull request (PR)</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">The fix for this issue isn't a code change — there's no file to edit automatically.</p>
  </div>
  [All other cases → active. Label: "Automatically draft a pull request (PR)"]
  <div onclick="sendPrompt('Automatically draft a pull request (PR)')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">[Label] ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">[low|medium|high] risk · Accept PR to apply fix</p>
  </div>
  <button onclick="sendPrompt('Show me the fix')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">Show me the fix ↗</button>
  [If ticket connectors not all skipped. Label: 0→"Open a ticket"; 1→"Open a ticket in [connector] — [team]"; 2+→"Open a ticket in [first] & [n] more"]
  <button onclick="sendPrompt('Open a ticket')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">[Label] ↗</button>
  [Label: 0→"Share findings"; 1→"Share findings to [destination]"; 2+→"Share findings to [first] & [n] more"]
  <button onclick="sendPrompt('Share findings')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;">Share findings ↗</button>
</div>
```

**When "Show me the fix" is clicked** — render fix only (no repeating Summary or Cause), then show the closing offer again.

### Output structure

```
## [Finding title]

### Summary
[2–3 sentences — impact only. No error codes or endpoint names.]
[Impacted-sessions widget: session count + % of total + chart]
**Top pages affected:** 3–5 row table

### What's likely causing it
*From here on, I'm reasoning over the data rather than reporting it...*
[1–2 sentences — hypothesis only. Start from why.]

[Closing offer widget]
"Select an option above, or choose another issue to fix."

--- after "Show me the fix" ---

### How to fix it
[Specific change only. Code or config, testing note, alternative pointer.]

### Technical details  [on request or via share widget]
```

## Step 6: Handoff *(conditional)*

See `references/ticket.md` for ticket flow. See `references/share.md` for share widget.

---

## Configuration

There is no config file. All connector statuses are detected at runtime by checking tool availability. Ticket and share preferences are asked per session via `AskUserQuestion`. Scheduled task prompts capture repo and ticket details at setup time for automated runs.
