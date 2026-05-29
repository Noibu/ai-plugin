---
name: product-analysis
description: "Analyze product and collection performance using Noibu data. Use when you want to know which products are underperforming, what your best-selling product type is, why a product isn't converting, how your collections are performing, which products get views but no sales, or where shoppers drop off in the product funnel."
---

# Noibu Product & Collection Performance Analysis

This skill has two entry points. Read the user's prompt carefully before doing anything.

## Quick answer — focused questions

If the user asked a specific, focused question ("which products get the most views?",
"how is the Sale collection performing?", "why isn't my polo converting?"):

1. Run only the one or two queries needed to answer it.
2. Give a short, direct answer — a few sentences and a small table if useful.
3. Use `AskUserQuestion` — not prose — to offer the full analysis:

   Question: "Want me to run a full product & collection analysis?"
   Options:
    - "Yes — survey products, collections, and types, then dig into anomalies"
    - "No thanks"

   If they select yes, proceed to the full analysis below.

## Full analysis

If the user asked for a broad analysis or said yes to the quick-answer offer,
run the two-part workflow below.

---

## Broad product overview

Tell the user what's happening before queries run — something like:
"Starting with a broad look across your products, collections, and product types
to see what's getting traffic, what's converting, and where the gaps are."

Fire all five queries in a single turn — do not wait for one before launching
the next. Also load the Noibu context guide in this same turn if you haven't already.

**Do not apply minimum session thresholds at this stage.**

**Note on field discovery:** The descriptions below explain what each query
should measure conceptually. Use the Noibu context guide or the API schema to confirm
the current field names before running. Do not guess field names.

### Products by views
Use the session search tool. Group by the field that lists which product titles
were viewed in a session (array join, limit 50). Measure session count,
conversion rate, and revenue per session. Order by sessions descending.

### Products by add-to-cart
Use the session search tool. Group by the field that lists which product titles
were added to cart in a session (array join, limit 50). Measure session count
and conversion rate. Order by sessions descending.

### Products by purchase
Use the session search tool. Group by the field that lists which product titles
appeared in completed orders (array join, limit 50). Measure session count and
median order/cart value. Order by sessions (completed-order count), not revenue.
Median cart value reflects the typical order size when this product was purchased
— a useful merchandising signal even with multi-product inflation.

### Collections by conversion
Use the session search tool. Group by the field that lists which collection titles
were viewed in a session (array join, limit 30). Measure session count, conversion
rate, and revenue per session. Order by sessions descending.

### Product types by conversion
Use the session search tool. Group by the field that lists which product types
were viewed in a session (array join, limit 20). Measure session count, conversion
rate, and revenue per session. Order by sessions descending.
Product types give a mid-level view between SKUs and collections — useful for
category vs. individual-product diagnosis.

---

## Cross-referencing the overview results

After the five queries return, compute the following in post-processing:

**View-to-ATC rate per product** = add-to-cart sessions ÷ products-by-views sessions.
Match products by title across the products-by-views and products-by-add-to-cart results. Products in the products-by-views top 20 that are
absent or low in the products-by-add-to-cart results have the worst view-to-ATC rate.

**ATC-to-purchase rate per product** = purchase sessions ÷ add-to-cart sessions.
Match products across the products-by-add-to-cart and products-by-purchase results. Products with strong add-to-cart but weak purchase are your
cart-abandonment story.

**Viewed only %** = sessions with no funnel progression ÷ total view sessions
Compute from the products-by-views session counts and site-wide CVR. A product where 80%+ of
viewers take no action is a strong candidate for deeper investigation — but check site-wide average
first, since a high "viewed only" rate is normal for low-intent browsers.

Compute the site-wide CVR as a benchmark (total purchases ÷ total sessions
across all segments) and use it when calling out collections or types that are
notably over- or under-performing.

---

## Reviewing the overview — Finding what to dig into next

Identify the 2–4 most interesting signals using the diagnostic playbook below.
Follow-up queries are not predetermined — they depend on what the data shows.

| If you see this… | Consider this follow-up |
|---|---|
| Product in top-20 views but low view-to-ATC rate | Page-level deep-dive: scroll depth, time on page, click engagement, errors — low scroll depth is the most common explanation |
| Product with strong ATC but weak purchase completion | Funnel depth breakdown: filter to sessions that viewed this product and group by funnel depth to see exactly where they stop |
| Collection with CVR well below site average | Country breakdown: filter to sessions that viewed this collection and group by country — near-zero CVR in multiple LATAM or non-primary markets usually means a localization or checkout gap, not a product problem |
| A collection's CVR well below others in same category | Product mix drill-down: filter sessions by collection and group by viewed product titles to see which products in the collection are and aren't converting |
| Product type outperforming or underperforming significantly | Break down by product title within that type to find which specific products are driving or dragging the number |
| High-purchase product absent from the products-by-views top results | Journey path analysis: these products may be reached via search or direct links rather than browsing — worth understanding the entry point |
| Collections with non-English names at very low CVR | Check if checkout is supported in those markets; this is typically a shipping or payment gap, not a product problem |

