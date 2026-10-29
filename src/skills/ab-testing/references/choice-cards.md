# The choice cards: the goal card and the pick-an-existing-test card

Two moments in a run ask the person to pick one thing from a short list: which goal the finder should aim at ("What do you want these tests to improve?"), and which earlier test to implement ("Which test should I implement?"). Both are `show_widget` cards built from the same chrome as the run-mode card in `references/run-modes.md`, so a person who sees two or three of these cards in one run sees one family, not three different question styles.

The buttons on both cards are **label only**. A subtitle under "Increase add to cart rate" would say "lift the share of sessions that add something to the cart", which is the label again in more words; a subtitle under a test title would repeat facts the person already saw on the recommendations page or is about to see on the run-mode card. These cards sit at points where the person wants to pick and move on, so each button is one line of text and nothing else. What a goal or test means in detail is one click away (the run-mode card shows the picked test in full before anything is created).

Contents:
1. Shared chrome and how to call `show_widget`
2. The goal card (finder Block 2)
3. The pages card (the page-views follow-up)
4. The pick-an-existing-test card (SKILL.md Stage 1 card 4b)
5. Reading the reply
6. Fallback without `show_widget`

## 1. Shared chrome and how to call `show_widget`

Load `show_widget` with ToolSearch (`select:mcp__visualize__show_widget`) if it is not already loaded (the finder's Block 1 loads it), and call `mcp__visualize__read_me` once (module `interactive`, silently) if this chat has not called it yet. Then call `show_widget` with the `title` given per card and two short loading messages.

Every card is one bordered panel: an uppercase eyebrow line naming the store, a heading that is the question, then the buttons stacked top to bottom. A button is a full-width `<button>` with the label and an arrow, in the same style as the run-mode card's "Stop here" button. `[...]` are placeholders; the surrounding markup is used as written.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);overflow:hidden;">
  <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);">
    <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">A/B test · [domain]</span>
  </div>
  <div style="padding:20px;">
    <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:0 0 16px;">[The question]</p>
    [One per option, in order:]
    <button onclick="sendPrompt('[phrase]')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">[Label] ↗</button>
    [The last button has margin-bottom:0.]
  </div>
