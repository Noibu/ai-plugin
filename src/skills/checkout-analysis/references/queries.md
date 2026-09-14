# Checkout query specs

The query definitions for every path. Quick answer runs one or two of these; Full analysis runs the whole battery (Step 1 → 4); an Investigate click reuses a Step 4 breakdown and goes deeper. Principles 1 and 2, the Setup notes, and the Session-tool capabilities live in SKILL.md and apply throughout.

## Signal model — what earns a priority card

Absolute levels are misleading in checkout: a high cart→checkout drop and mobile converting below desktop (or vice-versa) are normal. So the board flags **change, not level**:

- **Change-based signals (most of them)** — funnel step drops, device conversion, market/country conversion, discount patterns. Flagged **only when the metric regressed vs the prior comparable window** — never because the absolute level looks bad or differs from another segment or the site average.
- **Qualified active errors (the one absolute trigger)** — a checkout error earns a card when it's active *and* genuinely fixable (see Q5), regardless of trend. Everything else must be a regression.

### The comparison window

The **prior comparable window** is the equal-length window immediately before the current one (last 30 days → the 30 days before that). All change-based signals compare against it.

- **A regression worth flagging** = the rate dropped by **≥ 3 pp absolute or ≥ 10% relative** vs prior, **and** the segment clears the volume threshold (Step 4). Keep the current absolute numbers for context/labels, but the *trigger* is the drop vs prior.
- **No / low-volume prior window** (new store, sparse history): change-based signals can't be computed — say so briefly and lean on the qualified error cards + the Overview. **Do not** fall back to absolute-level flags (that's the false-positive trap we're avoiding).
- **Seasonality caveat:** the prior window is calendar-adjacent, so a window spanning a seasonal shift (e.g. a sale period) can move rates for benign reasons — note it when relevant.

## Step 1 — Broad overview (current + prior windows)

- First tell the user what you're doing, e.g. "Starting with a broad look across your checkout, comparing the last 30 days to the prior 30."
- Fire the **current-window** battery (Q1–Q7, plus Q1b when its fields are available) and, in parallel, the **prior-window** counterparts for the change-detection metrics (Q1, Q1b, Q2, Q6, Q7). Q3/Q4 (payment/delivery, descriptive) and Q5 (errors, recency-based) need no prior copy.
- **No minimum session thresholds at this stage.** Principle 1: skip any empty/null slice silently.

**Q1 — Full funnel by depth** (current + prior). Session tool, group by funnel depth, measure session count, order by sessions desc.

- One row per depth: 0/null = no action, 1 = ATC, 2 = checkout started, 3 = payment submitted, 4 = completed. Compute drop-off in post-processing.
- If depth group-by is unavailable: one all-sessions query measuring total sessions, per-stage event counts, and the predefined conversion rate — those intermediate counts are event proxies, so lean on total → completed.
- If intermediate buckets are near-zero while completions are healthy → Principle 2.
- **Express checkout inflates depth-4 vs depth-3.** Apple Pay, Shop Pay, etc. bypass the payment-info page, so depth-4 > depth-3 is normal — explain it, don't treat it as an error.

**Q1b — Checkout sub-step abandonment** (current + prior). Run this unconditionally, same as Q1 — the fields below (contact / address / shipping / payment submission counts, cart value, visual-error flag, exit URL) are standard session-table fields on every account, not an account-specific extension, so don't gate this query on confirming they "exist" first. What varies by platform/integration is whether they're *populated* — apply Principle 1 to the **results**, not to whether to run the query.

Session tool, filter to funnel depth ≥ 2 (checkout-entered sessions only — cart-only sessions are out of scope here), row-level (one row per session, not grouped), selecting: the checkout sub-step submission-count fields (contact / address / shipping / payment), `MAX_CART_VALUE` (alias `cart_value`), the visual-error flag, and the exit-URL field.

