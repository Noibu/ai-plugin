# Live Store Pulse Dashboard

Build a persistent artifact using `mcp__cowork__create_artifact`. This replaces the old
`scripts/render_dashboard.py` + `assets/dashboard.html` pair — the template now lives
directly in this file, and substitution is a plain text replace you do yourself (two
placeholders, no script needed).

**One dashboard per domain.** Before creating, always check whether this domain already
has one (see SKILL.md's "Save as artifact" flow) — don't create a second artifact for a
domain that already has a live dashboard.

**Artifact id and title are domain-derived, never fixed.** This is what lets multiple
domains each have their own live dashboard side by side. Never hardcode
`store-pulse-dashboard` as the id for a new artifact — that fixed id only exists on
dashboards created before multi-domain support shipped; leave those alone (see
SKILL.md Migration note).

- **Id** — always fully domain-qualified, kebab-case: `store-pulse-[domain-with-dots-as-dashes]`,
  e.g. `flyinmiata.com` → `store-pulse-flyinmiata-com`, `atari.com` → `store-pulse-atari-com`.
  Ids need to be collision-proof up front (they're never renamed), so they always keep
  the full domain including suffix, even when the title below drops it.
- **Title** — defaults to `Store Pulse — [Label]`, where Label is the domain with its
  suffix stripped and title-cased: `flyinmiata.com` → `Store Pulse — Flyinmiata`,
  `atari.com` → `Store Pulse — Atari`. Cowork's sidebar title-cases and strips
  punctuation from whatever title you pass — a raw domain like `atari.com` renders
  there as the awkward "Atari Com". Dropping the suffix by default avoids that for the
  common case (one domain per company).

  **Only append the suffix** — as `Store Pulse — [Label] (.[suffix])`, e.g.
  `Store Pulse — Atari (.com)` — when this domain's Label collides with another
  *existing* Store Pulse dashboard's Label under a different suffix (e.g. `atari.com`
  and `atari.ca` both have live dashboards). Before naming a new dashboard, call
  `list_artifacts`, compute each existing Store Pulse dashboard's Label the same way
  (domain minus everything from the first `.` onward), and check for a match. If you're
  rebuilding an existing dashboard and a same-Label collision now exists that didn't
  before, fix its title too as part of that rebuild — same self-healing pattern as the
  `mcp_tools` resolution below, just for titles instead of tool names.

**Probe before building.** Call the Noibu session-search tool once with a minimal query
to confirm the exact tool name and response shape, same as Setup already does when
resolving the tool name.

**Do this silently.** Resolving the tool name, probing it, and substituting it into
`__NOIBU_TOOL_NAME__` are mechanical steps, not something the user needs a play-by-play
of — don't narrate "resolving the tool name," "the tool name is `mcp__<uuid>__...`," or
"substituting it in" as chat text. It's internal plumbing; the user cares that the
dashboard works, not which UUID a connector happens to be registered under this session.

## Template

Copy the HTML below **verbatim** — do not reimagine the structure, CSS, or JS. It already
has the correct self-contained local color palette (`:root` block up top — this artifact
renders in its own iframe with no injected host tokens, so the palette must be defined
locally), sequential (non-parallel) data fetching, and the tooltip-overflow fixes already
debugged in production. The only two things you ever change are the two placeholders:

- `__CONFIG_JSON__` → replace with the resolved config object as a literal JS object,
  e.g. `{ "version": 1, "domain": { "id": "uuid", "name": "flyinmiata.com" }, "blocks": ["core-kpis", "purchase-funnel", "top-products"] }`
- `__NOIBU_TOOL_NAME__` → replace with the fully-qualified `noibu_search_sessions` tool
  name resolved from your CURRENT session's live tools (see the warning inside the
  template's own comments — never hardcode or reuse a `mcp__<server>__` prefix from a
  previous session or from documentation, it rotates).

Do a plain string substitution of both placeholders in the copy below, then pass the
result as `html_path` to `create_artifact` (write it to a file first).

