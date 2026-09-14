# Fix automation widget

Rendered in Step 4 (see `SKILL.md`), right after the report is delivered. Load `show_widget` via ToolSearch — the content parameter is `widget_code`, not `html`; check the tool schema if unsure, since the wrong name renders nothing and fails silently. `title: "accessibility_fix_automation"`, loading messages `["..."]`.

Offers to open GitHub PRs or tickets for the findings just generated — immediately, not on a schedule. No Skip button — ignoring it is the decline. Clicking a button runs `sendPrompt`, which Step 4 picks up to apply the fix-selection rule right away.

## Widget

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
  <p style="font-size:13px;color:var(--color-text-primary);margin:0;">Want me to open GitHub PRs or tickets for the top fixable findings right now?</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button onclick="sendPrompt('Auto-draft PR for these findings')" style="padding:9px 18px;font-size:13px;font-weight:600;color:#fff;background:#000;border:none;border-radius:var(--border-radius-md);cursor:pointer;white-space:nowrap;">Auto-draft PR</button>
    <button onclick="sendPrompt('Auto-create tickets for these findings')" style="padding:9px 18px;font-size:13px;font-weight:600;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;white-space:nowrap;">Auto-create tickets</button>
  </div>
</div>
```

