# Finder half: what it produces, prerequisites, and the rules that govern the run

Read this (with `browser.md`, `goal-and-readiness.md` and `phases.md`, plus `references/noibu-query-battery.md` and `references/site-validation.md`, all six in one message) when the finder route starts — the "Look for new A/B test opportunities" or "Create a specific A/B test" option of the choose-a-test card in SKILL.md. Block 1 (rule 1 below) goes in the message after those reads, since its tool list comes from this file.

Where the finder's references cite a section by name ("The browser", "Block 2", "Multi-market stores", "Phase 4", "quiet-mode rule 6"), they mean these four files: "The browser" is `browser.md`; "Block 2" and the goal question are `goal-and-readiness.md`; the phases and "Multi-market stores" are `phases.md`; the quiet-mode rules are below.

Produce a short list of A/B test recommendations for an ecommerce store,
aimed at the goal the merchant cares about, that the merchant can read,
look at, and create in Noibu without leaving its report. The bar for
inclusion is high: every recommendation must be supported by measured
Noibu data AND, when a browser is available, validated against the live
site. Fewer, better-supported
tests beat a long speculative list.

The deliverable is one hosted report per recommended test
(`references/output-format.md`), never rendered in the conversation. Each
report opens with the run's intro and then its one test: what to change, why the data supports it, the
variation shown next to the current site (`references/preview.md`), the
setup exactly as Noibu will receive it, how much traffic its success
metric sees, dev notes, and a "Create A/B test in Noibu" button that
creates the draft through the viewer's own Noibu connector when clicked
(`references/create-drafts.md`). Building a test is done from the
findings card in the chat, not from a report. The reports are built by
`scripts/build_page.py` from a `page.json` you write, so the run's job is
the content and the captures, not the HTML. Next to the reports, the run
writes a `candidates.json` (`references/handoffs/candidates.md`): the same
tests in a machine-readable shape, with the selectors and evidence the
build half needs to build one of them. It is published with each
report as a supporting file; nothing in the chat repeats it.

After the reports, the same tests are summarized in the chat as a findings
card (`references/findings-card.md`): one `show_widget` card in the
style of the tech-diagnosis findings card, one block per test with its
summary (what to change, and why: the measured problem) and two buttons, "Learn why and preview variation" and "Create A/B test in Noibu";
once a draft exists, an implement card offers "Automate the
implementation". Both are built by the same script (`findings-card.html`,
`implement-card-<rank>.html`), so they never disagree with the reports;
the findings card exists so the person can act from the chat without
opening a report, and open the one they want to read when they want it.
The reports stay the full record.

