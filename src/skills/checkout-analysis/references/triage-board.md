# Rendering the triage board

The final deliverable of Full analysis, rendered in **one `show_widget`** (title `"checkout_board"`) after all queries (Steps 1–4) have run — a stack of cards in this order: the **Overview card** (with a 'Save as artifact' button), then the ranked **Priority cards**, then the **action bar** (Download report + Schedule insights).

**This is a triage board, not a write-up.** It surfaces the most impactful checkout signals, ranked by sessions affected, so the reader decides in ~15 seconds what to dig into. Each Priority card states the signal and its impact only — the *why* and *what-next* are produced on demand by an **Investigate** button (handled by the Investigate-click handler in SKILL.md), so the board stays scannable.

There is no Supporting-data expander — the Overview folds all the context in. Wrap the whole board in one outer `<div style="display:flex;flex-direction:column;gap:16px;padding:4px;">` with a visually-hidden `<h2>` summary first.

## Overview card *(always first — the context)*

One card with the same chrome as the Priority cards: a header strip with the label **Overview** on the left and `[domain] · [date range]` on the right, then a body holding the funnel, two stat lines, and the payment/delivery charts.

- **Context line** — `[total sessions] · [ATC%] added to cart`.
- **Funnel** — a vertical stepped funnel of the checkout stages: Added to cart → Started checkout → Payment submitted → Completed order. Step 1 (Added to cart) is the denominator; its headline is the absolute session count, the rest show **% of cart**. Flag the largest *reliable* step drop with a danger pill (`↓N%`) on that step's header.
  - **Bar scaling — the bar and its connector MUST use the same fraction, or the slope won't meet the bars.** For each step compute one fraction `f = sqrt(stepCount ÷ step1Count)` (so `f₁ = 1`). Then, with `bodyHeight = 150`:
    - Bar height = `round(f × 150)` px.
    - Bar top, measured from the top of the body = `T = round((1 − f) × 100)` %.
    - Connector for step *i* (right half of column *i*, none on the last column): `clip-path: polygon(0% Tᵢ%, 100% Tᵢ₊₁%, 100% 100%, 0% 100%)` — left edge at this bar's top, right edge at the next bar's top.
  - **Worked example** (cart=22,866 → checkout=42.4% → payment=23.9% → completed=22.9%):

    | Step | f = √(pct) | height px | T = (1−f)×100 |
    |---|---|---|---|
    | Added to cart | 1.00 | 150 | 0 |
    | Started checkout | 0.65 | 98 | 35 |
    | Payment submitted | 0.49 | 73 | 51 |
    | Completed order | 0.48 | 72 | 52 |

    Connectors: col1 `polygon(0% 0%,100% 35%,…)`, col2 `polygon(0% 35%,100% 51%,…)`, col3 `polygon(0% 51%,100% 52%,…)`. Same `T` values feed both the bar top and the connector endpoints.
  - **Hover tooltip** per step: `[sessions] · [% of cart] · [N] lost from previous step` (step 1: `[sessions] · base of checkout funnel`).
  - **Principle 2:** if intermediate steps are uninstrumented (near-zero while completions are healthy), show only the instrumented steps (e.g. Added to cart → Completed) rather than rendering misleading drops.
- **Stat line 1 — funnel health:** Checkout completion `54%` (depth-4 ÷ depth-2+; if intermediate steps are uninstrumented, use cart → order, depth-4 ÷ depth-1+, and relabel) · Mobile / Desktop conversion · Checkout errors `N`.
- **Stat line 2 — order profile:** Median order `$X` · Discounted `N%` · Items / order `N`. Principle 1: include only the populated metrics; drop the whole line if none are.
- **Payment & delivery** — a two-column row of small horizontal bar charts (method name · bar by share · order count), completed-orders only, built from the Q3/Q4 results. **If Q3 or Q4 returned any rows, you must render that chart** — reuse the Step 1 results; don't drop it for length or re-decide whether it's "worth showing." Only omit a chart whose query came back genuinely empty, and omit the whole row only if *both* are empty. Caption: "Payment & delivery: completed orders only · shown when populated".

