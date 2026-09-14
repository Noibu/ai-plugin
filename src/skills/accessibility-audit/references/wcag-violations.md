# WCAG violations reference — platform-agnostic

Scanning engine: **axe-core**, injected directly into the page. Checks
structural/programmatic WCAG failures only — not content quality (alt text
accuracy, link text phrasing, heading wording).

For fix locations, read `references/platforms/<platform>.md` if the domain's
platform is known, otherwise `references/platforms/generic.md`. File-path/
template guidance belongs there, not here.

---

## Common violations

| Issue | WCAG criterion | Level |
|---|---|---|
| Colour contrast < 4.5:1 (normal text) | 1.4.3 Contrast (Minimum) | AA |
| Colour contrast < 3:1 (large text / UI) | 1.4.11 Non-text Contrast | AA |
| Heading levels skip (e.g. H1 → H3) | 1.3.1 Info and Relationships | A |
| Interactive control nested inside another interactive control | 4.1.2 Name, Role, Value | A |
| Missing alt attribute on images | 1.1.1 Non-text Content | A |
| Hidden form fields still readable by screen readers | 1.3.1 / 4.1.2 | A |
| Broken link / 404 | 2.4.4 Link Purpose (In Context) | A |
| Missing focus indicators | 2.4.7 Focus Visible | AA |
| Unlabelled form control | 3.3.2 Labels or Instructions | A |

Not exhaustive. axe-core's `violations` array is authoritative — record
everything it returns. For a rule not in this table, use its `helpUrl` for
the WCAG criterion.

In any output shown to a person (report, chat summary), link each criterion
to its W3C page: `https://www.w3.org/WAI/WCAG21/Understanding/<slug>.html`
— e.g. `1.4.3` → `contrast-minimum`, `4.1.2` → `name-role-value`. Use
axe-core's `helpUrl` to confirm the slug rather than guessing it.

## Recurring patterns

- Promo banners: most common contrast failure (light text on saturated
  background, often just under 4.5:1).
- Nav dropdowns: nested `<a>`/`<button>` → 4.1.2. Fix once in the shared
  nav/header component.
- Filter/sort labels marked up as `<h2>` for styling → 1.3.1, `moderate`.
- Footer country/currency selectors: visually hidden but DOM-present.
- Third-party widgets (rewards, chat, reviews): not fixable in site code —
  `needs-investigation`, note to raise with vendor. Never patch a
  third-party embed directly.
- Clearance/sale pages: verify 200 before scanning — high-traffic 404s are
  `critical` (2.4.4) but the fix is nav/redirect, not code; route to a human.

---

## Severity

Use axe-core's `impact` field as-is: `minor` | `moderate` | `serious` |
`critical`.

- 404 on a high-traffic page: not returned by axe-core (it scans a loaded
  page) — assign `critical` manually (WCAG 2.4.4).

---

## Pooling

Before scoring or reporting anything, pool every violation across all
audited pages into one list. Deduplicate first — this is the most
important step.

- If the same **selector + criterion** appears on multiple pages, it's one
  shared-component violation, not several. Collapse it into a single
  pooled entry and sum the traffic across every page it appears on.
- "Selector" means the shared-component identifier (a class/snippet/
  section — e.g. `.promo-banner`, `header nav a`), not every literal DOM
  node. 33 product-card titles sharing one CSS rule are one pooled entry
  with 33 instances, not 33 entries.
- Two violations with the same rule id but different selectors (e.g. body
  text contrast vs. a banner's contrast) are different pooled entries —
  they're different fixes, even under the same rule.
- Pooling by exact selector + criterion means axe-core's `impact` should
  already be uniform within a pooled entry — if it isn't, use the most
  severe value present.

## Priority

Shared ranking, used the same way in reports and when automatically
drafting pull requests (PR) — pool first (see **Pooling** above), then
score each pooled entry:

```
priority = severity_weight × log10(total_30d_pageviews_affected) × breadth_multiplier

severity_weight (from axe-core impact):
  critical  5.0
  serious   3.0
  moderate  1.5
  minor     0.5

breadth_multiplier:
  1.0 + (0.2 × number of pages the violation appears on), capped at 2.0
```

Traffic is log-scaled deliberately — a violation shouldn't get 9x the
weight just because its page has 9x the pageviews of another. Breadth is
scored separately from traffic so a shared-component violation (same
selector pattern on many pages) ranks above a single-page violation with
comparable per-page traffic.

Sort descending by `priority`. This produces the ranking for both a
report's "ordered by priority" list and the top-N selection when
automatically drafting pull requests (PR) — don't compute it differently
in the two modes.

---

## Scan mechanics

1. Navigate to the plain page URL (no query parameter).
2. Inject axe-core, call `axe.run()`. Returns
   `{ url, timestamp, violations, passes, incomplete, inapplicable }`.
3. Each `violations` entry: `id`, `impact`, `helpUrl`, `nodes` (CSS
   `target` selectors, HTML snippets, `tags` e.g. `wcag2a`, `wcag21aa`).
4. Parse `violations` directly. No screenshots — the report and any PR/ticket
   evidence use the selector + HTML snippet from `nodes` instead. Screenshot
   capture and per-finding cropping was slow and token-heavy for little
   marginal value over that text data.
5. `incomplete` entries: not confirmed violations — surface separately as
   "needs manual review" if the count is notable.

Record per page: URL, 30-day pageview count, violation count by `impact`, and
`{rule id, WCAG tag(s), impact, selector, html snippet, helpUrl}` per
violation.

**If injection fails** (CSP block):
- Retry once against the plain URL.
- If site-wide, report it explicitly — don't silently switch scanning
  engines.