### Transitioning to deeper analysis

**This step is mandatory — always perform it without exception. Do not skip or summarize it away.**

Write a short, plain-language message that:
1. Summarises what the overview found in 2–3 sentences — use actual numbers
   and product/collection names from the data, not generic descriptions.
2. Names what you're going to investigate next and explains why, connected
   directly to what the overview showed.

It should read like a colleague saying: "The Devon Knit Polo is your second
most-viewed product but only 11% of viewers add it to cart — I'm going to look
at the product page engagement to see if scroll depth or a page error is the
culprit." Not: "Moving on to the deeper analysis."

Then either auto-run the follow-ups (preferred for broad, open-ended requests)
or ask first if the proposed direction is a significant departure from what
the user asked.

---

## Deeper follow-up analysis

Run only the follow-up queries identified above — not a fixed set.

**Apply traffic thresholds now, calibrated to the store's volume:**
- High traffic (>500K sessions/month): threshold ~0.1–0.2% of total sessions
- Mid-traffic (50K–500K): threshold ~0.3–0.5% of total
- Lower traffic (<50K): keep thresholds very low or skip

### Product page deep-dive
Use the page visits tool when a product has high views but a low
view-to-ATC rate. The most important metric is scroll depth — if the median
scroll depth ratio is below 0.25, users are not reaching the add-to-cart button.

Filter to URLs that contain the product's SKU code or core slug fragment (limit
15 results). Measure: page view count, median page duration, median max scroll
depth ratio, median clicked selector count, and total visual error count. Order
by page views descending.

Use URL CONTAINS with the product's SKU code (e.g. "MT0100169") rather than
an exact URL — product pages appear under multiple paths (direct /products/,
collection-scoped /collections/[name]/products/, and language variants like
/es/products/). The SKU fragment captures all variants in one query.

Interpret scroll depth:
- <0.20: users barely scroll — ATC button is likely below the visible area
- 0.20–0.40 with low clicks: users read but don't engage — content or pricing concern
- High errors on one URL variant: potential JS error blocking add-to-cart

### Funnel depth breakdown for a specific product
Use the session search tool when a product has strong ATC but weak purchase.

Filter to sessions where the target product title was viewed. Group by the funnel
depth field (represents how far through the purchase funnel the session
progressed). Measure session count. Order by sessions descending.

Funnel depth values: null = viewed only (no cart action), 1 = added to cart,
2 = checkout started, 3 = payment submitted, 4 = checkout completed.

Note: it is normal and expected for depth-4 sessions to outnumber depth-2 or
depth-3. This happens when shoppers use Apple Pay, Shop Pay, or other express
checkout methods that skip the standard checkout pages. Do not flag this as
a data error.

Lead with "Viewed only %" = null sessions ÷ total sessions — this is the most
actionable top-line number.

### Country breakdown for underperforming collections
Use the session search tool when a collection's CVR is well below the site average.

Filter to sessions where the target collection title was viewed. Group by country
code (limit 20). Measure session count, conversion rate, and revenue per session.
Order by sessions descending.

A collection that looks like a localization variant (e.g. "Polos de hombre")
will typically show near-zero CVR across multiple LATAM or non-English markets.
This is almost always a checkout availability or shipping restriction gap —
surface it as an ops/localization issue rather than a merchandising one.

