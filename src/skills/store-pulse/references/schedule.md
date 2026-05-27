# Scheduled report

A scheduled report is a recurring delivery of the dashboard's snapshot for a fixed window. The window is determined by the chosen frequency. The send time is independent — set by the user.

## Snapshot windows

All windows are computed in the user's timezone (`config.schedule.timezone`).

| Frequency | Window | Sends on | Cron expression (where `H` = chosen hour, `D` = chosen weekday 0-6) |
|---|---|---|---|
| Daily | yesterday 00:00 – 23:59 | every day at chosen time | `0 H * * *` |
| Weekly | the preceding 7 days, anchored to the chosen weekday | the chosen weekday at chosen time | `0 H * * D` |
| Bi-weekly | the preceding 14 days, anchored to the chosen weekday | the chosen weekday at chosen time, every other week | `0 H * * D` with skip-week guard in the prompt (see below) |
| Monthly | the previous calendar month, 1st 00:00 – last day 23:59 | the 1st of the new month at chosen time | `0 H 1 * *` |

The user picks an hour-of-day. Default 9am if they don't specify. Cron expressions are evaluated in the user's local timezone (cowork's scheduler honors that).

**Bi-weekly note**: cron has no native every-other-week. The cron fires weekly on the chosen day, and the prompt body computes "is this an on-week?" using the ISO week number parity vs. the anchor week stored in `config.schedule.anchor_iso_week`. On off-weeks the prompt returns early without sending.

## Channels

### Email (draft only — never auto-send)

The cron job creates a draft in the user's connected email account; the user reviews and sends from inside their email client. Content depends on `detail_level`:

- **Summary** — body = editorial summary paragraph + headline KPI table. ~1–2 KB. Fast to assemble, lands cleanly across every email client.
- **Full report** — body = editorial summary + headline KPI table + one inline table per enabled block (funnel, top products, channels, paid). ~6–10 KB. Recipients see the whole report when they open the email — no attachments, no PDF, nothing to download.

Tools (the cron substitutes the actual fully-qualified names at creation time — see the cron-prompt placeholder list below):
- **Gmail**: `{{gmail_draft_tool}}` with `{ to, subject, htmlBody }`.
- **Outlook**: `{{outlook_draft_tool}}` with the equivalent shape.

No attachments either way. We deliberately moved away from PDF: tables render natively in email clients, the PDF generation step was the slowest part of the cron, and inlining the tables keeps the tool-call payload smaller than a base64-encoded PDF.

**Email body format** (HTML, inline styles only — most email clients strip CSS rules from `<style>` blocks):

```
Subject: Store Pulse — [period label]

<editorial summary as 2-3 sentence prose>

<headline KPI table: Sessions, Engagement, Conversion, AOV, RPS — current value + Δ vs prior period>

[FULL REPORT ONLY — one inline table per enabled block in config.blocks:]
<purchase funnel table: Step / % of sessions / Sessions / Prior % / Prior count / Δ pp>
<top products table: Product / Sessions / Add-to-Cart %. Above it: "Site-wide add-to-cart benchmark this period: X%">
<channel performance table: Channel / Sessions / Engagement / Conversion / RPS>
<paid ad performance table: Platform / Sessions / Conversions / Revenue. Numbers from Noibu UTM attribution; show `0` for platforms with no tagged traffic.>

<small footer>Generated [timestamp] from Store Pulse for [domain].</small>
```

No funnel chart, no SVG visualizations, no embedded images. Tables only — those render reliably; charts don't.

### Slack (canvas + channel post)

The cron job posts a Slack Canvas to the target channel. Canvases render natively inside Slack with markdown headers, tables, and lists — much richer than a plain text message and they live persistently in the channel for re-reference. Two MCP calls:

1. **Create the canvas** with `slack_create_canvas({ title, content })` — content is Canvas-flavored Markdown (similar to standard Markdown). Returns a canvas URL.
2. **Post a real message** (NOT a draft) via `slack_send_message({ channel_id, message })` with a one-liner that contains the canvas URL. Slack auto-unfurls canvas URLs inline so the canvas preview appears in the channel feed. Use `slack_send_message`, not `slack_send_message_draft` — drafts only live in the composer of the user who created them and aren't visible to anyone else.

**Canvas title:**
```
Store Pulse — [period label]
```

**Canvas content** (Canvas-flavored Markdown — do NOT include the title in the content; the title field handles that). Include only the sections whose blocks appear in `config.blocks`; skip the rest.

```markdown
[editorial summary as 2-3 sentence prose]

## Headline metrics

| Metric | Value | vs prior |
|---|---|---|
| Sessions | 1,276 | -3% |
| Engagement | 16.5% | -2pp |
| Conversion | 0.31% | flat |
| AOV | $87.54 | +5% |
| RPS | $0.27 | -8% |

## Purchase funnel

- View Product: 38% (-2pp)
- Add to Cart: 12% (-1pp)
- Start Checkout: 6% (flat)
- Checkout Complete: 2% (-0.3pp)

## Top products

Markdown table: Title / Sessions / Add-to-Cart %.

## Channel performance

Markdown table: Channel / Sessions / Engagement / Conversion / RPS.

## Paid ad performance

Markdown table with these columns and rules — do NOT substitute a 2-col Platform/Status table:

- **Platform**: always three rows (Google Ads, Facebook, Instagram).
- **Sessions / Conversions / Revenue**: real numbers from Noibu UTM attribution. `0` if no UTM-tagged traffic for that platform in the window.

---

_Generated [timestamp] from Store Pulse for [domain]._
```

**Channel message body** (mrkdwn, plain Slack message — NOT canvas markdown):

```
*Store Pulse - [period label]*

[link to canvas]
```

Slack unfurls the canvas URL automatically into a preview card, so a one-line message with the link is enough.

**Plan limitation.** Canvases aren't available on Slack free teams. If `slack_create_canvas` returns a "not available on free teams" or similar plan-limit error, fall back to a plain `slack_send_message` with the editorial summary inline + KPI bullets, and add a one-line note: "Full canvas report requires a paid Slack plan."

## Scheduling form widget

The form rendered via `mcp__visualize__show_widget` (title: `schedule_store_pulse`) during Setup step 4b. Pass this HTML verbatim — don't reconstruct from memory, don't trim, don't rename ids or classes (the inline JS depends on every selector).

**Note on `sendPrompt`.** The form's Skip button and the `submitSchedule()` function both call `sendPrompt(text)` — this is a global function Cowork injects into the widget execution context when the HTML is rendered through `mcp__visualize__show_widget`. It is **not a standard browser API**. Rendering this HTML any other way (inline in chat, via `mcp__cowork__create_artifact`, etc.) leaves `sendPrompt` undefined and both buttons silently no-op. If Cowork ever moves this global to a different namespace (e.g. `window.cowork.sendPrompt`), the two `sendPrompt(...)` call sites in the snippet below need to be updated to match.

**Note on icon classes.** The form uses Tabler Icons classes (`ti ti-sun`, `ti ti-calendar`, `ti ti-brand-slack`, etc.) and assumes the Tabler Icons stylesheet is loaded in Cowork's widget runtime. If Cowork swaps icon libraries or Tabler renames a class in a major version, the icons render as blank space — but every icon in the form already has `aria-hidden="true"` and sits next to a visible text label ("Daily", "Email", etc.), so the form remains usable. The icons are decorative reinforcement, not the only signal. If you do see blank icons in the rendered widget, check whether Tabler is still the canonical icon font on the Cowork side, and update the `ti ti-*` classes (or swap to whatever the new library uses) at the call sites below.

```html
<style>
.chip{padding:6px 14px;font-size:13px;font-weight:500;border-radius:100px;cursor:pointer;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.chip.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard{padding:14px 10px;font-size:13px;font-weight:500;text-align:center;border-radius:var(--border-radius-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.fcard.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard i{font-size:18px;}
.fcard .sub{font-size:11px;font-weight:400;color:var(--color-text-tertiary);margin-top:2px;line-height:14px;}
.slabel{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;}
</style>

<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:24px;">

  <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:0 0 24px;">Schedule Store Pulse</p>

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

  <p class="slabel">Delivery <span style="text-transform:none;letter-spacing:0;color:var(--color-text-tertiary);font-weight:400;">(pick one or both)</span></p>
  <div style="display:flex;gap:8px;margin-bottom:24px;" id="delivery-section">
    <button class="chip on" onclick="toggleChip(this)" data-value="email"><i class="ti ti-mail" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Email</button>
    <button class="chip on" onclick="toggleChip(this)" data-value="slack"><i class="ti ti-brand-slack" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Slack</button>
  </div>

  <p class="slabel">Detail level</p>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:28px;" id="detail-section">
    <button class="fcard on" onclick="selectDetail(this)" data-value="summary" style="padding:14px 14px;"><i class="ti ti-align-left" aria-hidden="true"></i><div>Summary</div><div class="sub">Headline numbers only. Quick and lightweight.</div></button>
    <button class="fcard" onclick="selectDetail(this)" data-value="full" style="padding:14px 14px;"><i class="ti ti-file-description" aria-hidden="true"></i><div>Full report</div><div class="sub">Includes a detailed report of the entire dashboard.</div></button>
  </div>

  <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;border-top:0.5px solid var(--color-border-tertiary);padding-top:16px;">
    <button onclick="sendPrompt('Skip scheduling for now')" style="padding:7px 16px;font-size:13px;font-weight:500;color:var(--color-text-secondary);background:transparent;border:none;cursor:pointer;">Skip</button>
    <button onclick="submitSchedule()" style="padding:7px 20px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;">Schedule report</button>
  </div>

</div>

<script>
function toggleChip(el){el.classList.toggle('on');}
function selectDay(el){document.querySelectorAll('#day-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectTime(el){document.querySelectorAll('#time-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectDetail(el){document.querySelectorAll('#detail-section .fcard').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
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
  const freq=document.querySelector('#freq-wrap .fcard.on')?.dataset.value||'weekly';
  const day=document.querySelector('#day-section .chip.on')?.dataset.value||'';
  const time=document.querySelector('#time-section .chip.on')?.dataset.value||'9:00 AM';
  const delivery=[...document.querySelectorAll('#delivery-section .chip.on')].map(b=>b.dataset.value);
  const detail=document.querySelector('#detail-section .fcard.on')?.dataset.value||'summary';
  if(!delivery.length){alert('Pick at least one delivery method.');return;}
  let msg=`Schedule Store Pulse report: frequency=${freq}`;
  if(day&&(freq==='weekly'||freq==='biweekly')) msg+=`, day=${day}`;
  msg+=`, time=${time}, delivery=${delivery.join(' and ')}, detail=${detail}`;
  sendPrompt(msg);
}
</script>
```

## Cron task prompt template

Substitute this into the `description` field of `mcp__scheduled-tasks__create_scheduled_task`. The cron runs cold — no chat history — so the prompt must be self-contained.

**Before passing this to create_scheduled_task, replace every `{{...}}` placeholder with the actual value from the user's config.** That includes `{{domain.name}}`, `{{schedule.timezone}}`, `{{schedule.frequency}}`, `{{schedule.day_of_week}}`, `{{schedule.anchor_iso_week}}`, `{{schedule.detail_level}}` (`"summary"` or `"full"`), `{{config.blocks}}`, and `{{config.schedule.deliveries}}` (each delivery's channel + target + channel_account). The cron has no access to the chat session, so unresolved placeholders will fail at run time. All per-user values must be baked in.

