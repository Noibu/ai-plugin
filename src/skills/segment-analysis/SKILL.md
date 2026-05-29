---
name: segment-analysis
description: "Analyze segment and traffic performance using Noibu data. Use when you want to know which channels, devices, or countries convert best, how mobile compares to desktop, where your traffic is coming from, which segments are underperforming, or where to find your best and worst converting customer segments."
---

# Noibu Segment Conversion Analysis

This skill has two entry points. Read the prompt carefully before doing anything.

## Quick answer — focused question

If the user asked a specific, focused question ("which channel converts best?",
"how does mobile compare to desktop?", "which countries are underperforming?"):

1. Run only the one or two queries needed to answer it.
2. Give a short, direct answer — a few sentences and a small table if useful.
3. Use `AskUserQuestion` — not prose — to offer the full analysis. The tool
   renders a choice UI the user can act on; prose questions get skipped.

   Question: "Want me to run a full segment analysis?"
   Options:
    - "Yes — survey device, country, and channel, then dig into anomalies"
    - "No thanks"

   If they select yes, proceed to Full analysis.

## Full analysis

If the user asked for a broad analysis or said yes to the quick-answer offer,
run the two-part workflow below.

---

## Broad segment overview

Tell the user what's happening before queries run — something like:
"Starting with a high-level look across your key segments — device, country,
and marketing channel — to see where conversion stands and spot anything
worth investigating further."

Fire all three queries in a single turn — do not wait for one before launching
the next. Also resolve any field name ambiguities in this same turn if you
haven't already.

**Do not apply minimum session thresholds at this stage.** See the full picture
first; you'll calibrate thresholds when running follow-ups.

**Note on field discovery:** The descriptions below explain what each query
should measure conceptually. Use the Noibu connector's schema or context tools
to confirm the current field names before running. Do not guess field names.

### Device breakdown
Query session data grouped by the field representing device type. Measure
session count, conversion rate, and revenue per session. Order by conversion
rate descending.

### Country breakdown
Query session data grouped by the field representing country (limit 30).
Measure session count, conversion rate, and revenue per session. Order by
sessions descending.

Order by sessions (not CVR) so the highest-traffic markets appear first —
easier to spot high-volume underperformers.

### Marketing channel breakdown
Query session data grouped by the fields representing UTM source and UTM
medium together (limit 30). Measure session count, conversion rate, and revenue
per session. Order by sessions descending.

Same rationale — order by sessions to surface the channels carrying the most
weight, then assess their conversion rate.

---

## Reviewing the broad overview — finding what to dig into

After the queries return, do not immediately render a full dashboard. **Compute
the site-wide conversion rate** from this data (total sessions ÷ total purchases
across all segments) and use it as the benchmark for calling out segments that
are notably over- or under-performing.

Identify the 2–4 most interesting signals using the diagnostic playbook below.
Follow-up queries are not predetermined — they depend on what the data shows.

| If you see this... | Consider this follow-up |
|---|---|
| A high-traffic country with conversion well below the site average | Break down by landing page — look for a localized or campaign-specific page that might have friction |
| A country with near-zero conversion | Break down by landing page filtered to that country, or check if a campaign is sending traffic to a broken page |
| A paid social channel with high traffic share but very low conversion | Break down by individual campaign to find which ones are dragging the channel down |
| One channel converting 5–10x better than others | Go deeper on that channel — by campaign or source — to find opportunities to scale it |
| Mobile conversion notably lower than desktop (or vice versa) | Break down by funnel stage and device — to find where specifically shoppers are dropping off |
| A large share of sessions with no channel attribution | Look at landing pages or referral sources to understand what's driving untagged traffic |
| Revenue per session and conversion rate moving in opposite directions for a segment | Flag as likely a currency or order value difference — may not need a follow-up query |


### Transitioning to the deeper analysis

**This step is mandatory — always perform it without exception. Do not skip or summarize it away.**

Write a short, plain-language message that:
1. Summarises what the overview found in 2–3 sentences — reference the actual
   numbers and segment names from the data, not generic descriptions
2. Names what you're going to investigate next and explains *why* each one is
   worth digging into, connected directly to what the overview showed

It should read like a colleague saying: "Canada's conversion is at 0.3% versus
your 2.1% site average, so I'm going to look at which landing pages that traffic
is hitting — that's usually where the friction shows up." Not: "Proceeding to
Phase 2 deeper analysis."

Then either:
- **Auto-run** the follow-ups (preferred when the user's original prompt was
  broad and open-ended)
- **Ask first** if the proposed follow-ups are a significant departure from
  what they asked

---

## Deeper follow-up analysis

Run only the follow-up queries identified above — not a fixed set.

**Apply traffic thresholds now, calibrated to this store's volume:**
- Very high traffic (>500K sessions/month): threshold ~0.1–0.2% of total
- Mid-traffic (50K–500K): threshold ~0.3–0.5% of total
- Lower traffic (<50K): keep thresholds very low or skip them entirely

**Campaign breakdown** — when one channel's aggregate conversion rate hides
variation between individual campaigns within it. Query session data grouped by
UTM campaign and UTM medium together (limit 25). Order by sessions descending.
Apply the same measures as the broad overview (session count, CVR, revenue per
session).

**Landing page breakdown** — when a country or campaign seems to have friction
at the entry point. Query session data grouped by the landing URL field (limit
25). Order by sessions descending. Filter to the relevant country or campaign
from the broad overview to keep results focused.

