# Run modes: the test summary, the "What would you like to automate?" card and the follow-up cards

Read this at Stage 1b (a test has just been picked) and again whenever a partial mode finishes (Stage 4). It holds the four run modes, which buttons each environment gets, the inline test summary, the card HTML, and the phrases the buttons send back.

Contents:
1. The four run modes
2. Which buttons appear (from the environment profile)
3. The test summary and the automation card (Stage 1b)
4. Reading the reply and resuming
5. The follow-up cards (end of a partial mode)
6. Fallback without `show_widget`

## 1. The four run modes

A mode is how much of the work the person asks Claude to automate before it stops and hands control back. The card frames each option as an automation the person switches on, not as a distance to travel. Every mode starts the same way (Noibu draft → implementation snippet → variation code, Stage 2a–2c); they differ in what happens after the code exists.

| Mode | Button label | Runs | Stops at | Creates |
|---|---|---|---|---|
| `full` | Launch an end-to-end test | 2 → 3 → 4 → 5 | The merge gate (user merges), then Start | Draft, branch, PR, preview, running test |
| `pr` | Prepare a pull request | 2 (incl. 2d) | Right after the PR is open; follow-up card | Draft, branch, PR |
| `theme` | Preview on a Shopify theme | 2a–2c → 3 | After QA on the unpublished theme; follow-up card | Draft, local branch, `nb-ab` preview theme |
| `preview` | Just show me the code | 2a–2c | After the diff is shown; follow-up card | Draft, local branch, a patch file |

