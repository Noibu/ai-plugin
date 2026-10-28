# The chat cards: the findings card and the implement card

Each test's hosted report is its full record (previews, evidence, setup,
dev notes). The person reading the chat should not have a report pushed
open on them the moment the finder finishes, and should not need to go
there to act either. The `show_widget` cards cover that:

- **The findings card** is the first and only thing in the chat once the
  finder is done: one short block per test under a small "Test 1",
  "Test 2" header (a small "What to change" label over the test's title and
  one sentence on the proposed change, a small "Why this test" label over the
  test's `why` sentence, so the card itself shows the data behind the idea,
  and two buttons: **Learn why and preview variation**, which puts that test's own report in
  the side panel, and **Create A/B test in Noibu**), the way the
  tech-diagnosis skill's findings card offers next steps. No report is
  published during the run (publishing opens it, with no way around
  that), so a test's "Learn why and preview variation" button is also what publishes its
  report; the run itself never publishes or opens one, and no link is
  pasted in chat. Nothing else from a report is repeated on the card: the
  full evidence, targeting, metric, volume and overlap are one click
  away on the report, and repeating them made the chat a second copy of
  it.
- **The implement card** appears only after a "Create A/B test in Noibu"
  click has produced a draft: the draft's id and flag key, the reminder
  that its code must be live before it starts, and one button,
  **Automate the implementation**, which starts the build. Creating a
  test and building it are two steps in order, not alternatives, so the
  build is offered once the draft exists rather than as a third button
  on the findings card, where it would read as an alternative to
  creating the draft. ("Learn why and preview variation" sits beside "Create" there because
  reading and creating are not in sequence: either can come first.)

Each report is still published with its own create button, and
`candidates.json` is still the handoff.

## How it is built

`scripts/build_page.py` writes `findings-card.html` next to the reports
on every build, from the same `page.json` (each test's `title`, `what`
and `why`), so the card and the reports never disagree and nothing is
retyped. The implement card is written on demand, after a draft exists,
by the same script:

    python <skill-dir>/scripts/build_page.py page.json implement <rank> <draft id> <flag key> <created|existing>

which writes `implement-card-<rank>.html` next to `page.json` (`created`
when this click made the draft, `existing` when it was already a draft).
The run never hand-writes any card's HTML: it `Read`s each file and
passes the content verbatim as `widget_code`.

None of the cards needs a report's URL: no report is published yet when
they render. The buttons name the domain and the test, and the run answers
a click from this run's `candidates.json` in the working folder (the
request itself never names the file), naming the report by link once it
has been published and its `pageUrls` entry is known. Rebuilding after a publish adds that link to
later renders, nothing else.

## When and how to render it

In the message that ends the finder run: `mcp__visualize__read_me` once (module `interactive`,
silently, unless it was already called in this chat), then one
`mcp__visualize__show_widget` call: `title: "ab_test_findings"`, loading
messages such as `["Ranking the tests...", "Laying out the cards..."]`,
`widget_code` = the content of `findings-card.html`. This is the first
thing the person sees after the finder finishes.

Both tools were loaded by Block 1's `ToolSearch`; if either is missing
from the tool list, skip the card silently and, in that one case, publish
every report in rank order per `references/output-format.md`, step 3, and
say in one line that the reports are open in the side panel (the card was
the only way to ask for them, so without it the person would have no way
to see a report).

No text before the card. After it, end the turn with exactly this line
and nothing else (quiet-mode rule 6):

> Pick a test on the card above when you're ready.

Do not render a card from memory after a context compaction; re-read
its HTML file, or rebuild it from `page.json` first.

## What the buttons send

Each button calls `sendPrompt(...)`, which posts its text to this chat as
if the person typed it. The texts are fixed by the build script. Because
the text shows up in the chat as the person's own message, it says only
what a person would say: the test, the domain and the report. It never
carries the skill's internals (file names such as `candidates.json`,
field names such as `createInput`, "draft only", "adopt it", "skip the
card"); those rules live here and in SKILL.md, where the run reads them
when the click arrives.

- **Learn why and preview variation** →
  `Open the report for test <rank> of <n>, "<setup title>", from the A/B
  test recommendations for <domain> (<report url>) in the side panel.`
- **Create A/B test in Noibu** →
  `Create test <rank> of <n>, "<setup title>", in Noibu from the A/B test
  recommendations for <domain> (<report url>).`
