---
name: find-opportunities
description: Surface and prioritize the top revenue opportunities in your store using Noibu data. Use when you want to know where your store is losing revenue, what traffic sources or pages are underperforming, what's working well, or where to focus to grow conversion — across acquisition, funnel, experience, or product.
argument-hint: "<area: acquisition | funnel | experience | product>"
---

# Find Opportunities

Surface a ranked list of high-confidence revenue opportunities using Noibu behavioral data. The only message before output is the one specified in Step 1.

---

## Step 1 — Establish scope

- First, send this message immediately before doing anything else: "Searching your store data for meaningful revenue opportunities — this may take a moment."
- If area already specified (e.g. `/find-opportunities for acquisition`), go to Step 2
- Otherwise ask a first question using `AskUserQuestion`:
```json
{
  "questions": [
    {
      "question": "Where would you like to focus?",
      "header": "Scope",
      "multiSelect": false,
      "options": [
        { "label": "Scan entire store", "description": "" },
        { "label": "Choose a focused area", "description": "" }
      ]
    }
  ]
}
```
- If they pick "Entire business", run all four areas and go to Step 2
- If they pick "Choose a focused area", ask a second `AskUserQuestion`:
```json
{
  "questions": [
    {
      "question": "Which area would you like to focus on?",
      "header": "Area",
      "multiSelect": false,
      "options": [
        { "label": "Traffic sources and ad spend", "description": "" },
        { "label": "Drop-offs and paths to purchase", "description": "" },
        { "label": "Page and template performance", "description": "" },
        { "label": "Product and category conversions", "description": "" }
      ]
    }
  ]
}
```
- Map selections to areas: "Traffic sources and ad spend" = Acquisition, "Drop-offs and paths to purchase" = Funnel, "Page and template performance" = Experience, "Product and category conversions" = Product

---

## Step 2 — Collect data

- Window: 7 days for the initial scan
- Run only the calls for the selected area, in parallel:

| Area | Calls |
|---|---|
| Acquisition | `noibu_search_sessions` grouped by campaign tracking parameters (UTM source and medium) |
| Funnel | `noibu_search_sessions` grouped by device |
| Experience | `noibu_get_page_visits` grouped by URL pattern or page type |
| Product | `noibu_get_page_visits` grouped by URL pattern or page type, filtered to product pages |
| All / Everything | All three calls above simultaneously |

- If calls fail due to connectivity: call `suggest_connectors` with query `"Noibu"` and stop

---

## Step 3 — Identify opportunities

- Target: 3 opportunities
- Only surface signals where the gap is material, segment meets the percentage threshold below, and finding is actionable
- Do not hypothesize causes — that happens in investigation
- Every area in scope must produce a card or an explicit note that nothing qualified

**Thresholds:**
- Underperforming: revenue per session 15%+ below baseline, segment is ≥1% of total sessions in window
- Emerging Star: top-quartile revenue per session in peer group AND below-median traffic share, segment is ≥1% of total sessions in window
- Experience/Product: page type is ≥0.5% of total page visits in window

**Baselines** (use the most specific available, name it in the card):
- Peer group (same page type, channel, device) — preferred
- Site average — fallback for Acquisition and Funnel
- Device benchmark or historical period — for regressions