The finder route ends at the card. Writing the variation code, building
a preview theme and QA belong to this skill's build half (SKILL.md,
Stage 1b onward), which consumes `candidates.json`; the finder route
never opens a codebase, and nothing it sends offers to. The
build half starts in one of two ways: when the finder ran as the
"Look for new A/B test opportunities" route, a click on the implement card's
"Automate the implementation" button (shown once the test's draft
exists) picks the test and wakes this chat with it (SKILL.md, "Entering
with the test already picked"); when it ran as the "Create a specific
A/B test" route, SKILL.md continues from its Stage 1 step 3 with the one
test as the pick, with no second card.

Why this skill exists: analytics data alone produces recommendations that die
on contact with the site (proposing a feature that already exists, calling a
working feature broken, missing copy that contradicts policy). The live-site
and documentation phases exist to kill those errors before they reach the
reader. Expect validation to eliminate 1 to 3 of your data-derived candidates;
that is the skill working, not failing. And a goal exists because "here are
six things to test" makes the merchant do the prioritizing; "here are three
tests that move add to cart rate" is a decision they can act on. A readiness
check exists because a domain with no traffic, or without the events the
goal's metric counts, cannot be tested, and finding that out after the
battery and the walkthrough wastes the merchant's time and yours.

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "ab-testing"` and a short `skillStep` (see the `querying-noibu-data` skill).

## Speed and quiet-mode rules (read first, these govern the whole run)

The run is measured in round trips, not in tool calls. Every tool call that
does not depend on an earlier result goes in the same message as its
siblings. The target shape of a run, one message per step: Block 1 (setup,
which loads the create-test schema the metric catalogue is read from) →
Block 2 (goal card, a `show_widget` card built from that catalogue, + resolve, with the
browser tab and the scripts the goal needs) → readiness (the message after Block 2) → Block 3 (Batch
1 + the homepage read, concurrent) → Block 4 (Batch 2 + the goal's site
surfaces named by Batch 1, concurrent, plus the Phase 3-5 references) →
previews (one browser call per surface, all in one message) → write
page.json, build (which also writes candidates.json) → the findings
card. Anything that adds a serial step needs a reason.

1. **Batch the startup.** Block 1, in ONE message: invoke the
   `noibu:querying-noibu-data` skill (and the `claude-in-chrome` skill
   only when no built-in browser tools are in the tool list, since Chrome
   is then the only browser; otherwise it is invoked later, in Block 4,
   when Chrome opens the desktop preview tab — see "The browser"), load every
   deferred tool schema the run needs in ONE `ToolSearch` call (`select:`
   with a comma-separated list of the names exactly as the tool list
   shows them: the Noibu tools `noibu_get_domain`, `noibu_list_domains`,
   `noibu_check_data_connection`, `noibu_get_business_context`,
   `noibu_search_sessions`, `noibu_get_page_visits`,
   `noibu_list_priority_errors`, `noibu_list_ab_tests`; the built-in
   browser tools `mcp__remote-devices__Claude_Browser__tabs_context`,
   `preview_start`, `request_access`, `resize_window`, `tabs_create`,
   `tabs_close`, `navigate`, `get_page_text`, `find`, `computer`,
   `browser_batch`, `javascript_tool` with that prefix, when they are in
   the tool list; the Chrome tools
   `mcp__claude-in-chrome__tabs_context_mcp`, `list_connected_browsers`,
   `tabs_create_mcp`, `tabs_close_mcp`, `navigate`, `get_page_text`,
   `find`, `computer`, `browser_batch`, `javascript_tool` with that
   prefix, when they are in the tool list; plus
   `noibu_create_ab_test`, whose schema is the metric catalogue (and
   which a card click may later ask this chat to call), the findings
   card's `mcp__visualize__read_me` and `mcp__visualize__show_widget`,
   and `TaskCreate` and `TaskUpdate`). The goal card (below; `references/choice-cards.md`) waits for
   Block 2, because its options come from the catalogue that `ToolSearch`
   returns. Tools that `ToolSearch` loads can only be called from the
   next message, so task creation waits for Block 2 too. If
   `TaskCreate`/`TaskUpdate` are not returned, skip the task list
   silently.
2. **Two query batches, maximum.** Run the battery in
   `references/noibu-query-battery.md` as two parallel batches (see
   "Battery shape" below). The readiness reads are not a batch: they are
   four small reads that decide whether the battery runs at all. One
   extra follow-up query is allowed only when a batch result is
   uninterpretable without it. Do not explore.
3. **The site read rides in the query blocks.** It never owns a block:
   Batch A (homepage and policies, which need no data) goes in the Block
   3 message with Batch 1; Batch B (the goal's surfaces, at the URLs
   Batch 1 names) goes in the Block 4 message with Batch 2. Which
   surfaces, and whether the cart path runs, is the goal table in
   `references/site-validation.md`; see Phase 1. **One page per browser
   call:** a `browser_batch` that runs past about a minute returns
   nothing, so every browser phase (Batch B, previews) is one call per
   page, all in the same message; they run in order, each with its own
   limit.
4. **No rendering tools.** Do NOT call `noibu_visualize_page_visits` or
   `noibu_show_session_replay`. Get scroll behavior from
   QUANTILES(MAX_SCROLL_DEPTH_RATIO) and click behavior from CLICKED_TEXT
   queries instead — same numbers, no iframes, no mandatory console URLs in
   the reply. Exception: the user explicitly asks for a heatmap or replay.
5. **No narration.** Do not summarize between tool calls, do not paste query
   results, findings, or data tables into the chat, and do not describe what
   you are about to do. The only visible process is the task list, when
   the environment has one. Mark a task complete inside whatever message
   you send next, never in a message of its own. Write one sentence in chat
   only if you hit a blocker, or when readiness stops the run (Block 2).
6. **The run ends on the findings card and one fixed line.** Reports are
   built into the working folder, not published; each is published when its
   "Learn why and preview variation" button is clicked (or all of them at
   the end of an unattended run). The last thing in the turn is the
   findings card (`references/findings-card.md`) with no text before it,
   then exactly this line and nothing else: "Pick a test on the card above when you're ready." No URL, no summary. Anything you would want to tell the person goes into
   `page.json` `caveats` as one short footer line each, only when it
   applies: which browser read the site, or that none did (suggest a
   re-run from the desktop app with Claude in Chrome connected); that one
   item was added to and removed from the cart; a tab left open on a
   variation, and in which browser; desktop previews taken in the built-in
   browser; the goal defaulted to "All goals" or was switched (checkout on
   another domain, metric not measurable here); thin traffic; several
   markets, page written for the top one; no business context saved; a
   localized storefront most traffic does not see. Candidate counts and
   kills go in `run.killed` in `candidates.json`, never on the report.
7. **Read each reference once, in a message that is already going
   out.** Read `references/noibu-query-battery.md` and
   `references/site-validation.md` in Block 1 (the battery is needed for
   readiness and both query blocks; the site-read file names the scripts
   to `Read` once the goal is known); `references/output-format.md`,
   `references/preview.md`, `references/create-drafts.md` (for its metric rules and
   mapping table) and `references/findings-card.md` in the Block 4
   message, since they depend on nothing
   and reading them later costs a serial step of its own;
   `references/handoffs/candidates.md`
   never during a run (the build script writes `candidates.json`; the
   file documents the shape for whoever consumes it);
   `references/shared/*` never (those files are read by the build half
   and play no part in the finder route). The four finder files
   (`references/finder/run-rules.md`, `browser.md`,
   `goal-and-readiness.md`, `phases.md`) are read together in Block 1,
   in the same message as the two references above. After a context
   compaction, re-open only the file the current phase needs
   (`goal-and-readiness.md` in Block 2, `phases.md` from Block 3 on,
   `browser.md` for any browser step, plus the phase's own reference),
   never the shared references.

## Prerequisites

- Noibu MCP connector connected. The `noibu:querying-noibu-data` skill (or
  its equivalent reference) must be loaded before the first `noibu_*` call —
  it carries the orderBy requirement, row caps (sessions 100 rows, page
  visits 1,500 rows), measure-uniqueness rules that queries fail without,
  the domain-resolution flow, and the rule to check sibling domains before
  reporting a zero. This skill does not restate those; it cites them.
- A browser for the live-site read and the previews: the built-in
  browser for the read and mobile previews, Claude in Chrome for desktop
  previews, each covering for the other when it is missing (checked
  once, in Block 2, per "The browser" below). If neither is
  available, the run still completes: run the data phase, mark every
  unvalidated structural claim as inferred — do not silently skip
  validation — and put the desktop-app suggestion in a footer line
  (quiet-mode rule 6).
- A domain name or UUID from the user. If neither is given, resolve with
  `noibu_list_domains` and use the result; do not stall on asking.

Who runs it: anyone with read access to the domain in Noibu. The run
changes nothing in the Noibu account. On the store, its only effect is the
cart round trip for cart and checkout goals: `add_to_cart.js` adds one
in-stock item and `clear_cart.js` removes it, the add shows up in the
store's analytics, and a footer line on the page says so (quiet-mode rule 6). It
never fills in a checkout field or places an order. Its other writes are
the published page and the draft a viewer creates by clicking a button,
with their own credentials. A skill that builds a test from
`candidates.json` needs the merchant's own repository and platform
connections; the finder route does not, and it never asks for a codebase
(the build half asks for them in Stage 1 step 6, after a test is picked).

Shared references: `references/shared/` (`noibu-feature-flag-sdk.md`,
`platforms.md`) is read by this skill's build half (SKILL.md, "Shared
references"). No finder phase reads it.