- **Automate the implementation** (implement card) →
  `/noibu:ab-testing Automate test <rank> of <n>, "<setup title>", from
  the A/B test recommendations for <domain> (<report url>). It's already
  in Noibu as A/B test <draft id>.`

The `(<report url>)` clause appears only once that test's report has been
published and its `pageUrls` entry added (output-format.md, step 4).

The build request has the shape SKILL.md's "already picked" entry
expects. Titles have `#` stripped (a `#` in a request can
read as an issue reference or a URL fragment downstream).

## Answering a click

A click arrives as the next user turn. It is the person's explicit
decision, made on a card they read, so act on it directly, without
re-asking, re-ranking or re-validating:

**Learn why and preview variation.** Find the test by rank (the request names "test <rank>
of <n>"). If that test's report is already published in this chat (its
rank has an entry in `page.json`'s `pageUrls`, or an earlier publish of
its file returned a URL), call the Artifact tool with `action: "open"` on
that URL. Otherwise publish that test's report file now per
`references/output-format.md`, step 3: the publish itself opens the
report in the side panel, so do not also call `open`. Then add the
returned URL to `pageUrls` under that rank, rebuild, and republish that
one file once (step 4); other tests' reports are not published by this
click. Then end the turn with no text: the report in the side panel is
the answer. Only when the publish or `open` call failed, say in one line
what failed. No summary of the test, no second card. A click when that
report is already showing is answered the same way.

**Create (draft).** Find the test in this run's `candidates.json` by
`title` (exact, then case-insensitive), falling back to `rank`. Call
`noibu_list_ab_tests` for the domain first: a test with that title that
is RUNNING or STOPPED means stop and say so; a DRAFT means it already
exists, so answer with its id and key instead of creating a second one.
Otherwise call `noibu_create_ab_test` with the test's `createInput`
exactly as the file has it, plus `domainId`, `rationale` ("Viewer
clicked Create A/B test on the findings card for \"<title>\""),
`skill` and `skillStep: "create-test"`. Check every metric code in
`createInput` against the tool's current schema enums first; a code the
schema no longer accepts is a reason to stop and say which, never to
substitute. Then write the implement card (`build_page.py page.json
implement <rank> <draft id> <flag key> created`, or `existing` when the
list call found the draft already there), `Read` it and render it with
`show_widget` (title `ab_test_implement`, loading message `["Draft
created..."]`). The card carries the link to the test in the Noibu
console itself: "Draft <id>" at the start of its text is a link (`https://console.noibu.com/<domainId>/ab-tests/<draft id>`;
the script also prints it after writing the card). Output nothing after
the card, no "Created in Noibu: …" line: the card already carries the
id, the flag key, the reminder and the link. If the create call fails,
say what failed in one line and render no card. This is the one case in which this session creates a test: a
click is a request, and the rule that the run itself never creates one
still holds.

**Automate the implementation.** Invoke the named skill with the
request's text, exactly as "When a button wakes this chat" in SKILL.md
says; Stage 2a adopts the named draft instead of creating a second one.
The card is an offer, not a gate: the person can leave it, and a typed
"build test 2" later does the same thing.
The working copy of `candidates.json` is next to the report files in this
run's working directory; that copy is the only source (publishing a report
is not a prerequisite, and a published report's supporting file is never
fetched). A build request that reaches a chat without that working folder
is answered as SKILL.md's "already picked" entry says: one line, then the
choose-a-test card.

A second click on the same test while a build is under way gets one line
pointing at the build already running, not a second build. A second
Create click on a test already drafted shows its implement card again
(`existing`).

## Without `show_widget`

If the tools are absent or the call fails, there is no fallback findings
card and no `AskUserQuestion` for it: each report's button creates the
draft and a typed request builds a test. Do not describe the tests in prose to make up for the missing
cards.

The implement card does have a fallback, because without it the offer
to build would be lost: give the draft id and
flag key in one sentence, with the console link as above, and ask with one `AskUserQuestion`, "Automate
the implementation of “<title>”?", options "Automate the implementation
(Recommended)" ("I'll write the variation code with Noibu's snippet,
then you choose what to automate: just the code, a pull request, or an
end-to-end test.") and "Not now" ("Keep the draft; build it yourself or
come back to it later."). The first is the same build request; "Not
now" ends the turn with no text.