**Caveats** (attach to the card's impact, not separately):
- Segment below 1% of total sessions: "directional — low volume"
- Missing campaign tracking parameters: "impact may be understated"
- No transaction data: "estimate uses conversion rate x average order value"
- Third-party not connected (Meta, Google, Klaviyo): note analysis is Noibu-only

**Trend direction** — once the top 3 opportunities are identified, pull a 14-day window for those segments only and compare week 1 (days 1-7) vs week 2 (days 8-14):
- Worse than last week: gap widening in week 2
- Better than last week: gap narrowing in week 2
- Same as last week: within ~10% relative change
- Worse than last week ranks higher than Same as last week, all else equal

---

## Step 4 — Calculate revenue impact

- Gap: `(Baseline revenue per session - Segment revenue per session) x segment sessions x 2.17` = monthly impact (2.17 = 30.4 avg days/month ÷ 14-day window, scaling the trend period to a monthly estimate)
- Underleveraged: `Segment revenue per session x estimated incremental sessions` — state the growth assumption explicitly, use conservative multiplier
- Always name the baseline (site average, peer group, device benchmark)
- Express as a monthly range rounded to nearest $500
- For paid channels: note if return on ad spend data is unavailable

---

## Step 5 — Present opportunities

- Rank by monthly impact, show top 3
- No site metrics, funnel stats, or ad data — cards only
- No area/type labels in output (internal reasoning only)
- Use `show_widget` with `title: "opportunities"` and 1-2 loading messages

**Trend badge styles — inline CSS only:**
- Worse than last week: `background: #FCEBEB; color: #A32D2D`
- Better than last week: `background: #EAF3DE; color: #3B6D11`
- Same as last week: `background: var(--color-background-secondary); color: var(--color-text-secondary); border: 0.5px solid var(--color-border-tertiary)`

**Note on `sendPrompt`.** The "Investigate" button on each card and the "Schedule digest" / "Skip" buttons in the scheduling form (Step 6) all call `sendPrompt(text)` — a global function Cowork injects into the widget execution context when HTML is rendered through `show_widget`. It is **not a standard browser API**. If Cowork moves this to a different namespace (e.g. `window.cowork.sendPrompt`), every `sendPrompt(...)` call site in both templates below needs to be updated.

**Card template — repeat once per opportunity inside a single outer div:**

```html
<div style="display: flex; flex-direction: column; gap: 16px; padding: 4px;">

  <div>
    <div style="border: 0.5px solid var(--color-border-tertiary); border-radius: 8px; overflow: hidden;">
      <div style="background: var(--color-background-secondary); padding: 8px 20px; border-bottom: 0.5px solid var(--color-border-tertiary); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.06em;">Opportunity 1</span>
        <span style="font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; [TREND_BADGE_STYLE]">[Worse than last week | Better than last week | Same as last week]</span>
      </div>
      <div style="background: var(--color-background-primary); padding: 20px;">
        <p style="font-size: 15px; font-weight: 500; margin: 0 0 10px; color: var(--color-text-primary);">[Title]</p>
        <p style="font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin: 0 0 16px;">[2-3 sentences: what the gap is, how big vs baseline, what the trend means. No cause hypotheses.]</p>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0 0 16px;">Estimated revenue: <span style="font-weight: 500; color: var(--color-text-primary);">~$X-$Y/month</span></p>
        <button onclick="sendPrompt(&quot;Look into this opportunity: [Title] - [segment, gap size, trend in one sentence]. What should we look at first?&quot;)" style="padding: 6px 14px; font-size: 13px; font-weight: 500; color: var(--color-text-primary); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 6px; cursor: pointer;">Investigate</button>
      </div>
    </div>
    [Only if caveat exists for this card:]
    <p style="font-size: 12px; color: var(--color-text-tertiary); margin: 6px 4px 0; line-height: 1.5;">1 [Caveat text]</p>
  </div>

</div>
```

After `show_widget`, add a brief conversational summary: top-ranked opportunity and why, any cross-cutting pattern. One sentence per area that had no qualifying opportunity.

---

## Step 6 — Scheduling offer

- Call `list_scheduled_tasks` — if a task already exists that is specifically an opportunities digest, skip this step. Ignore unrelated scheduled tasks (e.g. Store Pulse, other digests) — those should not prevent the scheduling offer from appearing
- Otherwise ask: "Want me to run this automatically? I can send a digest on whatever schedule works for you — email, Slack, or both — so you're not waiting to run this every time."
- If the user says yes, use `show_widget` with `title: "schedule_opportunities"` to render the scheduling UI below
- Pre-select coverage chips based on what the user ran: if they ran a specific area, pre-select only that chip; if they ran all four, pre-select all four
- When the user clicks "Schedule digest", a `sendPrompt` message will fire with their selections — parse the scope, frequency, day, time, and delivery channel
- Before calling `create_scheduled_task`, ask for any missing delivery details:
    - If email is selected: ask which email address(es) to send to
    - If Slack is selected: ask which channel to post to
    - If both: ask for both in a single message
- Once delivery details are confirmed, call `create_scheduled_task` and confirm when set up
- When the user clicks "Skip", acknowledge and move on
- If the user says no, move on without showing the widget
- To change existing: use `update_scheduled_task` directly

```html
<style>
.chip{padding:6px 14px;font-size:13px;font-weight:500;border-radius:100px;cursor:pointer;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.chip.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard{padding:14px 10px;font-size:13px;font-weight:500;text-align:center;border-radius:var(--border-radius-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.fcard.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard i{font-size:18px;}
.slabel{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;}
</style>

<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:24px;">

  <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:0 0 24px;">Schedule opportunities</p>

  <p class="slabel">Coverage</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
    <button class="chip [on if acquisition was run]" onclick="toggleChip(this)" data-value="acquisition">Traffic sources and ad spend</button>
    <button class="chip [on if funnel was run]" onclick="toggleChip(this)" data-value="funnel">Drop-offs and paths to purchase</button>
    <button class="chip [on if experience was run]" onclick="toggleChip(this)" data-value="experience">Page and template performance</button>
    <button class="chip [on if product was run]" onclick="toggleChip(this)" data-value="product">Product and category conversions</button>
  </div>

  <p class="slabel">Frequency</p>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px;" id="freq-wrap">
    <button class="fcard" onclick="selectFreq(this)" data-value="daily"><i class="ti ti-sun" aria-hidden="true"></i>Daily</button>
    <button class="fcard on" onclick="selectFreq(this)" data-value="weekly"><i class="ti ti-calendar" aria-hidden="true"></i>Weekly</button>
    <button class="fcard" onclick="selectFreq(this)" data-value="biweekly"><i class="ti ti-calendar-stats" aria-hidden="true"></i>Bi-weekly</button>
    <button class="fcard" onclick="selectFreq(this)" data-value="monthly"><i class="ti ti-calendar-month" aria-hidden="true"></i>Monthly</button>
  </div>

  <div id="day-section" style="margin-bottom:24px;">
    <p class="slabel">Day</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="chip on" onclick="selectDay(this)" data-value="Monday">Mon</button>
      <button class="chip" onclick="selectDay(this)" data-value="Tuesday">Tue</button>
      <button class="chip" onclick="selectDay(this)" data-value="Wednesday">Wed</button>
      <button class="chip" onclick="selectDay(this)" data-value="Thursday">Thu</button>
      <button class="chip" onclick="selectDay(this)" data-value="Friday">Fri</button>
      <button class="chip" onclick="selectDay(this)" data-value="Saturday">Sat</button>
      <button class="chip" onclick="selectDay(this)" data-value="Sunday">Sun</button>
    </div>
  </div>

  <div id="freq-hint" style="display:none;margin-bottom:24px;">
    <p id="freq-hint-text" style="font-size:13px;color:var(--color-text-secondary);margin:0;padding:10px 14px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);"></p>
  </div>

  <div id="time-section" style="margin-bottom:24px;">
    <p class="slabel">Time</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="chip" onclick="selectTime(this)" data-value="7:00 AM">7 am</button>
      <button class="chip on" onclick="selectTime(this)" data-value="9:00 AM">9 am</button>
      <button class="chip" onclick="selectTime(this)" data-value="12:00 PM">12 pm</button>
      <button class="chip" onclick="selectTime(this)" data-value="5:00 PM">5 pm</button>
      <button class="chip" onclick="selectTime(this)" data-value="8:00 PM">8 pm</button>
    </div>
  </div>

  <p class="slabel">Delivery</p>
  <div style="display:flex;gap:8px;margin-bottom:28px;">
    <button class="chip" onclick="toggleChip(this)" data-value="email"><i class="ti ti-mail" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Email</button>
    <button class="chip" onclick="toggleChip(this)" data-value="slack"><i class="ti ti-brand-slack" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Slack</button>
  </div>

  <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;border-top:0.5px solid var(--color-border-tertiary);padding-top:16px;">
    <button onclick="sendPrompt('Skip scheduling for now')" style="padding:7px 16px;font-size:13px;font-weight:500;color:var(--color-text-secondary);background:transparent;border:none;cursor:pointer;">Skip</button>
    <button onclick="submitSchedule()" style="padding:7px 20px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;">Schedule digest</button>
  </div>

</div>

<script>
function toggleChip(el){el.classList.toggle('on');}
function selectDay(el){document.querySelectorAll('#day-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectTime(el){document.querySelectorAll('#time-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectFreq(el){
  document.querySelectorAll('#freq-wrap .fcard').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  const v=el.dataset.value;
  const ds=document.getElementById('day-section');
  const hint=document.getElementById('freq-hint');
  const ht=document.getElementById('freq-hint-text');
  if(v==='weekly'||v==='biweekly'){ds.style.display='block';hint.style.display='none';}
  else if(v==='daily'){ds.style.display='none';ht.textContent='Delivered every day';hint.style.display='block';}
  else{ds.style.display='none';ht.textContent='Delivered on the first day of each month';hint.style.display='block';}
}
function submitSchedule(){
  const coverage=[...document.querySelectorAll('[data-value="acquisition"],[data-value="funnel"],[data-value="experience"],[data-value="product"]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.value);
  const freq=document.querySelector('#freq-wrap .fcard.on')?.dataset.value||'weekly';
  const day=document.querySelector('#day-section .chip.on')?.dataset.value||'';
  const time=document.querySelector('#time-section .chip.on')?.dataset.value||'9:00 AM';
  const delivery=[...document.querySelectorAll('[data-value="email"],[data-value="slack"]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.value);
  if(!coverage.length){alert('Select at least one area.');return;}
  if(!delivery.length){alert('Select at least one delivery method.');return;}
  let msg=`Schedule digest: coverage=${coverage.join(', ')}, frequency=${freq}`;
  if(day) msg+=`, day=${day}`;
  msg+=`, time=${time}, delivery=${delivery.join(' and ')}`;
  sendPrompt(msg);
}
</script>
```

---

## Step 7 — Share opportunities

Triggered by: "share to Slack", "email me these", "send to my team"

- Share subset if specified, otherwise share all
- Each opportunity should be written out in full — same story as the card: title, 2-3 sentence narrative (gap, baseline comparison, trend), estimated revenue range, and any caveats. Do not reduce to bullet points or single-line summaries.
- **Slack:** `slack_send_message`, ask for channel if not specified. Lead with "Here are your top opportunities for [domain]:" then one block per opportunity formatted as: bold title, trend label, narrative, estimated revenue. Separate opportunities with a blank line.
- **Email:** `create_draft`, ask recipient if not specified. Subject: `Revenue opportunities - [domain] ([date])`. Body: one paragraph intro summarising the scan, then each opportunity as a section with title, trend label, full narrative, and estimated revenue. Include caveats inline beneath the relevant opportunity.
- If tool not connected: tell user which is missing