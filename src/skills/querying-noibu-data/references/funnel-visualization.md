# Funnel visualization

Read this reference when the user asks to chart, visualize, or "show" an ecommerce conversion funnel (e.g. "show me the funnel", "checkout funnel chart", "purchase journey chart", "render the funnel for last 7 days vs previous"). This is a renderer only — fetch the per-step session counts from `noibu_search_sessions` (or `noibu_get_page_visits`) first, then drive the chart with `show_widget`.

Analytical funnel prompts like "where do users drop off" or "abandonment by step" terminate at `noibu_get_page_visits` (see `references/page-visits.md`) — do not detour through this reference.

## How to invoke

1. **Read `funnel-template.html`** from the same directory as this reference.
2. **Replace `__STEPS__`** with the JSON step array and **`__OPTS__`** with an options object (see formats below).
3. **Call `show_widget`** with:
   - `title`: short snake_case name, e.g. `checkout_funnel`
   - `loading_messages`: 1–2 short messages, e.g. `["Drawing your funnel...", "Calculating dropoffs..."]`
   - `widget_code`: the template string after substitution

## Input format

### Steps (`__STEPS__`)

Each step needs a `name` and `sessions` count. `delta` is optional — include it to show a comparison badge next to the metric.

```json
[
  {"name": "Add to cart", "sessions": 6574, "delta": -2.1},
  {"name": "Checkout started", "sessions": 2420, "delta": -0.4},
  {"name": "Payment submitted", "sessions": 1391, "delta": 0},
  {"name": "Checkout completed", "sessions": 1283, "delta": 0.7}
]
```

### Delta field

- **Step 1** (session count): `delta` is a **percentage** change, e.g. `-5.5` → `↓ 5.5%`
- **Other steps** (conversion rate): `delta` is in **percentage points**, e.g. `0.7` → `↑ 0.7pp`
- `0` or rounds to zero → `± 0` in grey
- Positive → green (`#046249` / dark: `#2db87a`)
- Negative → orange (`#894c06` / dark: `#d47c1a`)
- Omit `delta` entirely (or set to `null`) to show the metric with no comparison badge

### Options (`__OPTS__`)

```json
{}
```

Use `{}` for the default labels-in-chart mode. Set `{"tooltips": true}` to hide all in-chart numbers and instead show them on bar hover. Tooltip mode is appropriate when the funnel is embedded in a larger visualization where too much detail would be visually noisy.

In tooltip mode, hovering a bar shows:
- **x sessions** — raw count for this step
- **y% dropoff from \<previous step name\>** — step-over-step dropoff (steps 2+ only)
- **z% continued to this step** — step-over-step continuation rate (steps 2+ only)

The step headers (name, metric, delta) are always visible regardless of mode.

### Step 1 metric formatting

When `delta` is present on step 1, the session count is abbreviated to `1k`, `2k`, `25k` etc. (nearest thousand, no decimal) to save space alongside the badge. Without a delta, the standard K/M formatter is used.

## Visual behaviours (automatic)

1. **Normal** — bars scale proportionally to the first step's sessions.
2. **Compressed first bar** — triggers when step 1 has ≥ 3.5× more sessions than step 2 (e.g. "On site" vs "Add to cart"). The first bar renders full-height with a zigzag cut; remaining bars rescale relative to step 2.
3. **Short bar labels** — when a bar is shorter than 30 px, session count and dropoff % float above the bar instead of sitting inside it.
4. **Delta truncation** — the metric text truncates with an ellipsis if the delta badge doesn't fit; the badge itself never truncates.