```html
<style>
  :root {
    color-scheme: light;
    --bg-primary: #ffffff;
    --bg-secondary: #f7f7f5;
    --bg-tertiary: #efefec;
    --text-primary: #1a1a19;
    --text-secondary: #6b6b67;
    --text-muted: #a8a8a3;
    --border: rgba(0,0,0,0.11);
    --success-text: #1a7d4a;
    --success-bg: #e8f5ec;
    --danger-text: #a32d2d;
    --danger-bg: #fcebeb;
  }
    * { box-sizing: border-box; }

  .sp-app {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 24px;
    font-size: 12px;
    line-height: 18px;
  }

  /* Header */
  .sp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .sp-title {
    font-size: 20px;
    line-height: 32px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
  }
  .sp-domain {
    font-size: 11px;
    line-height: 16px;
    color: var(--text-secondary);
    font-weight: 500;
    margin-top: 2px;
  }
  .sp-comparison-note {
    font-size: 11px;
    line-height: 16px;
    color: var(--text-muted);
    font-weight: 400;
    margin-top: 2px;
  }

  /* Header right-side controls (selector + share) */
  .sp-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Time selector */
  .sp-selector {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-primary);
  }
  .sp-selector button {
    background: transparent;
    border: 0;
    padding: 6px 14px;
    font-size: 12px;
    line-height: 18px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    border-right: 1px solid var(--border);
  }
  .sp-selector button:last-child { border-right: 0; }
  .sp-selector button.active {
    background: var(--text-primary);
    color: var(--bg-primary);
  }
  .sp-selector button:not(.active):hover {
    background: var(--bg-tertiary);
  }


  /* Print stylesheet — runs when Cowork's built-in "Download as PDF" button is used.
     Goal: clean white page with the data, no interactive chrome, color-true bars and indicators,
     and sensible page breaks so blocks don't get sliced in half. */
  @media print {
    @page {
      margin: 14mm;
    }
    /* Page background: pure white, no panda-faint tint. */
    html, body, .sp-app {
      background: white !important;
    }
    .sp-app {
      padding: 0 !important;
    }
    /* Force backgrounds to render only on elements where the bg IS the data
       (dark funnel bars, drop zones, connectors, indicator tracks/fills). Default everywhere
       else lets the browser strip backgrounds, which is what we want for a clean PDF. */
    .sp-funnel-bar,
    .sp-funnel-drop-zone,
    .sp-funnel-conn,
    .sp-indicator-track,
    .sp-indicator-fill,
    .sp-indicator-tick {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Hide interactive controls and hover-only states. */
    .sp-controls,
    .sp-tip-text,
    .sp-funnel-tip {
      display: none !important;
    }
    /* Strip the dotted underline on tooltip terms — no point in print. */
    .sp-tip {
      text-decoration: none !important;
      cursor: auto !important;
    }
    /* Cards: keep borders, never split a card across pages. */
    .sp-card,
    .sp-kpi {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sp-block,
    .sp-funnel-step-b {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

  /* Editorial summary — bare prose, no card chrome */
  .sp-summary {
    margin-bottom: 24px;
    max-width: 820px;
  }
  .sp-summary-text {
    font-size: 12px;
    line-height: 18px;
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Section heading */
  .sp-section-head {
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.22px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin: 0 0 8px 4px;
  }

  /* Card */
  .sp-card {
    background: var(--bg-primary);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 16px;
  }

  .sp-block { margin-bottom: 16px; }

  /* KPI tiles */
  .sp-kpis {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }
  .sp-kpi {
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 16px;
  }
  .sp-kpi-label {
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.22px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .sp-kpi-value {
    font-size: 20px;
    line-height: 32px;
    font-weight: 500;
    color: var(--text-primary);
    margin-top: 6px;
  }
  /* Period-over-period delta — plain colored text on KPI tiles and funnel steps. */
  .sp-kpi-delta,
  .sp-funnel-delta {
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
  }
  .sp-kpi-delta { display: inline-block; margin-top: 4px; }
  .sp-kpi-delta.up,
  .sp-funnel-delta.up   { color: var(--success-text); }
  .sp-kpi-delta.down,
  .sp-funnel-delta.down { color: var(--danger-text); }
  .sp-kpi-delta.flat,
  .sp-funnel-delta.flat { color: var(--text-secondary); }

  /* Funnel &mdash; vertical stepped bars */
  /* Purchase funnel — header row (label + value + delta) above a body row of bars.
     Each column owns a left-half bar and a right-half gradient connector pointing
     to the next bar. Tooltip on bar/drop-zone hover shows session count + lost-from
     detail. */
  .sp-funnel-headers, .sp-funnel-bodies { display: flex; }
  .sp-funnel-bodies { height: 200px; margin-top: 20px; }
  .sp-funnel-step-h {
    flex: 1; min-width: 0; padding-right: 18px;
    position: relative;
    /* z-index: 5 lifts the header column (and its tall dividers) above the bodies row's
       bars and connectors so the column-separator lines stay visible through the bars.
       Tooltips inside bodies set their own z-index: 100, so they still stack on top. */
    z-index: 5;
  }
  .sp-funnel-step-h .sp-funnel-label {
    font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.22px;
    color: var(--text-secondary); text-transform: uppercase;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  /* Headline lets the value + delta wrap to a second line when the column is too
     narrow for both. Natural sizing — no shrinking — so neither piece truncates. */
  .sp-funnel-headline {
    display: flex; flex-wrap: wrap; align-items: baseline;
    gap: 4px 8px; margin-top: 2px;
  }
  .sp-funnel-headline .sp-funnel-value {
    font-size: 16px; line-height: 22px;
    font-weight: 500; color: var(--text-primary);
    /* Allow the value to wrap so step 1's "X sessions" breaks between number and word
       when the column is narrow. Percentages like "49.3%" have no whitespace and stay
       on one line. The delta keeps its own white-space: nowrap so "↓ 8.1pp" stays
       intact and just drops to a new flex row when it can't fit. */
    overflow-wrap: anywhere;
    min-width: 0;
  }
  /* Vertical divider sitting at the right edge of each header column. Extends down
     past the header (height 1200px) so the columns are visually separated through
     the bars row too. The parent funnel card sets overflow: hidden so the divider
     can't escape the card boundary at any height. */
  .sp-funnel-divider {
    position: absolute; right: 10px; top: -4px;
    width: 0.5px; height: 1200px;
    background: var(--border); pointer-events: none;
  }
  /* Clip the funnel card so the tall dividers stop at the card edge. Also drop the
     bottom padding so the bars sit flush with the card's bottom edge — looks tighter
     than letting the bars float with whitespace below them. */
  #sp-funnel {
    overflow: hidden;
    padding-bottom: 0;
  }
  .sp-funnel-step-b { flex: 1; min-width: 0; position: relative; height: 200px; }
  .sp-funnel-drop-zone {
    position: absolute; left: 0; right: 50%; bottom: 0;
    background: var(--bg-tertiary);
    border-radius: 4px 4px 0 0;
    cursor: help;
  }
  .sp-funnel-bar {
    position: absolute; left: 0; right: 50%; bottom: 0;
    background: var(--text-primary);
    border-radius: 4px 4px 0 0;
    overflow: hidden;
    cursor: help;
  }
  /* Sawtooth "torn off" indicator on a compressed bar 0. A white zigzag overlay sits
     near the top of the bar, drawn over the bar fill — signals "this bar has been
     clipped, would extend higher at true scale." Scales with bar width via the
     SVG's preserveAspectRatio="none". */
  .sp-funnel-sawtooth {
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    width: 100%;
    height: 12px;
    pointer-events: none;
    display: block;
  }
  .sp-funnel-conn {
    position: absolute; right: 0; width: 50%;
    background: linear-gradient(to bottom, rgba(26,26,25,0.18) 0%, rgba(26,26,25,0) 100%);
    pointer-events: none;
  }
  .sp-funnel-tip {
    position: absolute; left: 4px;
    background: var(--text-primary); color: var(--bg-primary);
    padding: 8px 12px; border-radius: 4px;
    font-size: 11px; line-height: 16px; font-weight: 400;
    visibility: hidden; z-index: 100; pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,.15);
    width: max-content; max-width: 260px;
  }
  .sp-funnel-tip-line { white-space: nowrap; }
  .sp-funnel-tip-line.primary { font-weight: 500; }
  .sp-funnel-tip-line.muted { color: rgba(255,255,255,0.7); }
  .sp-funnel-bar:hover ~ .sp-funnel-tip,
  .sp-funnel-drop-zone:hover ~ .sp-funnel-tip { visibility: visible; }

  /* Two-column */
  .sp-row-2 {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 16px;
  }

  /* Tables */
  .sp-table {
    width: 100%;
    border-collapse: collapse;
  }
  .sp-table th {
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.22px;
    color: var(--text-secondary);
    text-transform: uppercase;
    text-align: left;
    padding: 8px 16px 8px 0;
    border-bottom: 1px solid var(--border);
  }
  /* All columns default to left-aligned. The .num class on cells just marks them as numerical (mono font); alignment is inherited from the table default. */
  .sp-table td {
    padding: 10px 16px 10px 0;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    font-size: 12px;
    line-height: 18px;
    color: var(--text-primary);
  }
  .sp-table td.num {
    font-weight: 500;
  }

  /* Indicator column: a 100px container holds the bar (44px) + gap (8px) + value at right edge.
     Both the cell and the header use left-alignment, and both contain a 100px-wide inline container.
     Result: bar-left-edge and header-text-left-edge land at exactly the same x-position. */
  .sp-table th.indicator-h .indicator-h-text {
    display: inline-block;
    width: 100px;
    text-align: left;
  }
  .sp-table td.indicator-c .with-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100px;
    vertical-align: middle;
    font-weight: 500;
  }
  .sp-table tbody tr:last-child td { border-bottom: 0; }
  /* Top-products table: lock layout so long product titles never push the table past
     its card. The first column gets all the elastic width but truncates with ellipsis;
     other columns are fixed so the layout is deterministic at any card width. */
  .sp-card.top-products-card .sp-table {
    table-layout: fixed;
    width: 100%;
  }
  .sp-card.top-products-card .sp-table th:nth-child(2),
  .sp-card.top-products-card .sp-table td:nth-child(2) { width: 100px; }
  .sp-card.top-products-card .sp-table th:nth-child(3),
  .sp-card.top-products-card .sp-table td:nth-child(3) { width: 140px; }
  .sp-product-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }


  /* Centered-bar indicator (the divergent component) */
  .sp-indicator {
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: 5px;
    position: relative;
    cursor: default;
  }
  .sp-indicator-track {
    position: absolute;
    inset: 0;
    background: var(--bg-tertiary);
    border-radius: 3px;
  }
  .sp-indicator-tick {
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: var(--text-muted);
    transform: translateX(-50%);
    z-index: 2;
  }
  .sp-indicator-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 3px;
    z-index: 1;
  }
  .sp-indicator-fill.up { background: var(--success-text); }
  .sp-indicator-fill.down { background: var(--danger-text); }
  .sp-indicator-fill.flat { background: var(--bg-tertiary); }
  .sp-indicator-tooltip {
    visibility: hidden;
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--text-primary);
    color: var(--bg-primary);
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    letter-spacing: 0.22px;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
  }
  .sp-indicator:hover .sp-indicator-tooltip { visibility: visible; }

  /* Empty state — used when a block successfully fetched but returned no data
     (e.g. new domain with no traffic yet, or a period with zero qualifying rows). */
  .sp-empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-muted);
    font-size: 13px;
    font-style: italic;
  }
  .sp-empty-row td {
    text-align: center !important;
    padding: 28px 16px !important;
    color: var(--text-muted);
    font-style: italic;
    font-size: 12px;
  }
  .sp-empty-text {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }
  .sp-btn {
    display: inline-flex;
    align-items: center;
    padding: 6px 16px;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;
    border: 0.5px solid var(--border);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    cursor: pointer;
    margin-right: 8px;
  }
  .sp-btn:hover { background: var(--bg-tertiary); }
  .sp-btn.primary {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }
  .sp-btn.primary:hover {
    opacity: 0.85;
  }

  /* Inline methodology tooltip &mdash; dotted underline on the term, hover for explanation */
  .sp-tip {
    text-decoration: underline dotted;
    text-decoration-color: var(--text-muted);
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    cursor: help;
    position: relative;
  }
  .sp-tip-text {
    visibility: hidden;
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: var(--text-primary);
    color: var(--bg-primary);
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 11px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    width: 280px;
    max-width: calc(100vw - 32px);
    z-index: 100;
    white-space: normal;
    text-align: left;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,.15);
  }
  .sp-tip:hover .sp-tip-text {
    visibility: visible;
  }
  .sp-tip-text strong {
    font-weight: 500;
    color: var(--bg-primary);
  }
  /* When the tooltip would overflow the right edge of the viewport, JS adds this class to anchor it to the trigger's right edge instead, so it extends leftward. */
  .sp-tip-text.flip-left {
    left: auto;
    right: 0;
  }

</style>

<div class="sp-app">

  <!-- OVERVIEW: header + editorial summary + core KPIs, combined into one card.
       Wrapped in .sp-block (not just .sp-card) so it gets the same margin-bottom as
       every other section below it — without this wrapper the top card and the
       funnel card directly below it touch with no gap. -->
  <div class="sp-block">
  <div class="sp-card">
    <div class="sp-header">
      <div>
        <h1 class="sp-title">Store Pulse</h1>
        <div class="sp-domain" id="sp-domain-name"></div>
        <div class="sp-comparison-note" id="sp-status-line">Based on Noibu data and compared to previous period of the same length</div>
      </div>
      <div class="sp-controls">
        <div class="sp-selector" role="tablist">
          <button class="active" data-period="24h" onclick="spSetPeriod('24h')">24h</button>
          <button data-period="7d" onclick="spSetPeriod('7d')">7d</button>
          <button data-period="30d" onclick="spSetPeriod('30d')">30d</button>
        </div>
      </div>
    </div>

    <div class="sp-summary">
      <div class="sp-summary-text" id="sp-summary-text">
        Traffic is moderate at 1,276 sessions but engagement is unusually low &mdash; 4 orders landed at a healthy $87 AOV. The biggest leak is product page &rarr; add-to-cart, where only 8.6% of product viewers added anything to cart. Pre-order Hot Wheels listings drove the most traffic but converted poorly.
      </div>
    </div>

    <div class="sp-block" data-block="core-kpis">
      <div class="sp-kpis" id="sp-kpis"></div>
    </div>
  </div>
  </div>

  <!-- PURCHASE FUNNEL -->
  <div class="sp-block" data-block="purchase-funnel">
    <div class="sp-card" id="sp-funnel"></div>
  </div>

  <!-- TOP PRODUCTS -->
  <div class="sp-block" data-block="top-products">
    <div class="sp-card top-products-card">
      <table class="sp-table">
        <thead>
          <tr>
            <th>Top Products by Traffic</th>
            <th class="num">Sessions</th>
            <th class="indicator-h"><span class="indicator-h-text">Add to Cart</span></th>
          </tr>
        </thead>
        <tbody id="sp-top-products"></tbody>
      </table>
    </div>
  </div>

  <!-- CHANNEL PERFORMANCE -->
  <div class="sp-block" data-block="channel-performance">
    <div class="sp-card">
      <table class="sp-table">
        <thead>
          <tr>
            <th>Channel</th>
            <th class="num">Sessions</th>
            <th class="indicator-h"><span class="indicator-h-text">Engagement</span></th>
            <th class="indicator-h"><span class="indicator-h-text">Conversion</span></th>
            <th class="indicator-h"><span class="indicator-h-text"><span class="sp-tip">RPS<span class="sp-tip-text flip-left" data-tip-anchor="right">Revenue per session &mdash; channel revenue divided by channel sessions.</span></span></span></th>
          </tr>
        </thead>
        <tbody id="sp-channels"></tbody>
      </table>
    </div>
  </div>

  <!-- PAID PERFORMANCE -->
  <div class="sp-block" data-block="paid-performance">
    <div class="sp-card">
      <table class="sp-table">
        <thead>
          <tr>
            <th>Paid Ad Platform</th>
            <th class="num">Sessions</th>
            <th class="num"><span class="sp-tip">Conversions<span class="sp-tip-text flip-left" data-tip-anchor="right">Last-touch attributed via UTM and matched to your store's order data. Will diverge from each ad platform's native conversion count due to attribution-window differences.</span></span></th>
            <th class="num">Revenue</th>
          </tr>
        </thead>
        <tbody id="sp-paid"></tbody>
      </table>
    </div>
  </div>

</div>

<script>
  // ===== Helpers =====
  // Wraps an acronym (or any term) with the dotted-underline tooltip pattern.
  // alignRight anchors the tooltip's right edge to the trigger instead of its left —
  // use for triggers sitting in the rightmost column(s), where a left-anchored 280px
  // tooltip would overflow past the card/app edge.
  const acronymTip = (acronym, fullName, alignRight) =>
    `<span class="sp-tip">${acronym}<span class="sp-tip-text${alignRight ? ' flip-left' : ''}"${alignRight ? ' data-tip-anchor="right"' : ''}>${fullName}</span></span>`;

  // ===== Configuration injected at artifact create-time =====
  const SP_CONFIG = __CONFIG_JSON__;

  // Default caption shown in the status line once data has loaded. The same element
  // is repurposed to show "Loading..." during a fetch and error text on failure.
  const SP_CAPTION = 'Based on Noibu data and compared to previous period of the same length';

  // Populate the header's domain name from the baked-in config. The HTML carries no
  // hardcoded domain — every dashboard reflects whatever store the user set up.
  (function spInitDomainHeader() {
    const el = document.getElementById('sp-domain-name');
    if (el && SP_CONFIG && SP_CONFIG.domain && SP_CONFIG.domain.name) {
      el.textContent = SP_CONFIG.domain.name;
    }
  })();

  // ===== Period window helpers =====
  function spPeriodWindows(period) {
    const now = new Date();
    const map = { '24h': 1, '7d': 7, '30d': 30 };
    const days = map[period];
    if (!days) throw new Error('Unknown period: ' + period);
    const ms = days * 24 * 60 * 60 * 1000;
    const currentEnd = now;
    const currentStart = new Date(now.getTime() - ms);
    const priorEnd = currentStart;
    const priorStart = new Date(currentStart.getTime() - ms);
    return {
      current: { startTime: currentStart.toISOString(), endTime: currentEnd.toISOString() },
      prior:   { startTime: priorStart.toISOString(),  endTime: priorEnd.toISOString()  },
      label:   spPeriodLabel(period, currentStart, currentEnd)
    };
  }

  function spPeriodLabel(period, start, end) {
    const fmt = (d) => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase();
    const head = { '24h': 'LAST 24 HOURS', '7d': 'LAST 7 DAYS', '30d': 'LAST 30 DAYS' }[period];
    return `${head} &middot; ${fmt(start)} &ndash; ${fmt(end)}`;
  }

  // ===== Noibu MCP helper — domainId + rationale + skill always supplied =====
  // Detects error-shaped responses (auth-required, connector-disconnected, server errors)
  // and throws so the top-level spRender catch can surface them as a banner. Without this,
  // an auth-required response gets handed to noibuRecords(), which doesn't recognize the
  // shape, returns [], and every metric renders as zero with no indication of why.
  //
  // SP_NOIBU_TOOL is substituted when this template is copied (a plain text replace of
  // the __NOIBU_TOOL_NAME__ placeholder — see references/live-dashboard.md) with the
  // fully-qualified noibu_search_sessions tool name resolved from the CURRENT session's
  // live tools. The mcp__<uuid>__ prefix is a per-installation connector instance ID — it
  // differs between accounts and rotates when the connector is re-published or re-added,
  // so it must NEVER be hardcoded. The same resolved name must be passed as `mcp_tools`
  // to create_artifact/update_artifact so the call and the allowlist always agree.
  // ===== Serialized request queue + rate-limit backoff =====
  // A single dashboard render fans out up to 9 Noibu queries. spFetchData below already
  // awaits each one in series (never more than one in flight), which avoids the MCP
  // bridge timeouts that concurrent fan-out used to cause. This queue is a second layer
  // of protection on top of that: it still enforces a minimum SP_REQ_GAP_MS gap between
  // consecutive calls and retries with exponential backoff if the rate limiter ever pushes
  // back ("Artifact MCP rate limit exceeded"), which can still happen even with serial calls
  // if they land close together.
  const SP_REQ_GAP_MS = 150;   // minimum spacing between consecutive MCP calls
  const SP_MAX_RETRIES = 5;    // retries on rate-limit before surfacing the error
  let spQueueTail = Promise.resolve();
  let spLastCallAt = 0;
  const spSleep = (ms) => new Promise(r => setTimeout(r, ms));
  const spIsRateLimit = (s) => /rate limit/i.test(s || '');

  // Chain a thunk onto the queue so calls execute strictly one-after-another. The tail is
  // kept alive past rejections so a single failure can't wedge the whole queue.
  function spEnqueue(thunk) {
    const run = spQueueTail.then(async () => {
      const since = Date.now() - spLastCallAt;
      if (since < SP_REQ_GAP_MS) await spSleep(SP_REQ_GAP_MS - since);
      try { return await thunk(); }
      finally { spLastCallAt = Date.now(); }
    });
    spQueueTail = run.then(() => {}, () => {});
    return run;
  }

  const SP_NOIBU_TOOL = '__NOIBU_TOOL_NAME__';

  async function callNoibu(input) {
    if (SP_NOIBU_TOOL.indexOf('__NOIBU_TOOL_NAME') === 0) {
      const e = new Error('Dashboard template was rendered without a Noibu tool name — re-run Store Pulse setup.');
      e.noibuKind = 'tool';
      throw e;
    }
    const fire = () => window.cowork.callMcpTool(
      SP_NOIBU_TOOL,
      { domainId: SP_CONFIG.domain.id, input, rationale: 'Store Pulse dashboard data fetch', skill: 'store-pulse', skillStep: 'live-dashboard' }
    );

    for (let attempt = 0; ; attempt++) {
      let result;
      try {
        result = await spEnqueue(fire);
      } catch (err) {
        const m = err?.message || String(err);
        // Transport-level rate limiting — back off and retry.
        if (spIsRateLimit(m) && attempt < SP_MAX_RETRIES) {
          await spSleep(600 * Math.pow(2, attempt)); // 600, 1200, 2400, 4800, 9600ms
          continue;
        }
        const e = new Error(`Noibu request failed: ${m}`);
        e.noibuKind = 'transport';
        throw e;
      }

      const errMsg = extractNoibuError(result);
      if (errMsg) {
        // Tool-level rate limiting (error returned in the response body) — back off and retry.
        if (spIsRateLimit(errMsg) && attempt < SP_MAX_RETRIES) {
          await spSleep(600 * Math.pow(2, attempt));
          continue;
        }
        const e = new Error(errMsg);
        e.noibuKind = /auth|connect|sign|permission/i.test(errMsg) ? 'auth' : 'tool';
        throw e;
      }
      return result;
    }
  }

  // Inspects an MCP tool result for any shape that means "no data because something went
  // wrong" (vs "the query ran fine and found nothing"). Returns the human-readable error
  // string when found, or null when the response looks like a normal data response.
  function extractNoibuError(result) {
    if (!result) return null;
    // MCP convention: isError flag on the response object.
    if (result.isError === true) {
      const txt = Array.isArray(result.content)
        ? result.content.map(c => c?.text).filter(Boolean).join(' ')
        : '';
      return txt || 'Noibu returned an error response.';
    }
    // Some wrappers put the error string directly on the object.
    if (typeof result.error === 'string' && result.error) return result.error;
    if (result.error?.message) return result.error.message;
    // Some transports stuff the auth-required text into a content block without
    // setting isError. Sniff for the canonical phrase.
    if (Array.isArray(result.content)) {
      const txt = result.content.map(c => c?.text).filter(Boolean).join(' ');
      if (/requires authentication|needs to connect|not authorized|unauthorized/i.test(txt)) {
        return txt;
      }
    }
    return null;
  }

  // Extract the records array from a Noibu QuerySessions response, defensive against the
  // different shapes window.cowork.callMcpTool might return:
  //
  //   - Raw GraphQL:        { data: { domain: { explorationsQueryV2: { records: [...] } } } }
  //   - MCP content wrap:   { content: [{ type: 'text', text: '<JSON-string>' }] }
  //   - Pre-unwrapped:      { domain: { ... } }  or  { explorationsQueryV2: { ... } }
  //   - Already records:    { records: [...] }  or  [ ...records ]
  function noibuRecords(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;

    // MCP content wrapper: parse the JSON text payload, then recurse.
    if (Array.isArray(result.content)) {
      const text = result.content.find(c => c && c.type === 'text')?.text;
      if (text) {
        try { return noibuRecords(JSON.parse(text)); } catch (e) { /* fall through */ }
      }
    }

    // Walk the known nesting paths.
    return (
      result.data?.domain?.explorationsQueryV2?.records
      ?? result.domain?.explorationsQueryV2?.records
      ?? result.explorationsQueryV2?.records
      ?? result.records
      ?? []
    );
  }

  // ===== Per-block fetchers =====
  // Each one returns the data shape the renderers expect.

  async function fetchCoreKpis(window) {
    const r = await callNoibu({
      periodOptions: { dateTimeRange: window },
      queryInput: {
        measures: [
          { aggregate: { measureAlias: 'sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' } } },
          { predefined: { measure: 'BOUNCE_RATE', measureAlias: 'bounce_rate' } },
          { predefined: { measure: 'CONVERSION_RATE', measureAlias: 'cvr' } },
          { predefined: { measure: 'REVENUE_PER_SESSION', measureAlias: 'rps' } },
          { aggregate: { measureAlias: 'aov', measureFunc: 'AVG', target: { field: 'CHECKOUT_COMPLETE_TOTAL_VALUE' } } }
        ],
        orderBy: { measureAlias: 'sessions', direction: 'DESCENDING' }
      }
    });
    const rec = noibuRecords(r)[0] || {};
    return {
      sessions:   rec.sessions || 0,
      engagement: rec.bounce_rate != null ? (1 - rec.bounce_rate) * 100 : 0,
      cvr:        (rec.cvr || 0) * 100,
      aov:        rec.aov || 0,
      rps:        parseFloat(rec.rps) || 0
    };
  }

  async function fetchFunnel(window) {
    // Single query — sessions grouped by funnel depth PLUS a product-view-session count
    // measure in the same call. Every session sits in exactly one depth bucket, so summing
    // the filtered product-view measure across buckets equals the site-wide product-view
    // session count. This folds the former separate product-view query into one request.
    const depthR = await callNoibu({
      periodOptions: { dateTimeRange: window },
      queryInput: {
        measures: [
          { aggregate: { measureAlias: 'sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' } } },
          {
            aggregate: {
              measureAlias: 'pv', measureFunc: 'COUNT', target: { field: 'SESSION_ID' },
              filters: [{ fieldName: 'PRODUCT_VIEW_COUNT', operator: 'GREATER_THAN', comparisonValues: ['0'] }]
            }
          }
        ],
        groupBy: { fieldSegments: ['CONVERSION_FUNNEL_DEPTH'] },
        orderBy: { measureAlias: 'sessions', direction: 'DESCENDING' }
      }
    });
    const byDepth = {};
    let total = 0, pv = 0;
    noibuRecords(depthR).forEach(r => {
      byDepth[r.conversion_funnel_depth ?? 'null'] = r.sessions || 0;
      total += r.sessions || 0;
      pv += parseFloat(r.pv) || 0;
    });
    const atc = (byDepth[1] || 0) + (byDepth[2] || 0) + (byDepth[3] || 0) + (byDepth[4] || 0);
    const checkout = (byDepth[2] || 0) + (byDepth[3] || 0) + (byDepth[4] || 0);
    const complete = byDepth[4] || 0;
    return [
      { label: 'Enter store',       count: total },
      { label: 'View product',      count: pv },
      { label: 'Add to cart',       count: atc, tip: "Counts sessions that reached cart stage by any means, including express-checkout flows that bypass the standard add-to-cart event." },
      { label: 'Start checkout',    count: checkout },
      { label: 'Checkout complete', count: complete }
    ];
  }

  async function fetchTopProducts(window) {
    const r = await callNoibu({
      periodOptions: { dateTimeRange: window },
      queryInput: {
        measures: [
          { aggregate: { measureAlias: 'sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' } } },
          {
            aggregate: {
              measureAlias: 'atc_sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' },
              filters: [{ fieldName: 'ADDED_TO_CART_COUNT', operator: 'GREATER_THAN', comparisonValues: ['0'] }]
            }
          }
        ],
        groupBy: { arrayJoin: { arrayJoinCollection: 'VIEWED_PRODUCT_TITLES' } },
        orderBy: { measureAlias: 'sessions', direction: 'DESCENDING' },
        limit: 5
      }
    });
    return noibuRecords(r).map(rec => ({
      title: rec.viewed_product_titles_join || '(unknown)',
      sessions: rec.sessions || 0,
      atc: rec.atc_sessions || 0,
      atcPct: rec.sessions ? (rec.atc_sessions / rec.sessions) * 100 : 0
    }));
  }

  async function fetchChannels(window) {
    const r = await callNoibu({
      periodOptions: { dateTimeRange: window },
      queryInput: {
        measures: [
          { aggregate: { measureAlias: 'sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' } } },
          { predefined: { measure: 'BOUNCE_RATE', measureAlias: 'bounce_rate' } },
          { predefined: { measure: 'CONVERSION_RATE', measureAlias: 'cvr' } },
          { predefined: { measure: 'REVENUE_PER_SESSION', measureAlias: 'rps' } }
        ],
        groupBy: { fieldSegments: ['UTM_SOURCE', 'UTM_MEDIUM'] },
        orderBy: { measureAlias: 'sessions', direction: 'DESCENDING' },
        limit: 50
      }
    });
    const buckets = {
      'Direct':   { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 },
      'Paid':     { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 },
      'Organic':  { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 },
      'Email':    { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 },
      'Social':   { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 },
      'Referral': { sessions: 0, _eng: 0, _cvr: 0, _rps: 0 }
    };
    noibuRecords(r).forEach(rec => {
      const src = (rec.utm_source || '').toLowerCase();
      const med = (rec.utm_medium || '').toLowerCase();
      let bucket;
      if (!src) bucket = 'Direct';
      else if (['cpc','ppc','paid','paid_social','paidsocial'].includes(med)) bucket = 'Paid';
      else if (med === 'email' || ['klaviyo','mailchimp','shopify_email','notify'].some(s => src.includes(s))) bucket = 'Email';
      else if (med === 'social' || ['fb','facebook','ig','instagram','tiktok','twitter'].some(s => src.includes(s) || src === s)) bucket = 'Social';
      else if (med === 'organic' || ['google','bing','duckduckgo'].some(s => src === s)) bucket = 'Organic';
      else bucket = 'Referral';
      const sessions = rec.sessions || 0;
      const eng = (1 - (rec.bounce_rate || 0)) * 100;
      const cvr = (rec.cvr || 0) * 100;
      const rps = parseFloat(rec.rps) || 0;
      buckets[bucket].sessions += sessions;
      buckets[bucket]._eng += eng * sessions;
      buckets[bucket]._cvr += cvr * sessions;
      buckets[bucket]._rps += rps * sessions;
    });
    const out = [];
    for (const [name, b] of Object.entries(buckets)) {
      if (b.sessions === 0) continue;
      out.push({
        name,
        sessions: b.sessions,
        engagement: b._eng / b.sessions,
        cvr: b._cvr / b.sessions,
        rps: b._rps / b.sessions,
        tip: name === 'Direct'
          ? "Sessions with no UTM source. Includes typed URLs, bookmarks, in-app browsers, and links with stripped referrer data &mdash; so it may absorb some untagged paid or social traffic."
          : null
      });
    }
    out.sort((a, b) => b.sessions - a.sessions);
    return out;
  }

  // UTM source patterns for attributing Noibu sessions to each paid platform. The patterns
  // match utm_source values commonly used by ad platforms.
  const SP_PAID_UTM = {
    googleads: ['google', 'googleads'],
    facebook:  ['facebook', 'fb', 'meta'],
    instagram: ['instagram', 'ig']
  };

  async function fetchPaid(periodWindow) {
    // One query for all three platforms instead of three. We group by UTM_SOURCE (filtered to
    // the union of every platform's source patterns) and bucket each returned source into its
    // platform client-side — the same approach the channel block uses. Cuts the paid block
    // from three MCP calls to one.
    // NOTE: parameter is named `periodWindow` (not `window`) to avoid shadowing the global
    // `window` object — that bug previously killed window.cowork.callMcpTool inside this fn.
    const platforms = [
      { platform: 'Google Ads', sessions: 0, conversions: 0, revenue: 0 },
      { platform: 'Facebook',   sessions: 0, conversions: 0, revenue: 0 },
      { platform: 'Instagram',  sessions: 0, conversions: 0, revenue: 0 }
    ];
    const byName = { 'Google Ads': platforms[0], 'Facebook': platforms[1], 'Instagram': platforms[2] };
    const classify = (src) => {
      const s = (src || '').toLowerCase();
      if (SP_PAID_UTM.googleads.includes(s)) return 'Google Ads';
      if (SP_PAID_UTM.facebook.includes(s))  return 'Facebook';
      if (SP_PAID_UTM.instagram.includes(s)) return 'Instagram';
      return null;
    };
    const allSources = [...SP_PAID_UTM.googleads, ...SP_PAID_UTM.facebook, ...SP_PAID_UTM.instagram];

    try {
      const r = await callNoibu({
        periodOptions: { dateTimeRange: periodWindow },
        queryInput: {
          measures: [
            { aggregate: { measureAlias: 'sessions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' } } },
            {
              aggregate: {
                measureAlias: 'conversions', measureFunc: 'COUNT', target: { field: 'SESSION_ID' },
                filters: [{ fieldName: 'CHECKOUT_COMPLETED', operator: 'EQUALS', comparisonValues: ['true'] }]
              }
            },
            { aggregate: { measureAlias: 'revenue', measureFunc: 'SUM', target: { field: 'CHECKOUT_COMPLETE_TOTAL_VALUE' } } }
          ],
          filters: [
            { fieldFilter: { fieldName: 'UTM_SOURCE', operator: 'IS_ANY_OF', comparisonValues: allSources } }
          ],
          groupBy: { fieldSegments: ['UTM_SOURCE'] },
          orderBy: { measureAlias: 'sessions', direction: 'DESCENDING' }
        }
      });
      // Noibu returns numeric measures as strings — coerce so render-time .toFixed() works.
      noibuRecords(r).forEach(rec => {
        const name = classify(rec.utm_source);
        if (!name) return;
        byName[name].sessions    += parseFloat(rec.sessions) || 0;
        byName[name].conversions += parseFloat(rec.conversions) || 0;
        byName[name].revenue     += parseFloat(rec.revenue) || 0;
      });
    } catch (err) {
      console.warn('Paid attribution batched fetch failed', err);
    }

    return platforms;
  }

  // ===== Main fetcher — runs the right block fetchers in parallel and assembles the renderable shape =====
  async function spFetchData(period) {
    const w = spPeriodWindows(period);
    const blocks = SP_CONFIG.blocks || [];
    const data = {};

    // Fetched strictly in series — one query fully resolves before the next is even
    // started. A single render fans out up to 9 Noibu queries; firing them concurrently
    // (via Promise.all) has caused MCP bridge timeouts, so there must never be more than
    // one request in flight at a time here.
    if (blocks.includes('core-kpis')) {
      data.kpisCurrent = await fetchCoreKpis(w.current);
      data.kpisPrior   = await fetchCoreKpis(w.prior);
    }
    if (blocks.includes('purchase-funnel')) {
      data.funnelCurrent = await fetchFunnel(w.current);
      data.funnelPrior   = await fetchFunnel(w.prior);
    }
    if (blocks.includes('top-products')) {
      data.topProducts = await fetchTopProducts(w.current);
    }
    if (blocks.includes('channel-performance')) {
      data.channels = await fetchChannels(w.current);
    }
    if (blocks.includes('paid-performance')) {
      // Always render paid-performance if enabled. The block self-heals — unconnected
      // platforms render with a "Connect" button instead of being hidden.
      data.paid = await fetchPaid(w.current);
    }

    const out = { label: w.label, summary: '' };

    if (data.kpisCurrent) {
      const c = data.kpisCurrent, p = data.kpisPrior || {};
      const pct = (cur, prior) => prior ? ((cur - prior) / prior) * 100 : 0;
      out.kpis = {
        sessions:   { value: c.sessions.toLocaleString(),         delta: pct(c.sessions, p.sessions),     deltaUnit: '%'  },
        engagement: { value: c.engagement.toFixed(1) + '%',       delta: c.engagement - (p.engagement||0), deltaUnit: 'pp' },
        cvr:        { value: c.cvr.toFixed(2) + '%',              delta: c.cvr - (p.cvr||0),               deltaUnit: 'pp' },
        aov:        { value: '$' + c.aov.toFixed(2),              delta: pct(c.aov, p.aov),                deltaUnit: '%'  },
        rps:        { value: '$' + c.rps.toFixed(2),              delta: pct(c.rps, p.rps),                deltaUnit: '%'  }
      };
      out.siteCvr = c.cvr;
      out.siteEng = c.engagement;
      out.siteRps = c.rps;
    }

    if (data.funnelCurrent) {
      const cur = data.funnelCurrent, prior = data.funnelPrior || [];
      const total = cur[0]?.count || 1;
      const priorTotal = prior[0]?.count || 1;
      out.funnel = cur.map((step, i) => {
        const pctReach = (step.count / total) * 100;
        if (i === 0) {
          // Step 0 is the funnel baseline (100% reach by definition), so a
          // reach-vs-baseline delta is structurally always 0. Show the entry-traffic
          // trend instead: % change in raw session count vs the prior period. Rendered
          // with a '%' unit below. Matches inline-snapshot.md's step-0 convention.
          const pctChange = prior[0] ? ((total - priorTotal) / priorTotal) * 100 : null;
          return { ...step, pctReach, pctDelta: pctChange };
        }
        const priorPct = prior[i] ? (prior[i].count / priorTotal) * 100 : 0;
        return { ...step, pctReach, pctDelta: pctReach - priorPct };
      });
      // Site-wide ATC rate for the top-products indicator (ATC sessions / on-site sessions)
      out.siteAtc = total ? (cur[2].count / total) * 100 : 0;
    }

    if (data.topProducts) out.topProducts = data.topProducts;
    if (data.channels) out.channels = data.channels;
    if (data.paid) out.paid = data.paid;

    return out;
  }
  function spIndicator(value, baseline, polarity, format) {
    // value: actual measurement
    // baseline: site-wide value (the topline) to compare against
    // polarity: 'higher_is_better' | 'lower_is_better'
    // format: 'pct' | 'pp' | 'currency' | 'count'
    //
    // The bar always fills from the left.
    // Center tick at 50% represents the baseline (site avg).
    // value = baseline &rarr; bar reaches the tick (50% fill)
    // value = 2&times; baseline &rarr; bar fills the entire track (100%)
    // value = 0 &rarr; empty bar
    const ratio = baseline === 0 ? (value > 0 ? 2 : 0) : value / baseline;
    const fillPct = Math.min(100, ratio * 50);
    const delta = value - baseline;
    const deltaPct = baseline === 0 ? 0 : (delta / baseline) * 100;
    const isBetter = polarity === 'higher_is_better' ? delta > 0 : delta < 0;
    const isWorse  = polarity === 'higher_is_better' ? delta < 0 : delta > 0;
    const cls = isBetter ? 'up' : (isWorse ? 'down' : 'flat');
    const tooltip = delta > 0
      ? `${Math.abs(deltaPct).toFixed(0)}% above site avg`
      : (delta < 0
          ? `${Math.abs(deltaPct).toFixed(0)}% below site avg`
          : 'at site avg');
    return `
      <span class="sp-indicator">
        <span class="sp-indicator-track"></span>
        <span class="sp-indicator-fill ${cls}" style="width:${fillPct}%;"></span>
        <span class="sp-indicator-tick"></span>
        <span class="sp-indicator-tooltip">${tooltip}</span>
      </span>
    `;
  }

  function spDeltaArrow(delta, unit) {
    const a = Math.abs(delta);
    // Below threshold counts as no change &mdash; same convention as the funnel delta.
    if (a < 0.05) return `<span class="sp-kpi-delta flat">&mdash;</span>`;
    const cls = delta > 0 ? 'up' : 'down';
    const arrow = delta > 0 ? '&uarr;' : '&darr;';
    let formatted;
    if (unit === 'pp') {
      const decimals = a >= 10 ? 0 : (a >= 1 ? 1 : 2);
      formatted = `${a.toFixed(decimals)}pp`;
    } else {
      formatted = `${a.toFixed(0)}%`;
    }
    return `<span class="sp-kpi-delta ${cls}">${arrow}&nbsp;${formatted}</span>`;
  }

  async function spRender(period) {
    // Stamp this render. If a newer spRender starts before this one's MCP batch resolves,
    // the token will have advanced and this run bails out instead of painting stale data.
    const myToken = ++spRenderToken;
    const sel = document.querySelectorAll('.sp-selector button');
    sel.forEach(b => b.classList.toggle('active', b.dataset.period === period));

    document.getElementById('sp-status-line').innerHTML = 'Loading...';
    document.getElementById('sp-summary-text').innerText = '';
    // Hide all blocks while fetching so we don't show stale data alongside the loading state.
    document.querySelectorAll('[data-block]').forEach(el => { el.style.display = 'none'; });

    let d;
    try {
      d = await spFetchData(period);
    } catch (err) {
      if (myToken !== spRenderToken) return;
      console.error('spFetchData failed', err);
      let msg;
      if (err?.noibuKind === 'auth') {
        msg = 'Noibu connector isn&rsquo;t connected (or its session expired). Open the Cowork sidebar, sign in to the Noibu connector, then reload this dashboard.';
      } else if (err?.noibuKind === 'transport') {
        msg = 'Couldn&rsquo;t reach Noibu &mdash; ' + (err.message || 'network error') + '. Check your connection and reload.';
      } else if (err?.noibuKind === 'tool') {
        msg = 'Noibu returned an error: ' + (err.message || 'unknown') + '. Reload to retry.';
      } else {
        msg = 'Failed to load data &mdash; ' + (err?.message || 'unknown error') + '. Check the browser console and reload.';
      }
      document.getElementById('sp-status-line').innerHTML = msg;
      return;
    }

    // A newer period was selected while this batch was in flight — discard these results
    // so the dashboard never paints data for a period the user already moved off of.
    if (myToken !== spRenderToken) return;

    document.getElementById('sp-status-line').innerHTML = SP_CAPTION;

    // Editorial summary &mdash; kicked off FIRST so that any later block render error can't
    // skip it. Runs async, doesn't block UI; spGenerateSummary always falls back to a
    // deterministic snapshot summary if askClaude isn't available or errors out.
    spGenerateSummary(d);

    // Show only blocks the config has enabled AND that returned data this period.
    const blockData = {
      'core-kpis': d.kpis,
      'purchase-funnel': d.funnel,
      'top-products': d.topProducts,
      'channel-performance': d.channels,
      'paid-performance': d.paid
    };
    document.querySelectorAll('[data-block]').forEach(el => {
      el.style.display = blockData[el.dataset.block] ? '' : 'none';
    });

    // Each block render is wrapped so a single bug (e.g. an unexpected null in a row) can't
    // break the rest of the page. spSafeRender logs and surfaces a per-block error inline.
    function spSafeRender(blockId, fn) {
      try { fn(); }
      catch (err) {
        console.error(`Block render failed: ${blockId}`, err);
        const blockEl = document.querySelector(`[data-block="${blockId}"]`);
        if (blockEl) {
          blockEl.innerHTML = `<div class="sp-card" style="color:var(--text-secondary);font-size:13px;">Couldn&rsquo;t render this section &mdash; check the browser console for details.</div>`;
        }
      }
    }

    // KPIs &mdash; third array entry is an optional methodology tooltip; HTML in the label is allowed.
    spSafeRender('core-kpis', () => {
    if (d.kpis) {
      const kpiOrder = [
        ['sessions', 'Sessions', null],
        ['engagement', 'Engagement', "Share of sessions that scrolled or clicked &mdash; derived from Noibu's bounce signal (engaged = not bounced)."],
        ['cvr', 'Conversion', null],
        ['aov', acronymTip('AOV', 'Average order value &mdash; total revenue divided by orders.', true), null],
        ['rps', acronymTip('RPS', 'Revenue per session &mdash; total revenue divided by sessions.', true), null]
      ];
      const labelWithTip = (text, tip) => tip
        ? `<span class="sp-tip">${text}<span class="sp-tip-text">${tip}</span></span>`
        : text;
      document.getElementById('sp-kpis').innerHTML = kpiOrder.map(([k, label, tip]) => {
        const kpi = d.kpis[k] || { value: '&mdash;', delta: null, deltaUnit: null };
        return `
          <div class="sp-kpi">
            <div class="sp-kpi-label">${labelWithTip(label, tip)}</div>
            <div class="sp-kpi-value">${kpi.value}</div>
            ${spDeltaArrow(kpi.delta, kpi.deltaUnit)}
          </div>
        `;
      }).join('');
    }
    });

    // Funnel — per-step columns: header (label + value + delta) on top, body below
    // with a left-half bar and a right-half gradient trapezoid pointing at the next bar.
    // Tooltip shows session count + drop-off detail on bar/drop-zone hover.
    // See references/blocks/purchase-funnel.md.
    spSafeRender('purchase-funnel', () => {
    if (d.funnel) {
      if (d.funnel.length === 0) {
        document.getElementById('sp-funnel').innerHTML = `<div class="sp-empty">Funnel data not available.</div>`;
        return;
      }
      const CH = 200, COMP_RATIO = 3.5;
      const steps = d.funnel;
      const s0 = steps[0];
      // Reference height = the largest non-zero bar AFTER bar 0. Using s1 directly
      // would break when bar 1 is 0 (e.g. View Product not tracked) but later bars
      // have non-zero counts — that case used to render those bars at max height
      // because division by zero produced Infinity then clamped to 1. Picking the
      // max of bars 1..N is robust to non-monotonic data and matches the original
      // intent (compress bar 0 so the rest are readable).
      const tailMax = Math.max(0, ...steps.slice(1).map(s => s && s.count || 0));
      const isCompressed = tailMax > 0 && s0.count / tailMax >= COMP_RATIO;
      const ref = isCompressed ? tailMax : (s0.count || 1);
      const maxH = isCompressed ? CH - 28 : CH;

      const topPx = (i) => {
        if (i === 0 && isCompressed) return 0;
        const h = Math.min((steps[i].count || 0) / ref, 1) * maxH;
        return Math.round(CH - h);
      };

      const fmtNum = (n) => {
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return (n || 0).toLocaleString();
      };
      const fmtReach = (v) => v >= 10 ? v.toFixed(0) + '%' : (v >= 1 ? v.toFixed(1) + '%' : v.toFixed(2) + '%');
      const fmtDelta = (v, unit) => {
        const a = Math.abs(v);
        if (a < 0.05) return { text: '&mdash;', cls: 'flat' };
        const arrow = v > 0 ? '&uarr;' : '&darr;';
        const decimals = a >= 10 ? 0 : (a >= 1 ? 1 : 2);
        return { text: `${arrow}&nbsp;${a.toFixed(decimals)}${unit}`, cls: v > 0 ? 'up' : 'down' };
      };

      const tops = steps.map((_, i) => topPx(i));

      const headers = steps.map((step, i) => {
        const headlineValue = i === 0 ? fmtNum(step.count) + ' sessions' : fmtReach(step.pctReach);
        const d = fmtDelta(step.pctDelta, i === 0 ? '%' : 'pp');
        const deltaHTML = (step.pctDelta != null)
          ? `<span class="sp-funnel-delta ${d.cls}">${d.text}</span>`
          : '';
        const divider = i < steps.length - 1
          ? `<div class="sp-funnel-divider"></div>`
          : '';
        return `
          <div class="sp-funnel-step-h">
            <div class="sp-funnel-label" ${step.tip ? `title="${step.tip.replace(/"/g, '&quot;')}"` : ''}>${step.label}</div>
            <div class="sp-funnel-headline">
              <div class="sp-funnel-value">${headlineValue}</div>
              ${deltaHTML}
            </div>
            ${divider}
          </div>
        `;
      }).join('');

      const bodies = steps.map((step, i) => {
        const tp = tops[i];
        const prev = i > 0 ? steps[i - 1] : null;
        const ptPrev = i > 0 ? tops[i - 1] : 0;
        const nTp = i < steps.length - 1 ? tops[i + 1] : null;

        const dropZone = prev
          ? `<div class="sp-funnel-drop-zone" style="top:${ptPrev}px;"></div>`
          : '';

        let connector = '';
        if (nTp !== null) {
          const conH = CH - tp;
          const slopeStartPct = conH > 0 ? ((nTp - tp) / conH * 100).toFixed(2) : 0;
          connector = `<div class="sp-funnel-conn" style="top:${tp}px;height:${conH}px;clip-path:polygon(0 0%,100% ${slopeStartPct}%,100% 100%,0 100%);"></div>`;
        }

        // When bar 0 is compressed, its top edge gets a sawtooth "torn off" cut via
        // a CSS clip-path (see .sp-funnel-bar.compressed). Scales with bar width and
        // has visible zig depth regardless of column size.
        // When bar 0 is compressed, render a white sawtooth zigzag OVERLAY across the
        // bar near the top to signal "this bar has been clipped, would extend higher
        // at true scale." See .sp-funnel-sawtooth CSS.
        const barInner = (i === 0 && isCompressed)
          ? `<svg class="sp-funnel-sawtooth" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0,3 L5,9 L10,3 L15,9 L20,3 L25,9 L30,3 L35,9 L40,3 L45,9 L50,3 L55,9 L60,3 L65,9 L70,3 L75,9 L80,3 L85,9 L90,3 L95,9 L100,3" stroke="var(--bg-primary)" stroke-width="2" fill="none"/></svg>`
          : '';
        const bar = `<div class="sp-funnel-bar" style="top:${tp}px;">${barInner}</div>`;

        let tipHTML;
        if (prev) {
          const dropCount = (prev.count || 0) - (step.count || 0);
          tipHTML =
            `<div class="sp-funnel-tip-line primary">${fmtNum(step.count)} sessions</div>` +
            `<div class="sp-funnel-tip-line muted">${fmtNum(dropCount)} lost from ${prev.label.toLowerCase()}</div>`;
        } else {
          tipHTML =
            `<div class="sp-funnel-tip-line primary">${fmtNum(step.count)} sessions</div>` +
            `<div class="sp-funnel-tip-line muted">Top of the funnel</div>`;
        }
        const estimatedTipH = prev ? 56 : 40;
        const tipTop = Math.max(4, Math.min(tp + 4, CH - estimatedTipH - 4));
        const tip = `<div class="sp-funnel-tip" style="top:${tipTop}px;">${tipHTML}</div>`;

        return `<div class="sp-funnel-step-b">${dropZone}${connector}${bar}${tip}</div>`;
      }).join('');

      document.getElementById('sp-funnel').innerHTML =
        `<div class="sp-funnel-headers">${headers}</div>` +
        `<div class="sp-funnel-bodies">${bodies}</div>`;
    }
    });

    // Top products — empty state when the fetch succeeded but returned no rows.
    spSafeRender('top-products', () => {
    if (d.topProducts) {
      const tbody = document.getElementById('sp-top-products');
      if (d.topProducts.length === 0) {
        tbody.innerHTML = `<tr class="sp-empty-row"><td colspan="3">Product data not available.</td></tr>`;
        return;
      }
      tbody.innerHTML = d.topProducts.map(p => {
        const title = (p && p.title) ? String(p.title) : '&mdash;';
        const sessions = (p && typeof p.sessions === 'number') ? p.sessions : 0;
        const atc = (p && typeof p.atcPct === 'number') ? p.atcPct : 0;
        return `
        <tr>
          <td><div class="sp-product-title" title="${title.replace(/"/g, '&quot;')}">${title}</div></td>
          <td class="num">${sessions}</td>
          <td class="indicator-c">
            <span class="with-indicator">
              ${spIndicator(atc, d.siteAtc, 'higher_is_better', 'pct')}
              <span>${atc.toFixed(1)}%</span>
            </span>
          </td>
        </tr>
      `;
      }).join('');
    }
    });

    // Channels — empty state when the fetch succeeded but returned no rows.
    spSafeRender('channel-performance', () => {
    if (d.channels) {
      const tbody = document.getElementById('sp-channels');
      if (d.channels.length === 0) {
        tbody.innerHTML = `<tr class="sp-empty-row"><td colspan="5">Channel data not available.</td></tr>`;
        return;
      }
      const labelWithTip = (text, tip) => tip
        ? `<span class="sp-tip">${text}<span class="sp-tip-text">${tip}</span></span>`
        : text;
      tbody.innerHTML = d.channels.map(c => {
        const name = (c && c.name) ? c.name : '&mdash;';
        const sessions = (c && typeof c.sessions === 'number') ? c.sessions : 0;
        const eng = (c && typeof c.engagement === 'number') ? c.engagement : 0;
        const cvr = (c && typeof c.cvr === 'number') ? c.cvr : 0;
        const rps = (c && typeof c.rps === 'number') ? c.rps : 0;
        return `
        <tr>
          <td>${labelWithTip(name, c && c.tip)}</td>
          <td class="num">${sessions.toLocaleString()}</td>
          <td class="indicator-c">
            <span class="with-indicator">
              ${spIndicator(eng, d.siteEng, 'higher_is_better', 'pct')}
              <span>${eng.toFixed(1)}%</span>
            </span>
          </td>
          <td class="indicator-c">
            <span class="with-indicator">
              ${spIndicator(cvr, d.siteCvr, 'higher_is_better', 'pct')}
              <span>${cvr.toFixed(2)}%</span>
            </span>
          </td>
          <td class="indicator-c">
            <span class="with-indicator">
              ${spIndicator(rps, d.siteRps, 'higher_is_better', 'currency')}
              <span>$${rps.toFixed(2)}</span>
            </span>
          </td>
        </tr>
      `;
      }).join('');
    }
    });

    // Paid — every row always renders (Google Ads, Facebook, Instagram). All cells come
    // from Noibu UTM attribution against the platform's UTM source patterns.
    spSafeRender('paid-performance', () => {
    if (d.paid) {
      const tbody = document.getElementById('sp-paid');
      if (d.paid.length === 0) {
        tbody.innerHTML = `<tr class="sp-empty-row"><td colspan="4">Paid ad data not available.</td></tr>`;
        return;
      }
      tbody.innerHTML = d.paid.map(p => {
        const sessions = (p && typeof p.sessions === 'number') ? p.sessions : 0;
        const conversions = (p && typeof p.conversions === 'number') ? p.conversions : 0;
        const revenue = (p && typeof p.revenue === 'number') ? p.revenue : 0;
        return `
          <tr>
            <td>${p.platform}</td>
            <td class="num">${sessions.toLocaleString()}</td>
            <td class="num">${conversions}</td>
            <td class="num">$${revenue.toFixed(0)}</td>
          </tr>
        `;
      }).join('');
    }
    });
  }

  // Generate the editorial summary via askClaude. Uses the just-fetched snapshot as context.
  // Always falls back to a deterministic summary built from the snapshot so the section is never blank.
  async function spGenerateSummary(d) {
    const el = document.getElementById('sp-summary-text');
    if (!el) return;
    const fallback = spBuildFallbackSummary(d);
    if (!window.cowork || typeof window.cowork.askClaude !== 'function') {
      el.innerText = fallback;
      return;
    }
    el.innerText = 'Generating summary...';
    try {
      const prompt = `Write a 2-3 sentence editorial summary for an ecommerce store dashboard. Lead with the most notable thing happening today. Mix wins and concerns. Be specific with numbers but not exhaustive. Plain text, no bullets, no markdown. Keep it under 60 words. Don't start with "Today" or "This dashboard shows" - get straight into the data.`;
      const result = await window.cowork.askClaude(prompt, [d]);
      // askClaude may return a plain string OR a wrapped shape ({ text }, { content }, MCP-style).
      let text = '';
      if (typeof result === 'string') {
        text = result;
      } else if (result && typeof result === 'object') {
        text = result.text
            ?? result.summary
            ?? (Array.isArray(result.content)
                  ? (result.content.find(c => c?.type === 'text')?.text || '')
                  : (typeof result.content === 'string' ? result.content : ''))
            ?? '';
      }
      el.innerText = (text && text.trim()) ? text.trim() : fallback;
    } catch (err) {
      console.warn('askClaude summary failed, using deterministic fallback', err);
      el.innerText = fallback;
    }
  }

  // Deterministic, no-LLM summary built directly from the snapshot. Used when askClaude is
  // unavailable, returns empty text, or errors out.
  function spBuildFallbackSummary(d) {
    if (!d || !d.kpis) return 'Snapshot not available for this period.';
    const k = d.kpis;
    const fmtPct = (v) => (typeof v === 'number' && isFinite(v)) ? (v * 100).toFixed(2) + '%' : '&mdash;';
    const fmtMoney = (v) => (typeof v === 'number' && isFinite(v)) ? '$' + v.toFixed(2) : '&mdash;';
    const fmtNum = (v) => (typeof v === 'number' && isFinite(v)) ? Math.round(v).toLocaleString() : '&mdash;';
    const sessions = fmtNum(k.sessions);
    const conv = fmtPct(k.conversionRate);
    const aov = fmtMoney(k.aov);
    const rps = fmtMoney(k.revenuePerSession);
    return `${sessions} sessions in this period with a ${conv} conversion rate. AOV is ${aov} and revenue per session is ${rps}.`;
  }

  // Debounced period switching. Clicking a period button used to fire a full MCP batch
  // (~9 calls) immediately, so quickly toggling 24h/7d/30d stacked dozens of concurrent
  // requests and tripped Noibu's rate limiter. Now a click only highlights the chosen
  // button and shows "Loading…"; the actual fetch is scheduled after a short quiet window,
  // so a burst of clicks collapses into a SINGLE render for whatever the user landed on.
  // Combined with the spRenderToken staleness guard in spRender, any batch from a
  // superseded click is also prevented from painting once it resolves.
  let spPendingTimer = null;
  let spRenderToken = 0;
  const SP_DEBOUNCE_MS = 350;

  function spSetPeriod(period) {
    // Immediate visual feedback without waiting on the network.
    document.querySelectorAll('.sp-selector button').forEach(b =>
      b.classList.toggle('active', b.dataset.period === period));
    const ctx = document.getElementById('sp-status-line');
    if (ctx) ctx.innerHTML = 'Loading...';

    if (spPendingTimer) clearTimeout(spPendingTimer);
    spPendingTimer = setTimeout(() => {
      spPendingTimer = null;
      spRender(period);
    }, SP_DEBOUNCE_MS);
  }

  // Initial render
  spRender('24h');


  // On hover, decide whether the tooltip should extend rightward (default) or leftward (when
  // the trigger sits close to the right edge so a 280px-wide tooltip would clip).
  // Measured against .sp-app's own rendered box, NOT window.innerWidth — the artifact's
  // layout viewport can be wider than what the host actually displays (e.g. a narrow
  // sidebar clips a wider iframe), so window.innerWidth under-reports the real cutoff and
  // the tooltip never flips even though it visibly overflows.
  // Uses event delegation on mouseover (which bubbles) so dynamically-rendered tips are covered.
  document.addEventListener('mouseover', (e) => {
    const tip = e.target.closest && e.target.closest('.sp-tip');
    if (!tip) return;
    const tooltip = tip.querySelector(':scope > .sp-tip-text');
    if (!tooltip) return;
    // Some tooltips are statically pinned (data-tip-anchor) because they sit in a known
    // rightmost column — leave those alone so this dynamic check can't undo the fix.
    if (tooltip.dataset.tipAnchor) return;
    const appEl = document.querySelector('.sp-app');
    const boundRight = appEl ? appEl.getBoundingClientRect().right : window.innerWidth;
    const rect = tip.getBoundingClientRect();
    const TOOLTIP_W = 280;
    const MARGIN = 16;
    if (rect.left + TOOLTIP_W > boundRight - MARGIN) {
      tooltip.classList.add('flip-left');
    } else {
      tooltip.classList.remove('flip-left');
    }
  });
</script>

```

## Artifact metadata

- `id`: domain-derived slug, always suffix-qualified, e.g. `store-pulse-flyinmiata-com` (see above)
- `title`: `Store Pulse — [Label]`, suffix-qualified only on Label collision — e.g. `Store
  Pulse — Flyinmiata`, or `Store Pulse — Atari (.com)` if `atari.ca` also exists (see above)
- `description`: `Live Store Pulse dashboard for [domain] — KPIs, funnel, and any enabled blocks`
- `mcp_tools`: `[<the resolved noibu_search_sessions tool name>]` — must exactly match what
  you substituted into `__NOIBU_TOOL_NAME__`, or every data call fails with an allowlist
  error even though the connector works fine in chat.