**Connector tool names must also be baked in.** The cron calls Slack and email tools whose fully-qualified names look like `mcp__<server>__<tool>`. The `<server>` segment can be a stable slug or a UUID depending on how each connector was registered, and the cron has no way to discover it at run time, so every tool the cron will call has to be substituted in at creation time.

Resolve each prefix from a tool you've already called or have visible in your available-tools list this session, then set the corresponding placeholder:

- **Slack** (only if Slack is a delivery): use `slack_search_channels` (already called during step 4 channel selection) as the donor — it appears as `mcp__<server>__slack_search_channels`; reuse that prefix.
  - `{{slack_canvas_tool}}` → `mcp__<server>__slack_create_canvas`
  - `{{slack_message_tool}}` → `mcp__<server>__slack_send_message`
- **Gmail** (only if any delivery has `channel_account == "gmail"`): find the Gmail draft-creation tool in your available tools — it appears as `mcp__<server>__create_draft` and sits alongside other Gmail tools (`search_threads`, `list_labels`, `list_drafts`). The `<server>` segment is typically a UUID rather than the slug `gmail`.
  - `{{gmail_draft_tool}}` → `mcp__<server>__create_draft` (the Gmail one)
- **Outlook** (only if any delivery has `channel_account == "outlook"`): find the Microsoft 365 / Outlook draft-creation tool in your available tools — name varies by connector (commonly `mcp__<server>__create_draft` or similar under a Microsoft 365 server). If you can't find one, surface that to the user and don't create the cron — the run will fail otherwise.
  - `{{outlook_draft_tool}}` → the fully-qualified name you found