**Overview card template** (fill the bar heights, connector clip-paths, tooltips, and stat values from the data):

```html
<style>
.cf-col{position:relative;flex:1;min-width:0;}
.cf-body{position:relative;height:150px;margin-top:14px;cursor:help;}
.cf-tip{position:absolute;bottom:calc(100% + 8px);left:0;background:var(--color-text-primary);color:var(--color-background-primary);font-size:11px;line-height:1.45;padding:6px 9px;border-radius:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:50;white-space:nowrap;}
.cf-tip-r{left:auto;right:0;}
.cf-body:hover .cf-tip{opacity:1;}
.cf-div{position:absolute;top:0;right:0;width:0.5px;height:100%;background:var(--color-border-tertiary);}
</style>

<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;">
  <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">Overview</span>
    <span style="font-size:11px;color:var(--color-text-tertiary);">[domain] · [date range]</span>
  </div>
  <div style="background:var(--color-background-primary);padding:18px 20px;">
    <p style="font-size:12px;color:var(--color-text-secondary);margin:0 0 16px;">[total sessions] · [ATC%] added to cart</p>

    <div style="display:flex;">
      [Repeat per funnel step. cf-div on every column except the last. First column header pad 0 16px 0 0, middle columns 0 16px, last column 0 0 0 16px. Step 1 headline = count; steps 2+ = "% of cart". Put the danger pill on the biggest-drop step only. Bar height = sqrt(step÷step1)×150 px; connector clip-path per the scaling note; the last column has no connector.]
      <div class="cf-col"><div class="cf-div"></div>
        <div style="padding:0 16px 0 0;">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.4px;color:var(--color-text-secondary);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">[Stage]</div>
          <div style="font-size:16px;font-weight:500;color:var(--color-text-primary);margin-top:2px;">[value]</div>
        </div>
        <div class="cf-body">
          <div class="cf-tip">[tooltip]</div>
          <div style="position:absolute;left:0;width:50%;bottom:0;height:150px;background:var(--color-background-tertiary);border-radius:4px 4px 0 0;"></div>
          <div style="position:absolute;left:0;width:50%;bottom:0;height:[barPx]px;background:var(--color-text-primary);border-radius:4px 4px 0 0;"></div>
          <div style="position:absolute;right:0;width:50%;bottom:0;height:150px;background:var(--color-background-tertiary);clip-path:polygon(0% [thisTop]%,100% [nextTop]%,100% 100%,0% 100%);"></div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:0.5px solid var(--color-border-tertiary);font-size:12px;color:var(--color-text-secondary);">
      <span>Checkout completion <span style="color:var(--color-text-primary);font-weight:500;">[X%]</span> <span style="color:[▼ var(--color-text-danger) / ▲ var(--color-text-success), omit if flat or no prior];">[▲/▼ N pp vs prior]</span></span>
      <span>Mobile <span style="color:var(--color-text-primary);font-weight:500;">[X%]</span> / Desktop <span style="color:var(--color-text-primary);font-weight:500;">[X%]</span></span>
      <span>Checkout errors <span style="color:var(--color-text-primary);font-weight:500;">[N]</span></span>
    </div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--color-text-secondary);">
      <span>Median order <span style="color:var(--color-text-primary);font-weight:500;">[$X]</span></span>
      <span>Discounted <span style="color:var(--color-text-primary);font-weight:500;">[N%]</span></span>
      <span>Items / order <span style="color:var(--color-text-primary);font-weight:500;">[N]</span></span>
    </div>

    [Payment & delivery row — render whenever Q3/Q4 returned rows (reuse Step 1 results); omit a side only if its query was empty, and the whole row only if both were:]
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:18px;padding-top:16px;border-top:0.5px solid var(--color-border-tertiary);">
      <div>
        <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Payment methods</p>
        [Per method, bar width = share of the largest method:]
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span style="font-size:12px;color:var(--color-text-secondary);width:78px;flex-shrink:0;">[Method]</span><div style="flex:1;height:14px;background:var(--color-background-tertiary);border-radius:3px;overflow:hidden;"><div style="width:[N]%;height:100%;background:var(--color-text-secondary);"></div></div><span style="font-size:12px;color:var(--color-text-primary);width:38px;text-align:right;">[count]</span></div>
      </div>
      <div>
        <p style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Delivery methods</p>
        [Same row markup per delivery method.]
      </div>
    </div>
    <p style="font-size:11px;color:var(--color-text-tertiary);margin:12px 0 0;">Payment &amp; delivery: completed orders only · shown when populated</p>

    <div style="display:flex;justify-content:flex-end;padding-top:14px;margin-top:14px;border-top:0.5px solid var(--color-border-tertiary);">
      <button onclick="sendPrompt('Save checkout overview as dashboard for [domain]')" style="padding:5px 12px;font-size:12px;font-weight:500;color:var(--color-text-tertiary);background:none;border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Save as artifact</button>
    </div>
  </div>
</div>
```

