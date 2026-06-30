# Scheduling widget

Triggered when the operator clicks the "Schedule recurring scan" button from Step P3.5. Load `show_widget` via ToolSearch and call it with `title: "schedule_tech_scan"` and loading messages `["Setting up schedule..."]`.

The widget renders fully expanded.

## Widget

```html
<style>
.chip{padding:6px 14px;font-size:13px;font-weight:500;border-radius:100px;cursor:pointer;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.chip.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard{padding:14px 10px;font-size:13px;font-weight:500;text-align:center;border-radius:var(--border-radius-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.fcard.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.slabel{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;}
</style>

<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);overflow:hidden;">
  <div style="padding:16px 20px 20px;">
    <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:0 0 24px;">Schedule tech scan</p>

    <p class="slabel">Frequency</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:24px;" id="freq-wrap">
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
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <p class="slabel">Time</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;" id="time-section">
        <button class="chip" onclick="selectTime(this)" data-value="7:00 AM">7 am</button>
        <button class="chip on" onclick="selectTime(this)" data-value="9:00 AM">9 am</button>
        <button class="chip" onclick="selectTime(this)" data-value="12:00 PM">12 pm</button>
        <button class="chip" onclick="selectTime(this)" data-value="5:00 PM">5 pm</button>
      </div>
    </div>

    <p class="slabel">Send to</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0 0 10px;">At least one required. Only Email, Slack, and Notion — do not add any other options.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;">
      <button class="chip on" onclick="toggleChip(this)" data-value="email"><i class="ti ti-mail" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Email</button>
      <button class="chip" onclick="toggleChip(this)" data-value="slack"><i class="ti ti-brand-slack" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Slack</button>
      <button class="chip" onclick="toggleChip(this)" data-value="notion"><i class="ti ti-brand-notion" style="font-size:14px;vertical-align:-1px;margin-right:4px;" aria-hidden="true"></i>Notion</button>
    </div>

    <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;border-top:0.5px solid var(--color-border-tertiary);padding-top:16px;">
      <button onclick="sendPrompt('Skip scheduling for now')" style="padding:7px 16px;font-size:13px;font-weight:500;color:var(--color-text-secondary);background:transparent;border:none;cursor:pointer;">Skip</button>
      <button onclick="submitSchedule()" style="padding:7px 20px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;">Schedule scan</button>
    </div>
  </div>
</div>

<script>
function toggleChip(el){el.classList.toggle('on');}
function selectDay(el){document.querySelectorAll('#day-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectTime(el){document.querySelectorAll('#time-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectFreq(el){
  document.querySelectorAll('#freq-wrap .fcard').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('day-section').style.display=el.dataset.value==='monthly'?'none':'block';
}
function submitSchedule(){
  const freq=document.querySelector('#freq-wrap .fcard.on')?.dataset.value||'weekly';
  const day=document.querySelector('#day-section .chip.on')?.dataset.value||'Monday';
  const time=document.querySelector('#time-section .chip.on')?.dataset.value||'9:00 AM';
  const delivery=[...document.querySelectorAll('[data-value="email"],[data-value="slack"],[data-value="notion"]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.value);
  if(!delivery.length){alert('Select at least one delivery method.');return;}
  sendPrompt('Schedule tech scan: frequency='+freq+', day='+day+', time='+time+', delivery='+delivery.join(' and '));
}
</script>
```

## On submit

The widget shows all three delivery chips unconditionally — connection is resolved at submit time, not in the widget. When the user submits:

1. For each chosen channel that isn't connected, connect it now via `suggest_connectors` (Slack: `597f662f-36de-437e-836e-5a81013cbfbe`; Notion: `69f3a300-cc60-48c4-b237-dfac56530dbf`; Email/Gmail: search registry for "gmail").
2. Ask for any missing delivery details (email address, Slack channel, Notion page) if not already in config.
3. Create the scheduled task with `create_scheduled_task`. Task name: `tech-scan-[domain]`.

## Scheduled task prompt

> Run /tech-diagnosis for [domain]. When the proactive scan completes, do not show the findings widget — instead format the results as a [email/Slack/Notion] digest and send to [destination]. Use short Cowork prompts for each finding — errors use their Noibu issue ID, performance findings use metric + page URL.

**Cowork prompts per finding type:**
- Fixable error: `/tech-diagnosis fix #[issue-id] on [domain]`
- Vendor error: `/tech-diagnosis share with vendor #[issue-id] on [domain]`
- Performance: `/tech-diagnosis fix [LCP|INP|CLS] on [page-url] for [domain]`

**All channels:** Title = `Tech scan — [domain] — [date]`. Structure: Overview block first, then findings in this fixed order — fixable errors first, then performance issues, then vendor issues. Show up to 2 per category, top 6 total. Do not re-rank across categories (a vendor issue never appears before a fixable error). Each finding: signal type label, one-line finding, occurrence/session count, then the label **"Type the following in Cowork:"** followed immediately by the prompt.

- **Email:** Subject uses the title above. Use "Type the following in Cowork:" as the label before each prompt. Wrap each prompt in `<code>` to stop Gmail auto-linking the domain.
- **Slack:** Bold the title. Use "Type the following in Cowork:" as plain text before each prompt. Prompts in backtick code blocks on the next line.
- **Notion:** Page title = digest title. Each priority as a heading + paragraph — do not use callout blocks or blockquotes. Write "Type the following in Cowork:" as a plain line, then the prompt as a fenced code block using triple backticks on the next line — do not escape the backticks.