For any channel that isn't part of the user's deliveries, you can leave its placeholder unsubstituted — it's only referenced on the branch that runs.

```
Run a scheduled Store Pulse report for {{domain.name}}.

1. All config values needed for this run have been baked into this prompt at setup time (domain, timezone, frequency, day_of_week, anchor_iso_week, detail_level, blocks list, deliveries). You do NOT need to read any config file — the values below are already resolved.

2. Compute the snapshot window in user timezone {{schedule.timezone}}. Branch on {{schedule.frequency}}:

   Daily:
     - end   = today 00:00:00 in user timezone
     - start = end - 24 hours

   Weekly:
     - anchor = the weekday named in {{schedule.day_of_week}} at 00:00:00 of the current week in user timezone
     - end   = anchor
     - start = end - 7 days

   Bi-weekly:
     - Check ISO week parity vs {{schedule.anchor_iso_week}}. If current_iso_week % 2 != anchor % 2, RETURN early ("off-week, skipping"). Don't send.
     - Otherwise:
       - anchor = the weekday named in {{schedule.day_of_week}} at 00:00:00 of the current week in user timezone
       - end   = anchor
       - start = end - 14 days

   Monthly:
     - first_of_this_month = day 1 of the current month at 00:00:00 in user timezone
     - end   = first_of_this_month
     - start = day 1 of the previous month at 00:00:00 in user timezone

3. Fetch the snapshot for every block in config.blocks using the queries documented in
   references/blocks/<block>.md. Pass {start, end} as the dateTimeRange.

4. Compute deltas vs the prior period of the same length (shift the window back by its own duration).

5. Generate the editorial summary (2-3 sentences, plain prose, lead with the most notable thing).

6. Send to each entry in config.schedule.deliveries (one cron, multiple sends — same snapshot, different channels). The `detail_level` value gates how much content lands in each channel:

   FOR EACH delivery in deliveries:
     IF delivery.channel == "email":
       - Compose the HTML body (inline styles only, no `<style>` blocks):
           - Always: editorial summary paragraph + headline KPI table (Sessions, Engagement, Conversion, AOV, RPS with Δ vs prior).
           - IF detail_level == "full": ALSO append one inline table per block in config.blocks — purchase funnel, top products (with site-wide ATC benchmark line above it), channel performance, paid ad performance. See "Email body format" in references/schedule.md for the exact columns per table.
           - Footer: `<small>Generated [timestamp] from Store Pulse for [domain].</small>`
       - Subject: "Store Pulse — [period label]"
       - Call:
           delivery.channel_account == "gmail" ? {{gmail_draft_tool}} : {{outlook_draft_tool}}
         with { to: delivery.target, subject, htmlBody }. No attachments.
       - The result is a draft in the user's drafts folder. Do not send.

     IF delivery.channel == "slack":
       - IF detail_level == "full":
           - Build the canvas content as Canvas-flavored Markdown: editorial summary paragraph, "## Headline metrics" with a KPI table, and one "## [Block name]" section per block in config.blocks (funnel, top products, channels, paid as markdown tables / lists). Don't include the title in the content — pass it separately.
           - Call `{{slack_canvas_tool}}({ title: "Store Pulse — [period label]", content: <canvas markdown> })`. Capture the returned canvas URL.
           - Call `{{slack_message_tool}}({ channel_id: delivery.target, message: "*Store Pulse — [period label]*\n\n[canvas URL]" })` (the message variant, not the draft variant — drafts only live in the composer of the user who created them) so the canvas link unfurls inline.
           - **Free-plan fallback:** if `{{slack_canvas_tool}}` errors with a plan-limit message, fall through to the summary path below and append "_Full canvas report requires a paid Slack plan._" to that message.
       - IF detail_level == "summary":
           - Compose a plain mrkdwn message: title line `*Store Pulse — [period label]*`, blank line, editorial summary paragraph, blank line, KPI bullets (`• Sessions: ...`, `• Engagement: ...`, etc.).
           - Call `{{slack_message_tool}}({ channel_id: delivery.target, message: <mrkdwn text> })`. No canvas.

   If one channel fails, log the failure and continue with the others. Don't bail the entire run.

7. Output a one-line confirmation in chat listing every target that received a draft (email) or message (Slack). Don't dump the full message body.
```

## Failure modes

- **Tool not authorized** - surface the failure to chat ("Couldn't reach [channel] - connector may need reauth"), don't silently skip the run.
- **Snapshot returned empty** - still send the report with "no traffic in this window" framing instead of bailing.
- **Slack canvas creation failed** (free Slack plan or perms) - skip the canvas, send a plain Slack message with the editorial summary + KPI bullets, append "_Full canvas report requires a paid Slack plan._" so the recipient knows what they're missing.