The 'Save as artifact' button builds a persistent, self-refreshing artifact of the Overview (see `references/live-dashboard.md`, handled by SKILL.md's "Create live dashboard").

## Priority cards *(the deliverable)*

Up to 3 prioritized signals, **ranked by sessions affected, descending.** Cap at 3; if more exist, add a muted line: "N more signals — ask to see them."

Field → template slot:

- **Header label** — "Priority [N]" (rank, 1 = most sessions affected), top-left of the header strip.
- **Impact chip** — "~N sessions affected", top-right. The ranking key; compute via the mapping below.
- **Title** — the signal headline. Change-based card: name the metric *and* that it moved (e.g. "Checkout completion fell on mobile"), not the absolute level. Qualified-error card: a plain-English description of the error.
- **Finding** — one line. Change-based: the segment + current value + the move vs the prior window (e.g. "Mobile completion dropped to 1.4% from 1.9% — −0.5 pp / −26% vs the prior 30 days"). Error: occurrences + last seen + where it fires. Just enough to judge whether to dig in; no cause hypothesis, no recommended action.
- **Investigate button** — `sendPrompt(...)` naming this signal and asking for the why + what-next. (`sendPrompt` is a global Cowork injects into the `show_widget` context, not a standard browser API. If Cowork moves it, e.g. `window.cowork.sendPrompt`, update every call site below.)
- **Ignore link (error cards only)** — a secondary link beside Investigate, **only on Q5 error cards** (they're Noibu issues with a status; funnel/device/market cards have none). `sendPrompt('Ignore issue #[humanId] on [domain]')` → routes to SKILL.md's "Ignore issue" handler, which sets the issue to Ignored via `noibu_update_issue`. Omit the link entirely if `noibu_update_issue` isn't available.

**Card template — repeat once per signal, ranked descending, after the Overview card inside the single outer div:**

```html
  <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;">
    <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">Priority [N]</span>
      <span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;background:var(--color-background-tertiary);color:var(--color-text-secondary);">~[N] sessions affected</span>
    </div>
    <div style="background:var(--color-background-primary);padding:20px;">
      <p style="font-size:15px;font-weight:500;margin:0 0 8px;color:var(--color-text-primary);">[Title — the signal headline]</p>
      <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0 0 16px;">[Finding — the step/device/method/market/page + the one number + why it matters]</p>
      <button onclick="sendPrompt(&quot;Investigate this checkout signal: [Title] — [segment, the number, funnel step in one sentence]. Dig into why it's happening and what to do next.&quot;)" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Investigate ↗</button>
    </div>
  </div>
```

**Error cards** add a secondary Ignore link beside Investigate (only if `noibu_update_issue` is available) — replace the single button with:

```html
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="sendPrompt(&quot;Investigate this checkout signal: [Title] — [error, occurrences, where]. Dig into why it's happening and what to do next.&quot;)" style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">Investigate ↗</button>
        <button onclick="sendPrompt('Ignore issue #[humanId] on [domain]')" style="padding:6px 12px;font-size:13px;font-weight:500;color:var(--color-text-tertiary);background:none;border:none;cursor:pointer;">Ignore issue</button>
      </div>
```

Keep the impact chip neutral (background-tertiary / text-secondary) — sessions affected is a magnitude, not a good/bad signal, so never red or green.

When the Investigate button is clicked, it sends a new prompt — see the **Investigate click** handler in SKILL.md. It reuses the breakdown already gathered for that signal and goes one level deeper; it does not re-run the query that built the card.

**Sessions-affected mapping** (computes the impact chip and the rank). For change-based cards it's the **incremental** sessions lost to the regression — `(prior rate − current rate) × current volume at that stage` — not the absolute volume at the step:

| Finding type | Sessions affected = |
|---|---|
| Funnel-step regression | (prior step rate − current) × sessions reaching the prior stage |
| Device regression | (prior device CVR − current) × that device's sessions |
| Market regression | (prior market CVR − current) × that market's sessions |
| Payment-method regression | (prior method completion − current) × that method's submitted sessions |
| Cart-exit regression | extra ATC sessions not reaching checkout vs prior |
| Qualified active error | session impact count from the errors tool |

Rules:

- Order strictly by sessions affected, not by how obvious the signal is.
- **Change-based cards must be a regression vs the prior window** — never flag a metric for its absolute level or a gap vs another segment / the site average. The *only* non-regression card is a qualified active error (Q5).
- **Markets are relative** — a chronically-low or 0% market that didn't change is not a card.
- **No discount-value card** unless the discount rate or discounted conversion regressed.
- Every card names a specific funnel step, device, payment method, market, or error; no dollar figures (sessions affected is the only impact metric).
- Principle 1: never create a card about missing data or coverage. If nothing regressed and no error qualifies, render the "No priorities" card below instead of padding with weak signals.

## No priorities (empty state)

When no regression clears the threshold and no error qualifies, render a single card in place of the priority cards (between the Overview and the action bar). State *why* in one line — no padding, no apology.

```html
  <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;">
    <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);">
      <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">No priorities</span>
    </div>
    <div style="background:var(--color-background-primary);padding:20px;">
      <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin:0;">No checkout regressions vs the prior [window] and no active fixable errors — checkout is holding steady. The Overview above shows the current state.</p>
    </div>
  </div>
```

If the reason is instead that there's **no prior window to compare** (sparse history), say that: "No prior [window] to compare against, so no change-based signals this run — the Overview shows the current state." The action bar still renders below.

## Action bar

The last card in the board, after all Priority cards (in the same `"checkout_board"` widget). A card with the same chrome as the others, holding two buttons. Download report is secondary (outlined); Schedule insights is the primary action (filled dark). The Schedule button label depends on the `list_scheduled_tasks` result from setup: **Schedule insights** if no task references this domain, **Edit scheduled insights** if one does.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;">
  <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);">
    <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">Download &amp; schedule</span>
  </div>
  <div style="background:var(--color-background-primary);padding:16px 20px;display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="sendPrompt('Export checkout analysis as PDF for [domain]')"
      style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:6px;cursor:pointer;">
      Download report
    </button>
    <button onclick="sendPrompt('Schedule checkout analysis for [domain]')"
      style="padding:6px 14px;font-size:13px;font-weight:500;color:var(--color-background-primary);background:var(--color-text-primary);border:0.5px solid var(--color-text-primary);border-radius:6px;cursor:pointer;">
      [Schedule insights — OR — Edit scheduled insights if a task already exists]
    </button>
  </div>
</div>
```

(If a task already exists, the Schedule button's `sendPrompt` should read `'Edit schedule for [domain]'`.) The buttons route to SKILL.md's "Export PDF" and "Schedule report" handlers. Don't recap the findings after the board — just the single short closing line SKILL.md calls for (so the turn has visible text); the action bar carries the next steps.
