# Shopify

Read alongside `references/wcag-violations.md` when the domain's platform is
Shopify.

## Recurring patterns

Audit-relevant — applies whether or not a fix is being written.

- 403/429 with no accompanying axe-core finding: Shopify bot/abuse
  protection, not a WCAG defect. Note, don't file.

## Fix locations

Auto-draft PR only — where a violation gets fixed in code.

| Violation type | Usual location |
|---|---|
| Colour contrast | `assets/*.css` / `*.scss.liquid`; `config/settings_data.json` only if merchant-editable via theme editor |
| Nested interactive controls (4.1.2) | `sections/header.liquid`, `snippets/mega-menu.liquid` |
| Heading hierarchy (1.3.1) | section rendering the heading — swap tag, keep class |
| Missing alt text (1.1.1) | product/collection card snippets — `{{ image.alt \| escape }}` with fallback, `alt=""` for decorative. If `image.alt` itself is empty, that's not a templating fix — log as `needs-investigation` rather than inventing text |
| Missing focus indicators (2.4.7) | global stylesheet — `:focus-visible`, never `outline: none` without replacement |
| Unlabelled form controls | form snippet — `<label>` or `aria-label`, not placeholder |
| Hidden-but-DOM-present content | offending snippet — `display: none` or remove |
| Country/currency selector in footer | `sections/footer.liquid` + localisation snippets |

Most violations are theme-level (`sections/`, `snippets/`, `assets/*.css`,
`layout/theme.liquid`). One violation appearing on multiple pages = one
shared-component fix, not several.

### Rules

- Never touch `checkout.liquid` or anything under `checkout/`.
- Never edit `config/settings_data.json` for merchant-managed values — file
  the issue instead, describe the setting to change.
- Contrast fixes: state the computed before/after ratio (e.g. "#8A8A8A →
  #6E6E6E on #FFFFFF: 3.9:1 → 5.1:1").
- Prefer additive CSS over deleting existing rules.
- Build step present, or repo doesn't match live theme structure → stop,
  report the mismatch.
- Headless frontend (Next.js, Remix, Hydrogen) → theme paths above don't
  apply. Classify by component role per the fallback in
  `platforms/generic.md` instead.
