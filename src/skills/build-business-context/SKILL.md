---
name: build-business-context
description: "Builds a rich business-context Markdown file (a CLAUDE.md / context.md) so Noibu skills and Claude stop hallucinating and reason with real context about the business. Use this skill whenever someone wants to create, set up, or improve their business context file, onboard a new store to Noibu, 'build my MD file', 'make a context file', 'set up my CLAUDE.md', capture company background for the AI, or asks why Claude keeps getting their business wrong. Also trigger on looser phrasings like 'help Claude understand my business', 'document my store for the AI', 'what should I tell Claude about my company', or when a user is starting with Noibu and has no context file yet. Even if the user just says 'build the MD file' or 'set up context', use this skill. It does deep web research on the business (always via a subagent), interviews the user about goals, money leaks, deployment process, and team setup, writes a clean Markdown file, then persists the context to the Noibu backend for the domain."
---

# Build Business Context (the MD file)

Noibu's analytics skills and Claude in general are dramatically more useful when they
have real context about the business. Without it, they fall back on generic
e-commerce assumptions and produce confidently wrong conclusions — flagging a PDP as
"broken" when it has a deliberate minimum-order quantity, or treating B2B abandonment
like B2C abandonment. This skill exists to capture that context once, in a single
Markdown file the user can load into every session (or ship to their whole team), so
nobody has to spend an hour pushing back to get to the truth.

**Your job:** produce one well-structured `CLAUDE.md`-style Markdown file by combining
(1) deep web research you run yourself and (2) a focused interview with the user about
things only they know. The output is a file — not a chat answer.

The section-by-section skeleton — and the model for tone, depth, and structure — lives in
`references/md-template.md`. Read it early; it is both the template to fill in and the
guide to the format the finished file should follow. The full bank of interview questions
lives in `references/interview-questions.md`.

---

## How this works, end to end

1. **Context existence check** - check if this domain already has context in Noibu. Resolve the domain and check for an existing context up front, so you don't do the work twice.
2. **Setup** — a few quick questions so you know what this file needs to cover, including whether they have recorded calls (Gong / Fellow) you can mine.
3. **Research** — you dispatch a subagent (or several in parallel) to do deep web research on the business, optionally pull and mine their recorded call transcripts, and come back with a draft of what was found.
4. **Interview** — you ask the user, in small conversational batches, the things research and transcripts can't tell you.
5. **Assemble** — you write the Markdown file, clearly marking anything still unconfirmed.
6. **Deliver** — you save the file and hand it over, with notes on what to verify.
7. **Persist** — you push the finished context into the Noibu backend so it's stored against the domain.

Do not skip straight to writing the file. The whole value here is that the file is
*grounded* — every claim either comes from research you can point to or from the user
directly. Guessing defeats the purpose.

---

## Test mode (fetch + persist only)

This mode exists to exercise just the two Noibu integration points — the *fetch* in
Step 1 and the *persist* in Step 7 — without running the generative middle (research,
call mining, interview, assembly).

**Trigger it** when the user explicitly asks for "test mode" (or "persist-only test")
**and uploads a Markdown file into the chat** to use as the context. Do not infer test
mode; require the explicit ask.

In test mode:

1. **Run Step 1 as written** — resolve the domain, capture both the UUID and the
   integer `numId`, and call `noibu_get_business_context`. This is the fetch under test.
   **Skip the overwrite gate**: if a context already exists, just tell the user it will
   be overwritten and continue — don't ask permission, since overwriting is the point.
2. **Skip Steps 2–6 entirely** — no setup questions, no research subagent, no call
   mining, no interview, no assembly. Use the **uploaded file's contents verbatim** as
   the context. Do not read from a path and do not edit, reformat, or summarize it.
3. **Run Step 7 as written** — call `noibu_insert_business_context` with the `numId`
   from Step 1 as `domainNumId` and the uploaded file's full contents as `fullContent`,
   exactly as uploaded. Then confirm it's saved to Noibu for `<domain>`.

Everything else in this skill is bypassed in test mode.