**Funnel stage breakdown** — when you want to know *where* in the checkout
a segment drops off. Query session data grouped by funnel depth and one
additional dimension (device type, country, or UTM medium — whichever the
overview flagged). Order by sessions descending. Choose the second dimension
based on what the overview showed; computing step-to-step rates by segment
reveals exactly where friction is highest.

---

## Rendering the final report

**Guiding principle: insights first, data second.** The report must be scannable
in 30 seconds. Every table that follows is supporting evidence, not the headline.

**Structure:**
1. **Key Findings & Recommended Actions** — Write this section after both phases
   are complete — it should synthesize everything, including deeper analysis
   discoveries. Lead with 3–5 numbered finding + action pairs, ordered by impact.
   Every finding must name a specific segment and a concrete number. Every action
   must be specific enough to hand off. No tables in this section.
2. **Segment overview** — one card per dimension (device, country, channel),
   each with a data table and a specific insight callout.
3. **Evidence from deeper analysis** — This section exists to show why the
   actions in Key Findings are warranted — not to restate them. Each card is
   the evidence trail for a finding already summarized above. Do not repeat the
   finding or the action here.

---

## Data quality notes

- **Currency anomalies**: Very high revenue per session for a single country
  usually means local currency, not USD. Flag it rather than presenting it
  at face value.
- **Untagged traffic**: A large share of sessions with no channel attribution
  is a tracking gap worth noting explicitly.
- **Awareness campaigns at zero conversion**: Expected — but still worth
  calling out so the user can confirm the campaign objective is non-conversion.
- **Express checkout on mobile**: More completed purchases than payment page
  views is normal — Apple Pay and Shop Pay bypass the payment step. Explain
  it rather than treating it as a data error.

---

## After the report: saving and scheduling

### Step 1 — Ask if they'd like to save the report and if so how

Use `AskUserQuestion`:

- **"Save as a live dashboard"** — a persistent artifact in Cowork that can
  be reopened and refreshed with current data at any time
- **"Save as a PDF"** — a static snapshot they can share or file away
- **"No thanks"**

---

**If they choose live dashboard:**

Do NOT save the already-rendered `show_widget` HTML — that HTML has data baked
in and will appear empty when the artifact is reopened.

Instead, build a brand-new dynamic artifact using `create_artifact`. The artifact
must fetch its own data every time it opens.

**Important:** Use the exact field names that were confirmed to work during the
broad overview queries earlier in this session — do not hardcode or guess field
names. The correct names will already be known from the successful queries above.

1. **Embed config at the top as JS constants:**
   ```js
   const DOMAIN_ID = "...";
   const START_TIME = "...";
   const END_TIME = "...";
   ```

2. **On page load**, call `window.cowork.callMcpTool()` for the three broad
   overview queries (device breakdown, country breakdown, channel breakdown),
   plus any follow-up queries that were run during the session. Use the exact
   same field names and parameters that produced results during the analysis —
   copy them directly from the working queries above.

   **Critical implementation details:**

    - `callMcpTool()` requires the **fully-qualified** tool name — the same
      `mcp__<server>__<tool>` string used in the `mcp_tools` allowlist. The
      short name will be rejected. Store it as a constant:
      `const SESSION_TOOL = "mcp__<server-id>__<tool-name>";`
      Use the exact fully-qualified name that was active during the session.

    - For the `records()` and `parseClaudeText()` helper implementations, and notes
      on the platform APIs (`window.cowork.callMcpTool`, `window.cowork.askClaude`)
      and GraphQL response versioning, load
      `querying-noibu-data/references/artifact-helpers.md`.

3. **After all fetches resolve**, generate the **Key Findings & Recommended
   Actions** section dynamically by calling `window.cowork.askClaude()` with
   all fetched data embedded directly in the prompt. Do not bake static findings
   text into the artifact HTML.

   ```js
   const findingsPrompt = `
     You are analyzing ecommerce segment data. Based on the data below, write
     3–5 numbered finding + action pairs for the Key Findings & Recommended
     Actions section, ordered by revenue impact. Each finding must name a
     specific segment and include a concrete number. Each action must be specific
     enough to hand off to a developer or marketer. No tables — prose only.

     Device data: ${JSON.stringify(deviceRows)}
     Country data: ${JSON.stringify(countryRows)}
     Channel data: ${JSON.stringify(channelRows)}
     Follow-up data: ${JSON.stringify(followUpRows)}
     Site-wide conversion rate: ${sitewideCVR}%
   `;
   const findings = await window.cowork.askClaude(findingsPrompt, []);
   ```

   Then call `askClaude()` a second time to generate the per-dimension insight
   callouts for the Segment Overview section, passing each dimension's rows in
   the prompt.

   Use `parseClaudeText()` from `querying-noibu-data/references/artifact-helpers.md`
   to coerce the return value to a string before inserting into the DOM.

4. **Render** using the same visual structure and styling tokens as the
   in-session report. The Key Findings & Recommended Actions section must be
   populated from the `askClaude()` result — never from static text.

List all Noibu tool fully-qualified names used in the `mcp_tools` array of
`create_artifact`.

---

**If they choose PDF:**

Before invoking the `pdf` skill, generate a **print-optimized HTML version**
of the report. Web fonts (Inter, IBM Plex Mono) do not load reliably in the
PDF renderer, causing garbled or missing text.

Write this simplified HTML to a temp file, then pass it to the `pdf` skill.