</div>
```

Nothing goes between the heading and the buttons, and nothing goes under them: no explanatory paragraph, no legend, no "or type your own" line (the one line of chat after the widget says that). After every `show_widget` call, output exactly the one line given per card below, then wait. The card is the message.

## 2. The goal card (finder Block 2)

`title: "ab_test_goal"`. Loading messages such as `["Reading the metrics Noibu can measure...", "Laying out the goals..."]`.

- **Eyebrow:** "A/B test · [domain]".
- **Question:** "What do you want these tests to improve?"
- **Buttons**, one per goal the metric catalogue yields (`references/finder/goal-and-readiness.md`, "The goal question"), in this order: the non-page-scoped primary metrics first as "Increase [label]" (today "Increase add to cart rate", "Increase checkout completes"), then "Increase checkout starts", then "Increase page views", then "Reduce bounce rate" once the catalogue has a bounce metric (not before), then any newer primary catalogue metric as "Increase [label]" or "Reduce [label]" (metrics in the console-exclusion list and secondary-only metrics such as average order value never get a button; see `goal-and-readiness.md`, "The metric catalogue"), and always last, "Not sure / show me everything". On a split-checkout store the two checkout buttons are left off. There is no cap on the number of buttons; a metric that is new in the catalogue gets its own button rather than a mention in a sentence.
- **Phrases the buttons send:** "Improve [label]" for each metric button ("Improve add to cart rate", "Improve checkout starts", "Improve page views"; "Reduce bounce rate" for the bounce button), and "Show me everything" for the last one.
- **After the widget:** nothing; wait for the click.

Example with today's catalogue:

```html
<button onclick="sendPrompt('Improve add to cart rate')" ...>Increase add to cart rate ↗</button>
<button onclick="sendPrompt('Improve checkout completes')" ...>Increase checkout completes ↗</button>
<button onclick="sendPrompt('Improve checkout starts')" ...>Increase checkout starts ↗</button>
<button onclick="sendPrompt('Improve page views')" ...>Increase page views ↗</button>
<button onclick="sendPrompt('Show me everything')" ...>Not sure / show me everything ↗</button>
```

Once the catalogue has a bounce metric, one more button goes after page views:

```html
<button onclick="sendPrompt('Reduce bounce rate')" ...>Reduce bounce rate ↗</button>
```

## 3. The pages card (the page-views and bounce-rate follow-up)

Shown only when the goal card's answer was "Increase page views" or "Reduce bounce rate", in the readiness message. Same chrome. `title: "ab_test_goal_pages"`.

- **Question:** "Which pages?"
- **Buttons (page views):** "Product pages" (sends "Page views on product pages"), "Collection pages" (sends "Page views on collection pages"), "A specific page" (sends "Page views on a specific page").
- **Buttons (bounce rate):** "Homepage" (sends "Bounce rate on the homepage"), "Product pages" (sends "Bounce rate on product pages"), "Collection pages" (sends "Bounce rate on collection pages"), "A specific page" (sends "Bounce rate on a specific page"). The page group names come from the domain's own data where they differ from these defaults.
- **After the widget:** nothing; wait for the click.
- A "specific page" click without a URL gets one plain-text follow-up asking for the URL; a pasted URL in place of a click is that page.

## 4. The pick-an-existing-test card (SKILL.md Stage 1 card 4b)

Shown only after the person picks "Implement an existing A/B test" on the choose-a-test card (Stage 1 steps 1 to 3 run first). Never after a finder run: the findings card's buttons are the next step there. `title: "ab_test_pick_existing"`. Loading messages such as `["Gathering the test ideas from this chat...", "Checking what already exists in Noibu..."]`. The tests come only from finder runs earlier in this same chat; nothing is loaded from other chats, the artifact gallery or a published page.

- **Eyebrow:** "A/B test · [domain]".
- **Question:** "Which test should I implement?"
- **Buttons:** one per surviving test from the `candidates.json` files Stage 1 step 2 loaded from this chat's working folders, after step 3's de-duplication, ordered by each file's `rank`, newest run first on ties. The label is the test's `title`, exactly as the file spells it, and nothing else: no "(Recommended)", no source page, no metric, no "Draft #id" tag. A test that step 3 found as a DRAFT in Noibu is still listed under its plain title; Stage 2a adopts the draft, and the Stage 1b summary's "A/B test in Noibu" line is where that fact is shown. Show up to 6 buttons. When more survive, show the top 6 only, with no line about the rest; a typed test name is still matched.
- **Phrase each button sends:** "Implement the test: [title]" with the title verbatim after the colon, so the reply matches a `candidates.json` entry exactly (Stage 1 step 5 matches on title, exact then case-insensitive). Put no double quotes in the phrase: the `onclick` attribute is double-quoted, so a `"` inside it ends the attribute and the button goes dead. Any apostrophe in a title is escaped as `\'` inside the single-quoted `sendPrompt(...)` string (`Add a \'Free shipping\' line`); any `&` in a title or label is written `&amp;`.
- **After the widget:** nothing; wait for the click.
- **No tests to show** (steps 2 and 3 left none): no card. Say in one line why nothing is left to pick, then show the choose-a-test card again with its other two options (SKILL.md Stage 1 step 4b, "No tests left"). The option that leads here is only offered when this chat has a finder run, so an empty list means every test was dropped, not that none were found.

The Stage 1b test summary (`references/run-modes.md` section 3) follows the pick and shows the test in full (what changes, why, targeting, metric, volume, overlap, the A/B test in Noibu), so nothing is lost by keeping this card to titles.

## 5. Reading the reply

The button sends its phrase as the person's next message. Match it, or any paraphrase of it:

- Goal card: a phrase or typed reply naming a catalogue metric is that goal; "everything", "all", "not sure" is "All goals". A typed reply that describes a change ("test a sticky add to cart button") is the "Create a specific A/B test" route in SKILL.md with the change already described; honour it rather than asking for a goal.
- Pages card: "product", "collection", or a URL / "specific page".
- Pick-an-existing-test card: the title after "Implement the test:" is the pick (exact, then case-insensitive, then by rank if the reply says "the first one"). A description of a change is the "Create a specific A/B test" route; "something new" or a different goal is "Look for new A/B test opportunities".
- No reply, or a reply that matches nothing: don't pick for the person. Send one short line listing the labels and asking them to pick one, and wait. Unattended runs never reach these cards (the finder defaults to "All goals" and the build half never picks a test on its own).

## 6. Fallback without `show_widget`

If ToolSearch finds no `mcp__visualize__show_widget`, or the call fails, ask with one `AskUserQuestion` instead: the same question text, the same labels in the same order, and **no descriptions** (leave each option's description to one short neutral phrase only where the tool requires one, never a sentence). The question tool allows four options: for the goal card, show add to cart, checkout completes, checkout starts and page views, and name any other goals (bounce rate, once live) in the question text to type under Other, with "not sure" named as fine; for the pick-an-existing-test card, show the top four tests and say how many more there are. Never skip the question because the widget is missing.
