# Schedule accessibility automation widget

Triggered by Step 5 in `SKILL.md` — either the operator says yes to Step 4's "run this automatically on a schedule" question, or an explicit later request. Load `show_widget` via ToolSearch (parameter is `widget_code`, not `html`), `title: "schedule_accessibility_automation"`, loading messages `["Setting up schedule..."]`.

Configures **cadence** and an optional **digest** only — Auto-draft PR / Auto-create tickets is never re-offered here; it's inherited from Step 4 or the forced-choice question `SKILL.md`'s Step 5 asks first. The **Automation** line is always read-only and always one of the two real choices, never "none." Fill in the `[...]` line before rendering: `Auto-draft PR → [repo]` or `Auto-create tickets → [platform] / [team]`.

**Digest** sends an exec summary of any automated changes proposed — links to whatever tickets/PRs the run created — never the PDF itself (still not reliably attachable to email/Slack/Notion). The digest text always closes by pointing back to the scheduled task in Claude for the full report. Digest channels aren't mutually exclusive — any combination of Email, Slack, Notion can be on at once, or none.

Confirming here only affects future scheduled runs — never the report already delivered.

The widget renders fully expanded.

## Widget

```html
<style>
.chip{padding:6px 14px;font-size:13px;font-weight:500;border-radius:100px;cursor:pointer;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.chip.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.fcard{padding:14px 10px;font-size:13px;font-weight:500;text-align:center;border-radius:var(--border-radius-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--color-background-primary) !important;border:1px solid var(--color-border-tertiary) !important;color:var(--color-text-secondary) !important;}
.fcard.on{background:#E6F1FB !important;border:1.5px solid #185FA5 !important;color:#0C447C !important;}
.sa-card{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;background:var(--color-background-primary);}
.sa-head{background:var(--color-background-secondary);padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary);}
.sa-head-title{font-size:12px;font-weight:700;letter-spacing:0.08em;color:var(--color-text-primary);text-transform:uppercase;}
.sa-body{padding:20px;}
.sa-section{margin-bottom:24px;}
.sa-hint{font-size:12px;color:var(--color-text-tertiary);margin:-4px 0 12px;}
.slabel{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;}
.afield-label{font-size:12px;font-weight:500;color:var(--color-text-secondary);margin:10px 0 6px;}
.ainput{width:100%;padding:8px 10px;font-size:13px;border:0.5px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);color:var(--color-text-primary);box-sizing:border-box;}
</style>

<div class="sa-card">
  <div class="sa-head"><span class="sa-head-title">Schedule accessibility automation</span></div>
  <div class="sa-body">

    <div class="sa-section">
      <p class="slabel">Automation</p>
      <p style="font-size:13px;color:var(--color-text-primary);margin:0;">[Auto-draft PR → owner/repo | Auto-create tickets → Platform / Team]</p>
      <p class="sa-hint" style="margin-top:6px;">Set from your last run — change it by asking, not from this card.</p>
    </div>

    <div class="sa-section">
      <p class="slabel">Frequency</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" id="freq-wrap">
        <button class="fcard on" onclick="selectFreq(this)" data-value="weekly">Weekly</button>
        <button class="fcard" onclick="selectFreq(this)" data-value="biweekly">Bi-weekly</button>
        <button class="fcard" onclick="selectFreq(this)" data-value="monthly">Monthly</button>
      </div>
    </div>

    <div class="sa-section" id="day-section">
      <p class="slabel">Day</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="chip on" onclick="selectDay(this)" data-value="Monday">Mon</button>
        <button class="chip" onclick="selectDay(this)" data-value="Tuesday">Tue</button>
        <button class="chip" onclick="selectDay(this)" data-value="Wednesday">Wed</button>
        <button class="chip" onclick="selectDay(this)" data-value="Thursday">Thu</button>
        <button class="chip" onclick="selectDay(this)" data-value="Friday">Fri</button>
      </div>
    </div>

    <div class="sa-section">
      <p class="slabel">Time</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;" id="time-section">
        <button class="chip" onclick="selectTime(this)" data-value="7:00 AM">7 am</button>
        <button class="chip on" onclick="selectTime(this)" data-value="9:00 AM">9 am</button>
        <button class="chip" onclick="selectTime(this)" data-value="12:00 PM">12 pm</button>
        <button class="chip" onclick="selectTime(this)" data-value="5:00 PM">5 pm</button>
      </div>
    </div>

    <div class="sa-section">
      <p class="slabel">Auto-share digest <span style="text-transform:none;font-weight:400;color:var(--color-text-tertiary);">(optional)</span></p>
      <p class="sa-hint">Sends an exec summary of any automated changes proposed — not the full PDF. Points back to this scheduled task for the complete report.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="digest-channel-wrap">
        <button class="chip" onclick="toggleDigestChannel(this)" data-value="email">Email</button>
        <button class="chip" onclick="toggleDigestChannel(this)" data-value="slack">Slack</button>
        <button class="chip" onclick="toggleDigestChannel(this)" data-value="notion">Notion</button>
      </div>
      <div id="digest-email-field" style="display:none;margin-bottom:10px;">
        <p class="afield-label">Recipient(s)</p>
        <input class="ainput" id="digest-email" placeholder="name@company.com" value="[operator's own email, or blank]" />
      </div>
      <div id="digest-slack-field" style="display:none;margin-bottom:10px;">
        <p class="afield-label">Slack channel</p>
        <input class="ainput" id="digest-slack" placeholder="#accessibility" />
      </div>
      <div id="digest-notion-field" style="display:none;">
        <p class="afield-label">Notion page</p>
        <input class="ainput" id="digest-notion" placeholder="Page name or URL" />
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;border-top:0.5px solid var(--color-border-tertiary);padding-top:16px;">
      <button onclick="sendPrompt('Skip scheduling for now')" style="padding:7px 16px;font-size:13px;font-weight:500;color:var(--color-text-secondary);background:transparent;border:none;cursor:pointer;">Skip</button>
      <button onclick="submitSchedule()" style="padding:7px 20px;font-size:13px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;">Confirm</button>
    </div>

  </div>
</div>

<script>
function selectFreq(el){
  document.querySelectorAll('#freq-wrap .fcard').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('day-section').style.display=el.dataset.value==='monthly'?'none':'block';
}
function selectDay(el){document.querySelectorAll('#day-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function selectTime(el){document.querySelectorAll('#time-section .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function toggleDigestChannel(el){
  el.classList.toggle('on');
  var field=document.getElementById('digest-'+el.dataset.value+'-field');
  if(field) field.style.display = el.classList.contains('on') ? 'block' : 'none';
}
function submitSchedule(){
  var freq=document.querySelector('#freq-wrap .fcard.on')?.dataset.value||'weekly';
  var day=document.querySelector('#day-section .chip.on')?.dataset.value||'Monday';
  var time=document.querySelector('#time-section .chip.on')?.dataset.value||'9:00 AM';
  var parts=['frequency='+freq,'day='+day,'time='+time];

  document.querySelectorAll('#digest-channel-wrap .chip.on').forEach(function(chip){
    var ch=chip.dataset.value;
    var val=document.getElementById('digest-'+ch).value.trim();
    if(!val){alert('Enter a destination for '+ch+', or turn that channel off.');throw new Error('missing digest field');}
    parts.push('digest_'+ch+'='+val);
  });

  sendPrompt('Schedule accessibility automation: '+parts.join(', '));
}
</script>
```