### Product mix within a collection
Use the session search tool when a collection underperforms and the country
breakdown looks clean (i.e. it's not a localization issue).

Filter to sessions where the target collection title was viewed. Group by the
viewed product titles field (array join, limit 25). Measure session count and
conversion rate. Order by sessions descending.

### Journey paths from a product page
Use the user journey tool when you want to understand exit behaviour for a
specific product — especially one with high views but high bounce.

Anchor on URLs starting with the product's slug fragment, using loose mode.
Retrieve paths in both directions (before and after the anchor page) to a
max depth of 6 steps.

---

## Rendering the final report

**Guiding principle: insights first, data second.** The report must be scannable
in 30 seconds. Every table that follows is supporting evidence, not the headline.

---

### Section 1 — Key Findings & Recommended Actions *(always first)*

Write this section **after the overview and all deeper follow-ups are complete** — it should synthesize
everything, including deeper follow-up discoveries. Number each pair so Section 3 can
reference them without repeating them.

Lead with 3–5 finding + action pairs. This is the most important part of the report.

Format each as:

> **1. Finding:** [Product/collection name] + [one concrete number] + [why it matters in one clause].
> **Suggested Action:** [One specific, testable thing to do about it.]

Rules:
- Order by impact, not by how obvious the finding is.
- Every finding must name a specific product, collection, or type — no generic observations.
- Every action must be concrete enough to hand off.
- Cap at 5 pairs. If more signals exist, add one short line: "3 more signals in the data below."

---

### Section 2 — Supporting Data *(for validation and deeper reading)*

Three tight sub-sections. Show only columns that are directly actionable — drop
anything the reader can't act on.

**Products** (top 20 by views)

Columns: Product | Views | View→ATC% | ATC→Purchase% | CVR

- Bold any product referenced in Section 1.
- One callout sentence below the table naming the single biggest gap vs. site average.

**Collections** (top 15 by sessions)

Columns: Collection | Sessions | CVR | Revenue/Session

- Bold any collection referenced in Section 1.
- One callout sentence naming the biggest CVR outlier.

**Product Types** (top 10 by sessions)

Columns: Type | Sessions | CVR | Revenue/Session

- Omit this sub-section entirely if all types are within 20% of each other —
  no signal worth showing.

---

### Section 3 — Evidence from deeper analysis *(one card per deeper follow-up)*

This section exists to show *why* the actions in Section 1 are warranted —
not to restate them. Each card is the evidence trail for a finding already
summarized above. Do not repeat the finding or the action here.

For each deeper follow-up query, write a tight two-line card:

- **What the data showed:** specific numbers from the query — one or two sentences max
- **Supports:** reference the numbered action from Section 1 this evidence backs up
  (e.g., "→ supports Action 2")

If a deeper follow-up query revealed something not yet captured in Section 1, surface it
there first (add or update a finding + action pair), then reference it here.

No raw data dumps. If a table helps, cap it at 8 rows.


---

## Data quality notes

- **Revenue per product is not available.** The order value field captures the
  total cart value for a session — if a shopper buys three products, all three
  get credited the full order value. Never label any revenue figure as
  "product revenue." Use purchase session count as the primary volume metric
  and median cart value as a secondary signal for order size.
- **Product title variants.** Noibu records product titles exactly as stored
  in the platform, including colour/size suffixes. The same base product may
  appear as multiple rows (e.g. "WOMENS CLASSIC TEE - WT0200005" and
  "WOMEN'S CLASSIC TEE - WT0200005"). Flag near-duplicates rather than
  silently merging them.
- **URL fragmentation.** Product pages appear under multiple URL patterns.
  Always use URL CONTAINS with a SKU code or slug fragment in page visit queries.
- **Null funnel depth = viewed only.** Always label these "Viewed only",
  not blank or missing.

---

## After the report: saving

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
overview queries earlier in this session — do not hardcode or guess field names.
The correct names will already be known from the successful queries above.

1. **Embed config at the top as JS constants:**
   ```js
   const DOMAIN_ID = "...";
   const START_TIME = "...";
   const END_TIME = "...";
   ```

2. **On page load**, call `window.cowork.callMcpTool()` for each of the five
   overview queries (products by views, products by ATC, products by purchase,
   collections, and product types), plus any deeper follow-up queries that were run.
   Use the exact same field names and parameters that produced results during
   the analysis — copy them directly from the working queries above.

   **Critical implementation details:**
    - `callMcpTool()` requires the **fully-qualified** tool name. Use the tool
      names from the `mcp_tools` array that were active during the analysis session.
    - For the `records()` and `parseClaudeText()` helper implementations, and notes
      on the platform APIs (`window.cowork.callMcpTool`, `window.cowork.askClaude`)
      and GraphQL response versioning, load
      `querying-noibu-data/references/artifact-helpers.md`.

3. **After all fetches resolve**, generate the **Key Findings & Recommended Actions**
   section dynamically using `window.cowork.askClaude()`. Pass all fetched data as
   context so the findings reflect the current data load, not the session's original analysis.

   Structure the prompt to produce the same numbered finding + action format used in
   the in-session report:

   ```js
   const findingsRes = await window.cowork.askClaude(
     `You are analyzing ecommerce product performance data. Based on the data below,
      write 3–5 Key Findings & Recommended Actions in this exact format for each:
      "Finding: [product/collection name] + [one concrete number] + [why it matters].
       Action: [one specific, testable recommendation]."
      Order by impact. Every finding must name a specific product or collection.
      Every action must be concrete enough to hand off.
      Data: ${JSON.stringify({ productsByViews, productsByAtc, productsByPurchase, collections, productTypes })}`,
     []
   );
   findingsEl.textContent = parseClaudeText(findingsRes);
   ```

   Always store the result and pass it through `parseClaudeText()` before rendering.
   Setting `element.textContent = findingsRes` directly will render `[object Object]`.

4. **For supporting data tables** (Section 2), also call `window.cowork.askClaude()` for callouts.
   Always store the result and pass it through `parseClaudeText()` before rendering:
   ```js
   const insightRes = await window.cowork.askClaude(
     `In one sentence, what is the key finding? Data: ${JSON.stringify(rows)}`,
     []
   );
   insightEl.textContent = parseClaudeText(insightRes);
   ```

5. **Render** using the same visual structure as the in-session report, with
   Section 1 (Key Findings & Recommended Actions) appearing first and prominently.

List all Noibu tools used during the analysis in the `mcp_tools` array of `create_artifact`.

---

**If they choose PDF:**

Before invoking the `pdf` skill, generate a print-optimized HTML version.
Web fonts do not load reliably in the PDF renderer.

Write the simplified HTML to a temp file, then pass it to the `pdf` skill.