- Exclude completed sessions — this query only classifies *abandoned* checkout sessions.
- Classify each remaining session into exactly one bucket by the furthest step reached, first match wins:
  1. **Attempted payment, didn't complete** — payment submitted ≥ 1 but not completed.
  2. **Experienced technical issues** — the session's visual-error flag is set.
  3. **Dropped at payment step** — reached shipping/address (≥ 1) but zero payment submissions.
  4. **Dropped after adding contact info** — contact submitted ≥ 1, nothing further.
  5. **Left checkout without any action** — checkout started, zero sub-steps submitted.
  6. **Left checkout to keep browsing** — zero progress, and the exit page is a product/collection page rather than checkout.
- Per bucket, sum session count and `cart_value` (sum of `MAX_CART_VALUE`).
- **After running the query**, apply Principle 1 to what came back: if every bucket is zero/null, this data genuinely isn't populated for this account — omit the table entirely, no placeholder. If only some buckets have real counts (e.g. sub-step counts are populated but the visual-error flag never fires), show the populated buckets and drop the zero ones — don't require every bucket before showing any.
- Feeds the Overview's "Top source of abandonment" table (buckets ranked by session count, capped at 5) and, per bucket, the regression check in Step 3.

**Q2 — Cart & order value baseline** (current + prior). Session tool, filter to funnel depth ≥ 2, group by discount-applied, measure session count + median completed order value + median product quantity, order by sessions desc.

- Depth ≥ 2 avoids null discounts on pre-checkout sessions. Gives discount rate among checkout-entering sessions and whether discounted orders differ in size.
- **Use the completion-time discount value, not checkout-start.** Checkout-start discount fields significantly undercount usage.
- **Discount survivorship bias.** Only checkout-reaching sessions can have a discount, so this discount rate is among checkout-entering sessions only.

**Q3 — Payment method mix** (current only). *Only if a payment-method dimension exists (see Session tool note).* Filter to completed checkouts, group by payment method names (array join, limit 20), measure session count + median completed order value, order by sessions desc. If unavailable, skip (Principle 1).

- **Completed-orders only (applies to Q4 too).** Payment and delivery fields populate only on completed sessions — never imply a method was rejected because of low volume; it may just not have been chosen by completers.

**Q4 — Delivery method mix** (current only). *Only if a delivery/shipping dimension exists.* Filter to completed checkouts, group by delivery method names (array join, limit 20), measure session count + median completed order value + median shipping cost, order by sessions desc. If unavailable, skip (Principle 1).

