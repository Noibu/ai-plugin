# Generic / unknown platform

Read alongside `references/wcag-violations.md` when the domain's platform is
unrecognised, or the site runs a headless/custom frontend where no
`references/platforms/<platform>.md` file applies.

## Fix locations

Auto-draft PR only — where a violation gets fixed in code.

1. Take the violation's selector/class/id from axe-core's `nodes` data.
2. If GitHub is connected, search the repo for it before guessing:
   - One clear match → that file is the fix location.
   - Matches across multiple files/templates → shared component, high
     leverage, same "one fix, many pages" logic as a known platform.
   - No searchable match (e.g. a build-generated class) → fall through to
     component-role classification below.
3. If GitHub isn't connected yet, or the search comes up empty, classify by
   component role:
   - Shared nav/header pattern → fix there, affects every page rendering it.
   - Repeated template (product card, listing row, form) → fix in the
     template.
   - Global style (contrast, focus) → stylesheet, not markup.
   - One-off page-level element → lower leverage, note as such.

Can't map it confidently either way? Log as `needs-investigation` with
selector, rule id, and criterion. Don't guess.
