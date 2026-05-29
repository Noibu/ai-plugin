---
name: checkout-analysis
description: "Analyze checkout performance and health using Noibu data. Use when you want to know where shoppers drop off in the checkout funnel, what payment or delivery methods customers are using, why completion rates are low, what priority errors are hurting checkout, or how cart and order values benchmark."
---

# Noibu Checkout Performance & Health Analysis

This skill has two entry points. Read the user's prompt carefully before doing anything.

## Quick answer — focused questions

If the user asked a specific, focused question ("where are people dropping off in
checkout?", "what payment methods are customers using?", "are there errors on my checkout pages?"):

1. Run only the one or two queries needed to answer it.
2. Give a short, direct answer — a few sentences and a small table if useful.
3. Use `AskUserQuestion` — not prose — to offer the full analysis:

   Question: "Want me to run a full checkout performance analysis?"
   Options:
    - "Yes — survey the full funnel, payment mix, delivery mix, and errors, then dig into anomalies"
    - "No thanks"

   If they select yes, proceed to Full analysis below.

## Full analysis

If the user asked for a broad analysis or said yes to the quick-answer offer,
run the two-part workflow below.

---
## Broad checkout overview

Tell the user what you're about to query before starting — something like:
"Starting with a broad look across your checkout
to see funnel progression, payment methods, and delivery options."
Fire all five queries in a single turn — do not wait for one before launching the next. Also load the Noibu context reference in this same turn if you haven't already.

**Do not apply minimum session thresholds at this stage.**

**Note on field discovery:** Use the Noibu context reference or the API schema to confirm field names — do not guess.

### Full funnel by depth
Use the session query tool. Group by the field that represents how far each session
progressed through the purchase funnel (funnel depth). Measure session count.
Order by sessions descending.

Covers all sessions. Shows how many reached each stage:
0 = no action, 1 = ATC, 2 = checkout started, 3 = payment submitted, 4 = completed.
Compute step-to-step drop-off rates in post-processing.

### Cart & order value baseline
Use the session query tool. Filter to sessions that reached at least the checkout
start stage (funnel depth >= 2). Group by the field that indicates whether a
discount was applied to the order. Measure session count, median completed order
value, and median product quantity in the completed order. Order by sessions descending.

Scoping to depth >= 2 avoids null discount values on pre-checkout sessions.
Gives discount rate among checkout-entering sessions, and whether discounted
orders differ in size from full-price ones.

### Payment method mix
Use the session query tool. Filter to sessions where checkout was completed. Group
by the field that lists payment method names used in a session (array join, limit
20). Measure session count and median completed order value. Order by sessions
descending.

### Delivery method mix
Use the session query tool. Filter to sessions where checkout was completed. Group
by the field that lists delivery/shipping method names used in a session (array
join, limit 20). Measure session count, median completed order value, and median
shipping cost. Order by sessions descending.

### Priority errors on checkout pages
Use the priority errors tool. Filter to priority-type issues on URLs containing
"checkout". 

Returns pre-indexed error data — much faster than a session aggregation query.

---

## Cross-referencing results

After all five queries return, compute in post-processing:

**Step-to-step drop-off rates** from full funnel by depth query:
- ATC rate = depth-1+ sessions ÷ total sessions
- Checkout start rate = depth-2+ ÷ total sessions
- Checkout → payment rate = depth-3+ ÷ depth-2+
- Payment → completion rate = depth-4 ÷ depth-3+
- Overall checkout completion rate = depth-4 ÷ depth-2+

Note: depth-4 exceeding depth-3 is expected — see express checkout note in data quality notes.

**Cart profile** from cart & order value baseline query:
- Discount rate = discounted sessions ÷ total depth-2+ sessions
- Compare median order value for discounted vs. full-price orders
- Median products per order as a proxy for basket complexity

---

## Reviewing the overview — Finding what to dig into next

Identify the 2–4 most interesting signals. Follow-up queries are not predetermined —
they depend on what the data shows.

| If you see this… | Consider this follow-up |
|---|---|
| High checkout → payment drop (depth 2→3) | Break down by device type — filter to checkout-entering sessions, group by device; mobile form friction is the most common explanation |
| High payment → completion drop (depth 3→4) | Break down by payment method — filter to payment-submitted sessions, group by payment method names; completion rates often vary sharply by gateway |
| ATC → checkout start rate unexpectedly low | Use the user journeys tool anchored to `/cart` to see what users do instead of proceeding |
| Suspicion that a market blocks at checkout | Group by country filtered to cart-adding sessions — near-zero CVR in a high-traffic country usually means a shipping restriction or missing payment method |
| Active priority errors returned | Use the error detail tool on the top 1–2 issues; include humanId and title so a developer can find them in the console |
| Discount rate very high (>50% of checkout sessions) | Flag as a business observation — high promotion dependency is a margin risk; no Noibu follow-up needed |
| A delivery method with unusually high median shipping cost | Cross-tab by country to check if it's concentrated in one market |

---

### Transitioning to fuller analysis

**This step is mandatory — always perform it without exception. Do not skip or summarize it away.**

Write a short, plain-language message about the broad analysis using actual numbers: give a summary of the broad analysis, name the key findings and explain what you're investigating next and why. Don't say "Proceeding to Phase 2."

Then either auto-run the follow-ups (preferred for broad, open-ended requests)
or ask first if the proposed direction is a significant departure from what the user asked.

---

## Deeper follow-up analysis

Run only the follow-up queries identified above — not a fixed set.

**Apply traffic thresholds, calibrated to the store's volume:**
- High traffic (>500K sessions/month): threshold ~0.1–0.2% of total sessions
- Mid-traffic (50K–500K): threshold ~0.3–0.5% of total
- Lower traffic (<50K): keep thresholds very low or skip

### Device breakdown for a funnel stage
Use the session query tool when a step-to-step drop is concerning.

Filter to sessions that reached at least checkout start (funnel depth >= 2). Group
by device type. Measure session count, checkout start count, payment submission
count, and checkout completion count. Order by sessions descending.

Compute device-specific step rates in post-processing. A device where checkout →
payment rate is 30%+ lower than others is a strong friction or JS error signal.

### Country breakdown for funnel anomalies
Use the session query tool when you suspect a market is blocked at checkout.

Filter to sessions that added to cart (funnel depth >= 1). Group by country code
(limit 25). Measure session count and conversion rate. Order by sessions descending.

Near-zero CVR in a high-traffic market is almost always a shipping restriction
or unsupported payment method. Flag as an ops issue, not a UX problem.

### Payment method completion rate
Use the session query tool when the payment → completion drop rate is high overall.

Filter to sessions that reached payment submission (funnel depth >= 3). Group by
payment method names (array join, limit 20). Measure session count and checkout
completion count. Order by sessions descending.

Compute completion rate per method. A method with high reach but low completion
(e.g., card at 60% vs express checkout at 95%) points to a payment gateway issue.

### Error detail for checkout issues
Use when Q5 returned active priority errors.
Use the error detail tool on the top 1–2 issues by session impact.
Include humanId and title in the report so the developer can find them in the console.

### Cart page exit analysis
Use the user journeys tool when ATC → checkout start rate is unexpectedly low.

Anchor on URLs starting with /cart, using loose mode. Retrieve forward paths only
to a max depth of 5 steps.

High forward-navigation back to product pages from the cart signals purchase
uncertainty, not checkout friction. Exits to external URLs suggest distraction
or price comparison shopping.

---

## Rendering the final report

**Guiding principle: insights first, data second.** The report must be scannable
in 30 seconds. Every table is supporting evidence for a finding already named above.

---

### Section 1 — Key Findings & Recommended Actions *(always first)*

Write after both phases are complete. Number each pair.

Lead with 3–5 finding + action pairs:

> **1. Finding:** [specific step, device, or page] + [one concrete number] + [why it matters].
> **Suggested Action:** [One specific, testable thing to do.]

Rules:
- Order by impact, not by how obvious the finding is.
- Every finding must name a specific funnel step, device, payment method, or page.
- Every action must be concrete enough to hand off.
- Cap at 5. If more signals exist: "X more signals in the data below."

---

### Section 2 — Supporting Data *(for validation and deeper reading)*

**Checkout funnel** (all sessions)
Columns: Stage | Sessions | % of All Sessions | Drop to Next Step
- One callout naming the single largest drop and its rate.
- Express checkout caveat if depth-4 > depth-3.

**Cart & order profile** (checkout-entering sessions)
Columns: Segment | Orders | Median Order Value | Median Products in Cart
- Note if discounted orders are meaningfully larger or smaller than full-price.

**Payment methods** (completed orders only)
Columns: Payment Method | Orders | Median Order Value
- Survivorship caveat: abandoned sessions' payment method is not captured.

**Delivery methods** (completed orders only — online orders only)
Columns: Delivery Method | Orders | Median Order Value | Median Shipping Cost
- Exclude rows where median order value = $0 (in-store pickup / B2B / retail channels).
- Flag non-English method names with very high order values as likely local-currency anomalies.

---

### Section 3 — Checkout page errors

**Priority errors**
List each issue from Q5: humanId, title, error type.
If none: "No active priority errors detected on checkout pages."

---

### Section 4 — Evidence from deeper analysis *(one card per Phase 2 follow-up)*

For each Phase 2 query, a tight two-line card:
- **What the data showed:** specific numbers, one or two sentences max.
- **Supports:** reference the numbered action from Section 1 (e.g., "→ supports Action 2").

No raw data dumps. Cap tables at 8 rows.

---

## Data quality notes

- **Payment and delivery data reflects completed orders only.** Payment method
  and delivery method fields are only populated on sessions where checkout was
  completed. Never imply a payment method was rejected because of low volume —
  it may simply not have been selected by completers.
- **Express checkout inflates depth-4 vs depth-3.** Apple Pay, Shop Pay, and
  similar flows bypass the payment information page. Depth-4 exceeding depth-3
  is normal — always explain this rather than treating it as a data error.
- **Discount survivorship bias.** Only sessions that reach checkout can have a
  discount applied. The discount rate from Q2 is among checkout-entering sessions
  only.
- **Use the discount value recorded at checkout completion, not at checkout start.**
  Many shoppers apply discount codes after initiating checkout. The checkout-start
  discount fields significantly undercount discount usage — always use the
  completion-time discount value field.

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
Phase 1 queries earlier in this session — do not hardcode or guess field names.
The correct names will already be known from the successful queries above.

1. **Embed config at the top as JS constants:**
   ```js
   const DOMAIN_ID = "...";
   const START_TIME = "...";
   const END_TIME = "...";
   ```

2. **Section 1 (Key Findings & Recommended Actions) must be generated dynamically.**
   Do not hardcode the findings from the in-session report into the artifact HTML.
   Instead, after all live data has been fetched on page load, pass the results to
   `window.cowork.askClaude()` to derive the findings fresh each time. This ensures
   the key findings always reflect the current data, not a stale snapshot from when
   the report was first run.

3. **On page load**, call `window.cowork.callMcpTool()` for each of the five
   Phase 1 queries (funnel depth, cart/order baseline, payment mix, delivery mix,
   and priority errors), plus any Phase 2 queries that were run. Use the exact
   same field names and parameters that produced results during the analysis —
   copy them directly from the working queries above.

   **Critical implementation details:**
    - `callMcpTool()` requires the **fully-qualified** tool name. Use the exact
      tool names that were resolved and confirmed to work during the analysis
      session — do not hardcode or guess them.
    - Parse records from the wrapped response:
      ```js
      function records(res) {
        try {
          let obj = res;
          if (typeof res === "string") obj = JSON.parse(res);
          if (obj && obj.content) {
            const text = Array.isArray(obj.content)
              ? obj.content[0].text : obj.content;
            obj = typeof text === "string" ? JSON.parse(text) : text;
          }
          return obj.data.domain.explorationsQueryV2.records;
        } catch(e) { return []; }
      }
      ```
    - `window.cowork.askClaude()` returns a **response object**, not a plain string.
      Always unwrap it before inserting into the DOM:
      ```js
      function parseClaudeText(res) {
        if (!res) return '';
        if (typeof res === 'string') return res;
        if (Array.isArray(res.content) && res.content[0]?.text) return res.content[0].text;
        if (typeof res.content === 'string') return res.content;
        if (typeof res.text === 'string') return res.text;
        if (typeof res.message === 'string') return res.message;
        return '';
      }
      ```

4. **After all fetches resolve**, call `window.cowork.askClaude()` for callouts.
   Always store the result and pass it through `parseClaudeText()` before rendering.

5. **Render** using the same visual structure as the in-session report.

List all Noibu tool names used in the `mcp_tools` array of `create_artifact`.

---

**If they choose PDF:**

Before invoking the `pdf` skill, generate a print-optimized HTML version.
Web fonts do not load reliably in the PDF renderer.

Write the simplified HTML to a temp file, then pass it to the `pdf` skill.
