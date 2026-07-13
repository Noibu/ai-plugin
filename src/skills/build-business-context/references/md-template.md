# Business Context MD — Section Skeleton

This is the structure to populate, not a rigid form. Reorder, drop, or add sections to
fit the business. The one constant: lead with whatever most changes how Claude reasons
about this store, and close with a standing-reminders checklist.

Replace every `[bracketed]` prompt with real content. Anything you can't confirm stays
as `[CONFIRM: what you need]`.

The first line must be the sentinel comment (real UUID, domain name, and date substituted).
It lets this skill (and others) identify the document and match it to a domain without
parsing the prose — keep it verbatim in form.

---

```markdown
<!-- noibu-business-context: uuid=<domain-uuid> domain=<domain-name> generated=<YYYY-MM-DD> -->

# [Company] — Context for Claude

[One paragraph: what this file is and why to read it before answering anything about
the business. Name the single most important section to read first.]

---

## Company snapshot

**[Company]** is a [ownership: family-owned / private / PE-backed / public] [industry]
business, [age / founded YEAR], based in [location]. [One or two sentences on what they
do and how they sell — channels: ecommerce, retail, wholesale, custom, etc.]

- **[Channel 1]** — [description]
- **[Channel 2]** — [description]

**Top product categories:** [list].

**Positioning / what makes them different:** [value vs. premium, selection, service,
small quantities, etc.]. Competes against [competitors]; competes on [basis], not on
[e.g. ad budget].

---

## Customer base

[The single most important framing for interpreting this store's data. Who is the
primary, strategically-prioritized customer? Any B2B/B2C split with rough revenue mix?
What's secondary? This section tells future analysis whose behavior to optimize for.]

---

## How to read [Company] analytics

[THE CENTERPIECE for most stores. Default e-commerce interpretations that will mislead
on this store, and the specific site mechanics that distort standard KPIs. Examples of
gotchas to capture if they apply:]

- Minimum order value or minimum order quantities that make low conversion *expected*
  on certain pages, not a leak to fix.
- Browse/research behaviors that look like abandonment but aren't (spec accordions,
  tier-price comparisons, multi-session B2B buying).
- B2B vs. B2C signal-detection hierarchy (logged-in account, AOV bands, product mix,
  etc.) and an instruction to produce segmented views, not a single site-wide number.
- Any worked example of a past wrong conclusion, so Claude doesn't repeat it.

[For each rule, explain the WHY so Claude can generalize.]

---

## Goals & priorities

[What success looks like this year. The single most important outcome. Top 3-4
priorities.]

---

## Where we think we're losing money

[The user's own read on where the site leaks revenue — checkout, mobile, paid traffic,
a specific page or step. This points future skills at the right starting place. Frame
as hypotheses to validate, not confirmed facts.]

---

## Performance targets

[Target vs. current for the KPIs they watch. Fill what you have; mark the rest CONFIRM.]

| Metric | Target | Current |
|---|---|---|
| ROAS | [x] | [x] |
| Conversion rate | [x] | [x] |
| AOV | [x] | [x] |
| [other] | [x] | [x] |

---

## Tech stack & site architecture

- **Platform:** [Shopify / BigCommerce / Magento / custom] — [stock or custom theme].
- **Checkout:** [native or customized — note risk level].
- **Payments:** [processor], [vaulting provider].
- **Key apps:** [reviews, search, loyalty, subscriptions, analytics, CDP].
- **Code access:** [is the repo connected to Claude? GitHub connector?].

### Change-risk rule

[Which areas are high-risk (usually checkout) vs. low-risk. Where to build initial
confidence with the dev team. Whether a staging environment exists.]

---

## Deployment & dev team

[Who builds and ships changes: internal engineers, agency, freelancer, or no one.
Typical deployment process. Review and merge workflow. Staging. How risk-averse the
team is about merging AI-generated changes. This determines what recommendations are
realistic — frame PRs and advice accordingly.]

---

## Support / CS workflow

[Team size, ticketing system (or none), how issues are triaged and handed to dev.
Constraints on process change.]

---

## Brand voice

[Tone and personality. Spelling conventions (e.g. Canadian/UK). What to avoid
(corporate-speak, etc.). Whether to produce multiple copy variations. Whether to anchor
content to a persona.]

---

## Buyer personas

[Only if the user has them or they're worth deriving. For each: who they are,
demographics, needs, what they care about, pain points, why-us, voice, channels. A
quick-reference table at the end is handy.]

---

## Marketing strategy

[North star, channel priorities (which work, which are underused, biggest near-term
opportunity), seasonal calendar if relevant, what they measure.]

---

## Key business challenges

[The handful of real constraints — acquisition cost, channel efficiency, content
capacity, etc. Numbered list.]

---

## How to work with the [Company] team

[Working preferences: directness, plain language vs. technical, produce-don't-describe,
give-an-opinion vs. list-options, plan-before-acting, suggest next steps, etc.]

---

## Standing reminders

[A short numbered checklist restating the most important rules from above, so they stay
in context across long sessions. Pull the 5-8 highest-leverage rules — the customer
lens, the money-leak hotspots, the high-risk areas, the must-segment instruction.]

---

## Items to confirm

[Every [CONFIRM] item collected in one place so the user can finalize the file fast.]
```