## On submit

"Skip scheduling for now" → no task created, nothing changes.

**Step 1 — Fix automation (inherited, required).** If Step 4 already ran this session, carry its choice and resolved repo/platform/team forward into the widget's read-only **Automation** line — don't ask again. Otherwise (Step 5 reached directly), ask once in plain chat before rendering the widget: *"Scheduling automatically drafts PRs or creates tickets each run — which would you like: Auto-draft PR or Auto-create tickets?"* No "just the report" option. Resolve repo/platform/team the same way Step 4 does, including the connector check, then fill the Automation line.

**Step 2 — Digest destinations.** For each channel selected, confirm the relevant connector is actually active — not just that a value exists — calling `suggest_connectors` inline if it isn't, before proceeding.

**Step 3 — Create the task.** Create with `create_trigger`, `requires_local_device: true` (never in-process cron, and omit `folders` — the built-in browser needs no local files, just the device binding). Task name: `accessibility-scan-[domain]`.

**Step 4 — Confirm.** One or two sentences confirming the cadence, any inherited automation, and any digest channels (e.g. "Scheduled — every Monday at 9am, with fixable violations opened as GitHub Issues automatically and a digest sent to #accessibility on Slack."), plus a note that the Claude desktop app needs to be open and online at each scheduled time: if it's ever closed when the schedule fires, the whole recurring task pauses silently rather than skipping that one run, so it's worth checking the task's status occasionally. Close by offering to run it once now via `fire_trigger` on the task just created, so any misconfiguration (bad repo, missing permissions, wrong platform/team, bad digest destination) surfaces immediately rather than at the first scheduled firing. Plain text, no widget; only fire if the operator says yes.

---

## Scheduled task prompt

> Run an accessibility audit for [domain] (top 10 pages by 30-day pageviews, WCAG 2.1 AA). Confirm the built-in browser is available first — if the desktop app isn't open, report that plainly and stop rather than scanning some other way. Otherwise, pool and rank findings, then:
>
> [If auto-draft PR was configured] For the top 10 fixable pooled findings: determine the fix using `references/platforms/[platform].md` (or `generic.md`), open a PR per finding against repo [repo]. Anything not traceable to a specific file becomes a `needs-investigation` note instead — no PR, doesn't consume a slot.
> [If auto-create tickets was configured] For the top 10 fixable pooled findings not already covered by a PR: open a ticket in [platform] / [team].
>
> Generate the PDF report (per `SKILL.md`'s Step 2) only after the above completes, so the Automated tickets column reflects what was actually created.
>
> Deliver the PDF into this run's chat with `SendUserFile`, same as an on-demand run's Step 3 — it needs to actually show up here so the file card is visible when this scheduled task's history is opened. "Don't send it anywhere" means never attach or link it to an external destination (email/Slack/Notion) — not that it goes undelivered in this session.
>
> [If a digest channel was configured, one block per channel] Send a digest to [Email: recipient(s) | Slack: channel | Notion: page]: the PDF's executive summary content (intro + stats paragraph + severity counts) plus one line per finding that got a PR or ticket this run (name → link). Close with: "See the full report by opening this scheduled task in Claude." Never attach or link the PDF file itself — it isn't reliably attachable to [Email/Slack/Notion].
>
> For Slack and Notion specifically, capture what the send/create call returns — Slack's message permalink, Notion's page URL — and include that link in this run's own final summary (the one-line wrap-up this task reports back). "Digest sent to Slack" with no way to jump to it defeats the point of a digest. Email has no equivalent artifact to link — a "drafted, not sent" note is enough there, same as today.
>
> Never merge anything. This is a fully self-contained run — do not ask the operator anything.