---

## Step 1 — Resolve the domain and check for existing context (do this first)

Before anything else — before the other setup questions, before research — pin down the
domain and find out whether it already has context:

1. **Ask which website / store this is for** and get the actual domain (e.g.
   `creativebag.com`). Confirm you've got the right site ("Just to confirm — this is
   [domain-name], the [one-line description]?").
2. **Resolve it** with `noibu_get_domain` (fall back to `noibu_list_domains`). Keep both the
   domain **UUID** (`id`) and its integer **`numId`** — the read uses the UUID, the final
   persist uses the `numId`, so holding both now means no re-resolving later. Then call
   `noibu_get_business_context` with the UUID (`domainId`).
3. **Gate on the result.** A context already exists when the response has a `businessContext`
   with a non-empty `fullContent`. If it does, tell the user and ask whether to regenerate —
   only continue if they say yes (you'll overwrite it at the end). If `businessContext` is
   null, continue.

Only once you're cleared to proceed, ask the rest of the setup questions below.

## Step 2 — Setup questions

Ask these together in one short batch — they're quick and they shape everything else:

1. **Do you already have any context files, brand guidelines, personas, or a strategy
   doc I should fold in?** If yes, read them before researching so you don't
   re-derive what they already wrote.
2. **Do you record customer or sales calls in Gong or Fellow?** If yes, ask whether you
   should pull the transcripts and mine them for context. Call transcripts are one of
   the richest grounding sources you can get — customers describe their pains, goals,
   buying process, and gotchas in their own words, which is far more reliable than
   anything inferred from a website. If they say yes, note which tool(s) and roughly
   which calls matter (a specific account, a date range, or "all of them"), so you can
   scope the pull in Step 3.

If they don't know the domain or the file is for a business that isn't online yet,
adapt — but you almost always need the domain to do useful research.

---

## Step 3 — Deep web research (always via a subagent)

Now go learn everything publicly knowable about this business. **Always run the web
research in a subagent — never do the searching and page-fetching on the main thread.**
This is read-heavy work whose value is the *conclusion*, not the raw pages, so it
belongs in a subagent that returns a structured findings summary (per the monorepo's
context-discipline rule). Dispatch a `general-purpose` agent (it has `WebSearch` and
`WebFetch`); for a broad business, split the work across several agents running in
parallel — e.g. one on company/ownership/history, one on the tech stack and apps, one
on positioning/competitors/brand voice — in a single message so they run concurrently.

Give each subagent: the confirmed company name and domain, the specific questions below
to answer, and an instruction to **return a skimmable findings summary with sources and
an explicit list of what it could not confirm** — not pasted page contents. Spend real
effort here; this is what keeps the eventual recommendations from being hallucinated.

Aim to answer as many of these as you can from public sources:

- **What they sell** — core product categories, flagship products, price points.
- **Who they sell to** — B2B, B2C, or both; consumer vs. trade; geography.
- **How long they've been around** — founding year, company age, any history/heritage.
- **Ownership structure** — family-owned, private, PE-backed, public, franchise, etc.
- **Size signals** — rough employee count, number of locations, revenue band if public.
- **Ecommerce platform** — Shopify, BigCommerce, Magento/Adobe Commerce, WooCommerce,
  Salesforce Commerce, custom, etc. (Check page source, `myshopify` redirects,
  `cdn.shopify.com`, BigCommerce headers, builtwith-style signals, careers pages
  mentioning the stack.)
- **Apps / tech in the stack** — reviews (Yotpo, Okendo), search (Searchanise,
  Algolia), loyalty, subscriptions, payment/checkout providers, analytics, CDPs.
- **Positioning & differentiators** — how they describe themselves, what they claim
  sets them apart, price posture (premium vs. value).
- **Competitors** — who they name or who obviously competes with them.
- **Brand voice** — read their homepage, About page, and a few product pages. Note
  spelling conventions (e.g. Canadian/UK spelling), tone, and personality.
- **Recent news** — funding, acquisitions, expansions, leadership changes, awards.

Then **report back what you found** in a short, skimmable summary, and explicitly
flag what you *couldn't* confirm. Tell the user something like: "Here's what I dug up.
I couldn't confirm your platform or your payment processor from the outside — those are
on my question list. Anything below that's wrong, correct me now." Letting them correct
research before the interview is much cheaper than fixing the final file.

Treat every research finding as provisional until the user confirms it. Mark
unconfirmed items as `[CONFIRM]` in the eventual file rather than stating them as fact.

---

## Step 3b — Mine recorded calls (Gong / Fellow), if the user has them

Only do this if the user said in setup that they record calls and want you to pull
them. Skip it entirely otherwise — don't go hunting for transcripts nobody asked for.

When they do want it, this is often the single highest-value input to the whole file.
A website tells you how a business markets itself; a sales or success call tells you
what's actually true — the customer's real goals, the objections, the dollar figures,
the "our checkout is held together with tape" admissions. Mine it well and you'll walk
into the interview already knowing half the answers.

How to do it:

1. **Load the tools.** The Gong and Fellow tools are not loaded by default — run a tool
   search (e.g. for "Gong call transcript" and "Fellow meeting transcript") to pull in
   the right ones before you try to use them. Use whichever tool(s) the user named.
2. **Find the relevant calls.** Use the scope they gave you in setup. If they said
   "all of them," list the available calls first and sanity-check the volume. If there
   are only a handful, pull them all. If there are dozens or hundreds, don't blindly
   pull everything — tell the user what you see ("I found ~80 calls going back a year"),
   and confirm whether to pull all of them or focus on a subset (most recent, a named
   account, customer-facing calls only). Pulling and reading hundreds of full
   transcripts is slow and usually unnecessary.
3. **Read the transcripts and extract context**, mapping what you hear to the same
   themes the interview covers so it slots cleanly into the file:
   - Goals and priorities stated in the customer's own words.
   - Money-leak suspicions and pain points ("we lose people at shipping options").
   - Hard numbers — conversion rate, AOV, ROAS, traffic, revenue. These are gold;
     capture the exact figure and which call it came from.
   - Customer / persona language and any "this metric is misleading because…" gotchas.
   - Tech stack, platform, checkout, and deployment / dev-team realities.
   - Competitors named, tools mentioned, and recurring complaints.
   - Brand voice and how the team talks about their own business.
4. **Attribute what you find.** When something comes from a call, note the source
   (e.g. "from the May 2 discovery call") so the user can trust and verify it. A figure
   pulled from a transcript is more reliable than a web guess, but still confirm the
   important ones — people misspeak on calls, and numbers drift.

Fold transcript findings into the same report-back you give after web research, clearly
labeled as coming from calls. Anything a transcript already answered, you can skip or
just confirm in the interview rather than asking cold — that's the payoff for mining
them.

---

## Step 4 — The interview (conversational, in small batches)

Research can tell you what the business *is*. It cannot tell you what the business
*wants*, where it's bleeding money, or how it ships code. That's what the interview is
for — and it's the single most important input for keeping future recommendations
grounded.

**Ask in small, themed batches — not one giant questionnaire.** Three or four related
questions at a time, then react to the answers and ask smart follow-ups before moving
to the next theme. This feels like a conversation, surfaces better answers, and lets
you adapt (e.g., if they say "we have no engineers," your deployment follow-ups change
entirely). The full question bank with follow-ups is in
`references/interview-questions.md` — read it and pull from it; don't ask every
question mechanically.

**Default to interactive `AskUserQuestion` widgets — they make the interview far faster
to answer than a wall of text, so prefer them wherever a question can carry a short menu
of choices.** To maximize how often the user gets widgets:

- **Make questions option-shaped.** Most interview questions become a clean multiple
  choice once you supply 2-4 likely answers. The tool always appends an "Other"
  free-text escape, so offering options never traps the user — it just saves them
  typing. Lead with the answer your Step 3 research most supports (label it
  `(likely)` / `(Recommended)`) so confirmation is one click.
- **Use your research to fill the options.** This is the payoff of researching first:
  pre-fill the platform you detected, the channels they obviously run, the competitors
  you found — as options, not open prompts. Accurate options make widgets usable; generic
  ones don't.
- **Use `multiSelect` when answers aren't mutually exclusive** — where money leaks
  (checkout / mobile / PDP / cart / search / paid), which KPIs they watch, which
  marketing channels they use. One widget, many boxes, instead of a paragraph.
- **Cap each widget at 4 questions** — that is the `AskUserQuestion` limit. A batch of 5
  spills to prose, so keep batches to 3-4 and split if needed.
- **Keep only the genuinely open questions as prose**, and ask them as a short follow-up
  *after* the widget batch, not instead of it. Two kinds resist widgets: exact numbers
  (target/current ROAS, conversion rate, AOV) and the "what about your store makes
  standard metrics misleading?" narrative — that one's whole value is the unprompted
  answer, so don't flatten it into options. Everything else should default to a widget.

Cover these themes, roughly in this order:

1. **Goals for the year.** What does success look like this year? Revenue target,
   growth target, a specific initiative? What's the single most important outcome?
2. **Where they think they're losing money.** Where on the site does it feel like money
   leaks out? Checkout? Mobile? A specific page or step? Paid traffic that doesn't
   convert? This is gold — it tells future skills where to look first.
3. **Performance targets and current numbers.** Target ROAS vs. current ROAS. Target
   conversion rate vs. current. AOV. Any KPI they actively watch. Numbers they give
   you are far more trustworthy than anything inferred.
4. **The customer, in their words.** Who's the most valuable customer? Any B2B/B2C
   split? Buyer personas? Anything about their store that makes standard e-commerce
   metrics misleading (minimum order values, minimum quantities, multi-session B2B
   buying, etc.)? Capture these "gotchas" carefully — they are exactly what prevents
   wrong analysis.
5. **Tech stack & site quirks.** Confirm the platform you researched. Custom theme or
   stock? Custom checkout? Payment processor and vaulting. Key apps. Anything fragile
   or non-standard that makes code changes risky.
6. **Deployment & dev team.** What's the typical deployment process? Do they have
   internal engineers, an agency, a freelancer, or no one? How do changes get reviewed
   and shipped? Is there a staging environment? How risk-averse is the team about
   merging changes? This determines what kinds of recommendations are even realistic.
7. **Support / CS workflow.** Team size, ticketing system (or lack of one), how issues
   get triaged and handed off.
8. **Marketing & channels.** Which channels they use, which are working, which are
   underused, biggest near-term opportunity. Seasonal patterns.
9. **How they want Claude to work with them.** Tone, format, plain language vs.
   technical, plan-before-acting, how opinionated to be.

Keep it human. If an answer opens a door ("paid is killing us"), walk through it before
moving on. You don't need an answer to every question — capture what they have, mark
the rest, and move on. A shorter honest file beats a padded one full of guesses.

---

## Step 5 — Assemble the Markdown file

Build the file from `references/md-template.md`, populated with research + interview
answers, matching the depth and voice its section prompts describe.

Principles that make these files actually work:

- **Most important guidance first.** Lead with whatever would most change how Claude
  reasons about this store — usually the customer framing and the "how to read our
  analytics" gotchas. A reader skimming the top should immediately get the things that
  prevent wrong conclusions.
- **Explain the *why*, not just the rule.** "Accordion clicks are research behaviour,
  not abandonment — B2B buyers check case quantities before a later logged-in reorder"
  beats a bare "don't flag accordion clicks." Future Claude reasons better with the
  reason.
- **Adapt sections to the business.** The template is a starting point, not a form.
  Drop sections that don't apply, add ones that do. A single-founder DTC store and a
  40-year family B2B supplier need different files.
- **Mark every unconfirmed thing `[CONFIRM]`.** Never print a guessed payment
  processor or platform as fact. It's better to flag a gap than to seed a future wrong
  analysis. Collect these into a short "Items to confirm" list at the very end so the
  user can quickly finalize.
- **End with a standing-reminders checklist.** A short numbered list restating the most
  important rules (the customer lens, the money-leak hotspots, the high-risk areas).
  This counters context dilution in long sessions — it keeps the critical rules in view
  even deep into a chat.
- **No em-dashes in the file** unless the user's own brand voice uses them. Keep prose
  clean and plain.

**Filename — always `<domain>-context.md`.** Use the domain name verbatim, lowercased, with
the suffix appended (render `www.my-store.com` as `www.my-store.com-context.md`). Don't vary
the suffix — this fixed `*-context.md` convention is what lets consuming skills find the
file by glob.

**Sentinel header — required.** Make the very first line of the file a sentinel comment
so a reader can identify the document and match it to a domain without parsing the prose:

```
<!-- noibu-business-context: uuid=<domain-uuid> domain=<domain-name> generated=<YYYY-MM-DD> -->
```

Use the domain **UUID** resolved in Step 1 and the bare store domain name. Skills that consume
this file match on this `uuid` (not the filename), so it must be present and correct — a file
whose sentinel `uuid` doesn't match the current run is ignored. Put the sentinel above the
`# [Company] — Context for Claude` title.

Save the file to the user's working folder.

---

## Step 6 — Deliver

Present the file and give the user three things, briefly:

1. **What's in it** — one or two sentences, not a recap of every section.
2. **What to confirm** — the `[CONFIRM]` items, so they can finalize quickly.
3. **How to use it**
    a. If the environment is Claude Cowork and we’re working in a project folder,
       save the file in project memory.
    b. If we’re in Claude Cowork but not in a project, recommend the user create a Cowork
       project for their domain, and to add the context file as an upload as part of creating
       the project.
    c. If we’re in Claude Code, drop the context file where they kep their `CLAUDE.md`.

Depending on the above, explain that the business context will load automatically when in
the project or for every session in Claude Code.

If there are any `[CONFIRM]` items in the file, ask them to go through them and you’ll update
the business context.

When finalized, tell the operator the file will now be saved to Noibu’s system so other team
members get it automatically.

---

## Step 7 — Persist to the Noibu backend

The saved Markdown file is the local artifact; the backend is where the context lives
so Noibu can use it. The domain was already resolved and the overwrite already cleared
in Step 1, so this is a single write: call `noibu_insert_business_context` with the
domain's integer **`numId`** as `domainNumId` (NOT the UUID) and the entire Markdown file
as **`fullContent`** — exactly as saved, nothing dropped, no splitting or summarizing. The
whole document goes into the one `fullContent` field. Then tell the user it's saved to Noibu for `<domain>`.

---

## Hard rules

- Never print researched facts (platform, processor, ownership, etc.) as confirmed —
  mark unconfirmed items `[CONFIRM]`.
- Always run the web research in a subagent (or several in parallel) — never search and
  fetch pages on the main thread. The subagent returns a findings summary, not raw pages.
- Always do the web research before the interview, and report findings before asking
  questions, so the user corrects bad research cheaply.
- Ask whether the user records calls in Gong or Fellow, and only pull transcripts if
  they say yes and ask you to. Scope large pulls with the user first; never silently
  read hundreds of calls. Attribute transcript-derived facts to the call they came from.
- Ask interview questions in small conversational batches (3-4 per batch), never as one
  wall of questions. Default to interactive `AskUserQuestion` widgets with
  research-informed options; reserve prose for genuinely open questions (exact numbers,
  the "what makes our metrics misleading" narrative).
- The output is always a saved Markdown file, never just a chat response.
- Lead the file with the highest-leverage context, and always include a
  standing-reminders checklist at the end.
- Adapt the structure to the business; the template is a guide, not a fill-in form.
- Resolve the domain and check for an existing context in Step 1, before any research.
  If one exists, get the user's go-ahead to regenerate before doing the work.
- Always persist the finished context to the Noibu backend: call
  `noibu_insert_business_context` with the domain's `numId` (`domainNumId`) and the entire
  Markdown file as `fullContent`.