The card speaks the merchant's language, not the toolchain's. Its labels and descriptions never name a git host, a connector, a branch, a repo, a preview method or a CLI: a merchant choosing what to automate does not need to know that the branch will be called `agent/ab-…` or that the pull request goes to GitHub, and a developer finds those details in the hand-off summary and the pull request itself. Keeping the card generic also means it reads the same on every store, whatever the environment behind it. Where a host has its own word for a pull request (GitLab's merge request), still say "pull request" on the card and switch to the host's word once the run is talking about a specific one.

Why the draft is created in every mode: the flag key and variation keys come from the draft, and the code can't be exact without them. A draft is invisible to shoppers and costs nothing, so it is the one write every mode shares. Nothing else is created until the mode says so. The card doesn't mention the draft: in the usual flow the person created it themselves with the "Create A/B test in Noibu" button before this card, and the summary above the card already links it.

Why `preview` is always last: it is the smallest step, and the card reads from "most automated" at the top to "just show me the code" at the bottom, so the user can scan down until they reach the amount of automation they want.

In `full` mode nothing changes from a run before this card existed: the two gates still hold (the user merges; the test starts only once the code is proven live).

## 2. Which buttons appear

Decide from the environment profile recorded in Stage 1 step 6. Order is fixed: `full`, `pr`, `theme`, `preview`. Drop the ones that don't apply; never reorder.

| Button | Shown when | Label |
|---|---|---|
| `full` | Always | "Launch an end-to-end test" |
| `pr` | Always | "Prepare a pull request" |
| `theme` | The store runs on a Shopify Online Store theme (6a step 3, or `candidates.json`'s `platform`), whether or not the Shopify connector is connected | "Preview on a Shopify theme" |
| `preview` | Always | "Just show me the code" |

The two pull-request buttons appear even when no way to open a pull request was found, and the theme button appears even when the Shopify connector is off. The missing piece is handled when the person picks the button (section 4, "When the pick needs a connector"): at that moment they are told what is needed and offered the connector, which is far more useful than a card that silently lacks the option they wanted. Nothing on the card itself mentions the gap.

Notes:
- Already-existing work (Stage 1 step 3): a DRAFT in Noibu is adopted in every mode; an open PR on the same idea is linked on the summary's "Open pull request" line and mentioned in the hand-off summary and the new PR's body, never on the card.
- `full` with no preview method (6c rung 5): QA runs on production after merge, before Start, as Stage 3 already does; say so at the merge gate, not on the card.

## 3. The test summary and the automation card (Stage 1b)

Stage 1b is two parts in one message: the test summary as plain chat text, then the automation card.

### The test summary (inline text, no widget)

The summary asks nothing and has no buttons, so it is ordinary structured chat text rather than a `show_widget` card: it renders at once, costs a fraction of the tokens, and keeps its links clickable. Send it first, on its own (in a host where text written between tool calls is summarized rather than shown verbatim, such as Cowork, send it with `SendUserMessage`), then render the card.

Every value comes from the picked test's `candidates.json` entry, the environment profile and the Noibu draft; never type a number from memory. `[...]` are placeholders; drop any line marked "only when present" that has nothing to show.

```markdown
| | [Test title] |
|---|---|
| **Store** | [domain] |
| **Change** | [One sentence: what changes for variation B, from devNotes.] |
| **Why** | [One sentence: why, from `why`, with at most 2 numbers from evidence[].numbers.] |
| **Where** | [surface / surfaceTemplate, e.g. Collection pages] |
| **Targeting** | [targeting, e.g. Mobile, all countries] |
| **Success metric** | [success metric label] |
| **Volume** | [metricVolume, e.g. ~4,200 sessions/week] |
| **Overlap** | [overlap line] (only when present) |
| **Fix first** | [fixFirst] (only when present) |
| **A/B test in Noibu** | [[Draft <id>](https://console.noibu.com/<domainId>/ab-tests/<id>) \| Not created yet] |
| **Open pull request** | [[#n](url) on the same idea] (only when step 6d found one) |
```

The whole summary is one two-column markdown table so it scans as label and value. Its header row is the test itself: the first cell left empty and the test title in the second; the domain is the first row, labelled Store, never a generic header such as "Test setup" or "Field / Value". Keep every cell to one line (a markdown table cell can't hold a line break): Change, Why, Overlap and Fix first are one short sentence each, and a pipe inside a value is escaped as `\|`. Drop a row marked "only when present" rather than leaving it empty. Leave a blank line before the table and after it.

"A/B test in Noibu" always appears and links the test's page in the Noibu console (`https://console.noibu.com/<domainId>/ab-tests/<testId>`), so the person can open the test without searching for it. "Not created yet" only when no draft exists (a typed request that skipped the Create button); Stage 2a creates it then.

The table is the whole message: no heading above it, no intro sentence ("Here's the test you picked"), no source or date line under it ("From your add to cart rate test recommendations (Oct 27, 2026)"), and nothing between it and the card.

### The automation card

Load `show_widget` with ToolSearch (`select:mcp__visualize__show_widget`) and call `mcp__visualize__read_me` once (module `interactive`, silently) if it hasn't been called in this chat. Then call `show_widget` with `title: "ab_test_run_mode"` and a loading message such as `["Checking what I can automate here..."]`.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:20px;">
  <p style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin:0 0 4px;">What would you like to automate?</p>
  <p style="font-size:12px;color:var(--color-text-tertiary);margin:0 0 16px;">I will draft the code but nothing goes live without your approval.</p>

  [full:]
  <div onclick="sendPrompt('Launch an end-to-end test')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">Launch an end-to-end test ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">Open a pull request on my code repository, check preview. Once merged, confirm it's live and start test.</p>
  </div>

  [pr:]
  <div onclick="sendPrompt('Prepare a pull request')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">Prepare a pull request ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">Open a pull request on my code repository.</p>
  </div>

  [theme — only on a Shopify Online Store theme:]
  <div onclick="sendPrompt('Preview on a Shopify theme')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">Preview on a Shopify theme ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">Build an unpublished copy of my live theme with the change and check it. Shoppers never see it.</p>
  </div>

  [preview — always, always last:]
  <div onclick="sendPrompt('Just show me the code')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">Just show me the code ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">Nothing is pushed or published, I show the code here.</p>
  </div>
</div>
```

The heading, subhead, labels and descriptions above are the card's wording; use them as written, with nothing appended (no host, branch, repo, preview method, "supersedes PR #n", connector note, or a line about drafting the test in Noibu). The descriptions are in the person's voice ("my code repository") because each one is what they are asking Claude to do. What a mode reuses or supersedes belongs in the hand-off summary.

After the call, output nothing and wait. The summary and the card speak for themselves, so the turn ends on the `show_widget` call with no closing line of any kind: not "The summary of draft <id> is above", not "Pick how much of the build to automate on the card when you're ready", not a pointer to either. This also holds when a host message afterwards says the response had no visible output: the card is the visible output.

## 4. Reading the reply and resuming

The button sends its phrase as the user's next message. Match it, or any paraphrase of it, to the mode:

- "launch an end-to-end test", "end to end", "run it", "all the way", "merge and start" → `full`
- "prepare a pull request", "pull request only", "merge request only", "just the PR", "open a PR" → `pr`
- "preview on a Shopify theme", "theme preview", "preview theme" → `theme`
- "just show me the code", "preview the implementation", "show me the code", "just the diff" → `preview`

Then check the pick against the environment profile ("When the pick needs a connector", below) before starting Stage 2.

A reply that instead changes the test ("make it the whole card, not just the button") is an edit to `createInput` / `devNotes`: apply it, say which fields changed, and show the summary and the card again with the new values. A reply that picks a different test goes back to Stage 1 step 5.

Unattended (scheduled, or no reply in this run after a reasonable wait): don't pick `full`. Take `pr` when a PR can be opened, since a PR is reviewable and reversible and is what the old skill produced before its merge gate; otherwise `preview`. Say which was taken, and why, at the top of the run's report.

Record the mode in the environment profile and add tasks for the stages it includes (Stage 2 always; 3 for `full` and `theme`; 4 always; 5 for `full`), named as SKILL.md's "The task list" names them.

### When the pick needs a connector

Two picks can land on a gap that Stage 1 step 6 found but did not mention (the card never does), and a git-host connector can also drop partway through the run. This is the one place in the skill where a connector is recommended, and it is done here rather than during detection because now the person has asked for the thing the connector unlocks, so the recommendation answers a question they just raised instead of interrupting them with one they didn't.

**`full` or `pr` (or a follow-up "create the pull request" from `preview` or `theme`) with no working connector for the git host** (write path rung 1 not available, whatever rungs 2 to 4 could do). "No working connector" covers three cases, handled the same way:

- the host's tools are absent (6b recorded rung 1 as missing);
- the tools are present but 6b's read failed on authentication (6b recorded rung 1 as needing reconnection);
- rung 1 worked at detection, but a call in Stage 2d (branch, file write, push, `create_pull_request` or the host's equivalent) fails on authentication: a 401/403, "bad credentials", an expired or revoked token, "re-authenticate"/"re-authorize", or a connection error naming the connector. Stop 2d there without retrying the call, keep the commit on the local branch, and run this flow before saying anything else about the failure.

In every case the fix is offered as the connector card, never as written instructions. Don't tell the person to "re-authorize the connector" or "reconnect it in settings", and don't ask them to type the repo as `owner/repo`: the card's Connect button is where connecting and re-authorising both happen, and the repo is found once the connector works (step 3).


1. **Ask where the code lives**, unless the host is already settled beyond doubt (a remote URL read from the repo, a connector-less read that named it, or a host connector that is installed but failing, which names the host itself). One `AskUserQuestion`, with the test named so the question has a reason: "To open a pull request for “<title>”, where is <domain>'s code hosted?" Options, in this order: "GitHub", "GitLab", "Bitbucket", "Azure DevOps" (the person can type another under Other). No answer: send one line asking them to name the host, and wait.
2. **Recommend the connector.** Look the host up in the connector registry (`SearchMcpRegistry`, loaded with ToolSearch, with the registry keyword from `references/git-hosts.md`, "Connector per host"; for Bitbucket that returns the Atlassian connector). Hosts that table lists with no connector (GitLab, Azure DevOps) skip the search and go straight to step 3's "no connector available" path. If a connector for that host exists, render it with `SuggestConnectors`, also when that connector is already installed but failing (the card is how it gets re-authorised), and send one line with it: that connecting it lets the run open the pull request itself (for a dropped connection: "The GitHub connection dropped, so I couldn't open the pull request. Reconnect it here and I'll pick up where I stopped."), and that they can say "connected" once it is set up, or "skip" to go on without it. Say in the same line that nothing was pushed when that is true. If the registry has none for that host, say so in one line and go on without a connector.
3. **After the reply.** "Connected" (or any reply once the host's tools appear in the tool list): re-run step 6b (ToolSearch for the host's tools plus one read). If the repo is still unknown, find it with the host's tools as 6b step 1 says (search for the store's name and domain, and for code mentioning `NoibuFeatureFlag`): one clear match is used; several are offered in one `AskUserQuestion` listing up to four of them (the person can type another under Other); none is asked for in that same question. Then continue in the picked mode with rung 1, resuming from the call that failed (the local branch and commit are reused, never rewritten). "Skip", a decline or no connector available: continue in the picked mode on the next rung that works (the host's CLI, plain `git` on their computer, or the patch hand-off), saying in one clause which path the run will take. A patch hand-off is built against the real repo's files; if the repo could not be read at all, say the patch can't be made against real paths yet rather than handing over one with placeholder paths. In `full` with no way to push at all, the run still writes the code, hands over the patch and stops at the hand-off; it can't reach the merge gate, so say that in the same clause rather than silently downgrading to `preview`.

**`theme` with the Shopify connector off or read-only** (the store is a Shopify Online Store theme, but 6a found no connector that can write themes), **or the Shopify connector dropping mid-run**. The mid-run case: 6a found the connector working, but a later Shopify call (the preview theme build, `noibu:store-preview-qa`, a `themeFilesUpsert`, or the Stage 5 checksum) fails on authentication: a 401/403, an expired or revoked token, "re-authenticate"/"re-authorize", or a connection error naming the connector. This applies in every mode that uses the connector, not only `theme`. Stop that call without retrying, keep what the run has built (local commit, PR, any preview theme already created), and run step 1 below before saying anything else about the failure, with this line: "The Shopify connection dropped, so I couldn't <build the preview theme / finish the QA / confirm the code is live>. Reconnect it here and I'll pick up where I stopped." Don't write re-authorisation steps into the chat. This is different from `Access denied for themeFilesUpsert` (`references/shopify-connector.md` section 3 rule 4): that is a missing Shopify exemption, not a dropped sign-in, and keeps its own handling.


1. Look up the Shopify connector (`SearchMcpRegistry` with "shopify") and render it with `SuggestConnectors`, with one line: the preview theme is built through the Shopify connector, so connecting it lets the run build an unpublished copy of the live theme; "connected" when done, or "skip". When the connector is connected but read-only, say instead which scope or mutation is missing (`write_themes`, `themeFilesUpsert`, from `references/shopify-connector.md` section 1) and that granting it unlocks the preview theme; the card for the connector is still worth showing, because re-authorising goes through the same place.
2. "Connected": re-run 6a (ToolSearch, `get-shop-info`, then `references/shopify-connector.md` sections 1 and 2). Gate now open → continue in `theme`, or for a mid-run drop resume from the call that failed, reusing the preview theme already created (re-check its `role`, `nb-ab ` prefix and ID as section 3 rule 3 says before writing to it). Still closed → say what is still missing and fall through to the next preview method in 6c, or offer `preview` if there is none.
3. "Skip" or no connector available: say in one clause that the theme preview needs the connector, and offer the remaining modes by showing the card again without the `theme` button. For a mid-run drop in another mode, don't show the card again: carry on with the next preview method in 6c for QA, or the served-asset fetch (then a human attestation) for proof of live, saying which in one clause.

Both flows ask once. If the person declines a connector, don't offer it again in this run, including on the follow-up cards; carry on with what is available.

Unattended: skip both flows (no one is there to connect anything), take the next available rung or preview method, and say so at the top of the report.

## 5. The follow-up cards (end of a partial mode)

A partial mode ends with a short summary (Stage 4) and then a card offering the next step, so the user keeps moving without re-explaining the test. The buttons resume this same run: the draft, branch, patch and preview from earlier stages are reused, never recreated. Title the widget `ab_test_next_step`.

Which buttons, in order (same filtering as section 2; drop what the environment can't do):

| After mode | Buttons |
|---|---|
| `preview` | "Launch an end-to-end test" (`full`) · "Prepare a pull request" (`pr`) · "Preview on a Shopify theme" (`theme`) · "Stop here" |
| `pr` | "QA it, then merge and start the test" (continues at Stage 3 with this PR, merge gate intact) · "Preview on a Shopify theme" (`theme`, built from the PR branch) · "Stop here — I'll merge later" |
| `theme` | "Prepare a pull request" (`pr`, from the code already written; the preview theme is kept) · "Launch an end-to-end test" (`full`, same, then QA is already done so it goes to the merge gate) · "Stop here" |

The follow-up card follows the same wording rule as the automation card: no host, branch, repo or preview-method names on it. A pick that needs a connector is handled as in section 4.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:20px;">
  <p style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin:0 0 16px;">What would you like to automate next?</p>
  [One block per button, in the table's order:]
  <div onclick="sendPrompt('[phrase]')" style="display:block;width:100%;padding:12px 16px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">
    <p style="font-size:14px;font-weight:500;color:var(--color-text-primary);margin:0 0 3px;">[Label] ↗</p>
    <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;">[What it reuses and what it creates, in plain words, e.g. "Uses the code I already wrote; opens the pull request and stops."]</p>
  </div>
  <button onclick="sendPrompt('Stop here')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;">Stop here</button>
</div>
```

Phrases the follow-up buttons send (match them as in section 4):
- "Continue: create the pull request from the code you wrote"
- "Continue: run it end to end from here"
- "Continue: preview it on a Shopify theme"
- "Continue: QA it, then after I merge, start the test"
- "Stop here"

After the call, output nothing and wait. On "Stop here", reply with one line saying how to resume later ("Say `continue the <title> test` or `/noibu:ab-testing continue PR #<n>` and I'll pick up from the PR.") and leave the preview theme question (shopify-connector.md section 4 rule 4) for that reply when a theme exists.

**Resuming in a later chat.** A request like "continue PR #12 on store.com" or "continue the Quick add test" re-runs Stage 0, finds the draft by title in `noibu_list_ab_tests` and the branch/PR by name, confirms the flag key in the code matches the draft, then continues from the first stage not yet done (an open PR → Stage 3; a merged one → Stage 5). Show the follow-up card for the mode that stopped, not the Stage 1b summary and card.

## 6. Fallback without `show_widget`

If ToolSearch finds no `mcp__visualize__show_widget`, or the call fails, ask with one `AskUserQuestion` instead: the question "What would you like to automate?", the same options in the same order with the same labels, the description text as each option's description, and `preview` last. The test summary is still sent as inline text before the question, exactly as with the card. The follow-up cards degrade the same way. Never skip the question because the widget is missing.