**Q5 — Active fixable checkout errors.** Priority errors tool, priority-type issues on URLs containing "checkout". Then **qualify** each candidate — surface only the genuinely fixable ones (this mirrors tech-diagnosis's "fixable" bucket). Fetch stack trace + error-type detail for the top candidates by occurrence, and keep an error only if **all** hold:

- **Active** — last seen within **48 hours** (drop anything older, even if still flagged priority).
- **Has a stack trace** — no stack trace → skip (no path to a fix).
- **Not a 4XX HTTP type** — any 4XX is platform-class; skip (the HTTP type overrides frame analysis).
- **Not pure third-party** — if every frame is a third-party domain, the merchant can't action it → skip; keep only errors with merchant-owned (first-party) frames.
- **Not a script error, even if first-party** — exclude script-origin errors (third-party tags/pixels/widgets and opaque cross-origin "Script error.") regardless of frame ownership.

What remains = active, fixable checkout errors. These earn priority cards (with Investigate + Ignore) regardless of trend. If none qualify, there's no error card — that's fine.

**Q6 — Device conversion split** (current + prior). Session tool, group by device, measure session count + conversion rate, order by sessions desc. Feeds the Overview Mobile/Desktop stat and the device regression check.

**Q7 — Country conversion split** (current + prior). Session tool, group by country code (limit 25), measure session count + conversion rate, order by sessions desc. Feeds the market regression check.

## Step 2 — Cross-reference + period-over-period

Compute current rates **and the change vs the prior window**, for metrics whose inputs are populated (Principle 1). depth-N = sessions reaching at least that stage.

**Current rates (from Q1):**

- ATC rate = depth-1+ ÷ total · Checkout start = depth-2+ ÷ total · Checkout → payment = depth-3+ ÷ depth-2+ · Payment → completion = depth-4 ÷ depth-3+ · Overall completion = depth-4 ÷ depth-2+ (or the predefined conversion rate).
- If intermediate events are uninstrumented (Principle 2), use cart → order (depth-4 ÷ depth-1+). depth-4 > depth-3 is expected (express checkout — see the Q1 note).

**Period-over-period deltas** (current − prior), for each populated metric: every funnel step rate, overall completion, each device's CVR (Q6), each market's CVR (Q7), the discount rate and discounted-vs-full conversion (Q2). A metric is a **candidate signal** only if its delta is a regression past the threshold above.

**Cart profile (from Q2):** discount rate, median order value (discounted vs full-price), median products per order — context only; not a signal unless the discount rate or discounted conversion regressed.

## Step 3 — Pick signals (change-based, top 3)

From the Step 2 deltas, pick the top 3 **regressions** by sessions affected (fewer is fine). A normal-but-stable level is **not** a signal — only a drop vs the prior window is.

| If a metric regressed vs the prior window… | Consider this follow-up |
|---|---|
| Overall checkout completion fell | Device split (Q6 current vs prior) to locate the new friction; cart-exit journeys if the cart→checkout step drove it |
| Checkout → payment or payment → completion fell | Device or payment-method breakdown — find where the new drop concentrates |
| A device's conversion fell vs its own prior | That device's funnel — isolate the step that moved |
| A market's conversion fell vs its own prior | Country cross-tab — shipping/payment/localization change |
| Discount rate or discounted conversion moved materially | Promo mix — did a campaign change the picture |
| A checkout sub-step abandonment bucket (Q1b) grew, proportionally, vs its own prior share | That bucket's example sessions — Investigate goes one level deeper the same way it does for any other card |

- **Markets are relative.** Flag a country only when its conversion *regressed* vs its prior. A chronically-low or chronically-0% market that didn't change is **not** a signal (it's likely a market they don't serve). A market with no prior baseline can't be assessed — don't flag it.
- **Sub-step buckets are relative too, same as markets.** Flag a Q1b bucket only when its share of abandoned sessions regressed vs its own prior window — a chronically large "dropped at payment step" bucket that hasn't changed is not a signal.
- **Discount-value gap is benign.** "Discounted orders complete at a lower value" is normal coupon behaviour — never a standalone card. Only surface discounts if the rate or discounted conversion regressed.
- **The only non-regression card is a qualified active error** (Q5).

## Step 4 — Deeper follow-ups (confirming a regression / Investigate)

Device and country baselines are already in Step 1; these go deeper on a flagged regression or when an Investigate click needs more.

**Traffic thresholds, calibrated to store volume** (also gate which regressions are worth flagging):

- High (>500K sessions/mo): segment ≥ ~0.1–0.2% of total · Mid (50K–500K): ~0.3–0.5% · Low (<50K): keep very low or skip.

- **Device funnel breakdown** — filter to depth ≥ 1 (or ≥ 2 when checkout-start is reliable), group by device, measure session + completion (+ intermediate where populated). Find the step where the regression concentrates.
- **Country cross-tab** — for a market whose CVR regressed, break the funnel down to see whether it's a shipping/payment block vs a UX change.
- **Payment method completion** — when payment → completion regressed and payment data is populated: depth ≥ 3, group by payment method, completion per method.
- **Cart-page exit journeys** — when cart → checkout regressed: user journeys tool anchored to `/cart`, loose mode, forward paths only, max depth 5. Forward-nav back to product = purchase uncertainty; exits to external URLs = distraction/price comparison.
- **Error detail** — Q5 already qualified the fixable errors; deeper root-cause and the fix route through the tech-diagnosis handoff (see SKILL.md Investigate click).
