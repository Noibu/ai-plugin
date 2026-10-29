# Build half, Stage 2: draft the test, write the code, open the PR

Read this once the run mode is known (Stage 1b). Stage numbering, file references and the SDK/platform files are the ones SKILL.md names.

"SDK file" below is `references/shared/noibu-feature-flag-sdk.md`; `platforms.md` is `references/shared/platforms.md`; "6b", "6c", "Stage 1 step N" and "Rules that apply throughout" are sections of SKILL.md.

Runs in every mode. 2a–2c always; 2d only in `full` and `pr`. In `theme` and `preview`, commit on the local branch `agent/ab-<slug>` but don't push.

### 2a. Create the Noibu draft
- **Draft already in Noibu** (Stage 1 step 3, e.g. someone clicked the page's Create button): adopt it, don't create a second one. Read its id, key and variation keys from `noibu_list_ab_tests` and check its config against the test's `createInput`. If they differ, show the differences and ask whether to keep the draft as it is or update it to match (`noibu_update_ab_test`, DRAFT only).
- **Otherwise** create it with `noibu_create_ab_test` (draft only), passing the test's `createInput` exactly as the file has it, plus `domainId` and `rationale`. Before the call, check every metric in it against the tool's current schema enums (`successMetric.metric`, `secondaryMetrics[].metric`); if one is no longer accepted, stop and tell the user rather than guessing a substitute. If the user asked for changes at the card, apply only those to `createInput` and say which fields changed. Without a hand-off file (Stage 1 step 2 fallback): title = the card title, hypothesis = the evidence with real numbers, the date window and the correlational caveat if any, metrics and targeting from the card, variation A the control (`isControl: true`), B named per the SDK file's naming rule.
- Record the **test id, flag key and variation keys**, and treat them as the SDK file says. List the test's `consoleFollowUps` (for example a country condition the create tool can't set) for the Stage 4 summary.

### 2b. Get Noibu's implementation code
Open `https://console.noibu.com/<domainId>/ab-tests/<testId>` **in Claude in Chrome** (`mcp__claude-in-chrome__*`: `tabs_create_mcp` then `navigate`) and read the **Implementation** panel (`get_page_text`). Never open the console in the built-in browser: it has no session there, so the page only shows a login screen, and you must not sign in for the user. Claude in Chrome uses the user's own signed-in Chrome, where the console session already exists. If Claude in Chrome isn't connected (`tool_search` finds no `claude-in-chrome` tools, or `tabs_context_mcp` fails), don't fall back to the built-in browser; ask the user once to connect Claude in Chrome, or to paste the Implementation panel's code, then wait. If the console page shows a login screen even in Chrome, say so and ask the user to sign in to console.noibu.com in that Chrome, then retry; never enter credentials. Compare its read of the assignment against the SDK file's "Reading the assignment" and apply that section's instruction.

### 2c. Write the variation code
- Start from the picked test's hand-off fields: `surface` and `surfaceTemplate` (which page type and URLs; the run-level `surfaces` gives the exact URLs read), each variation's `devNotes` (what changes) and `selectors` (the recorded `selector`, its layout `block` and `column`), and `siteFacts` (what is already on the page). Search the repo for those selectors to find the template, section or component that renders them. When the repo's code disagrees with the recorded selectors, the repo wins: the site read saw the rendered page, the repo is what ships. Say so in the PR body when it happens.
- Build it as the SDK file's "The gating helper" and "Conventions observed" sections say: reuse the repo's existing helper and conventions when present, otherwise the documented helper — and don't introduce the observed conventions unasked.
- Place it per `platforms.md` (where the surface lives, and where the helper loads for above-the-fold changes), deferring to what the repo already does.
- Paste Noibu's implementation snippet into the flag script as a comment for traceability.
- Don't gate the variation by CSS breakpoint when targeting is set in Noibu ("mobile" includes tablets). Let the flag decide.
- Use the site's own components and design tokens so B looks native.
- Write and review it under SKILL.md's "Platform restrictions and blast radius" (its Stage 2c bullet: the file-by-file diff review and the PR body's "Blast radius" section).
- Validate before committing: `node --check` JS, JSON-parse JSON, plus the repo's own lint/build if it's cheap.

### 2d. Open the PR (`full` and `pr` modes, or a follow-up "create the PR" from `preview`/`theme`)
- Branch from the default branch: `agent/ab-<slug>` (reuse it when 2c already committed there in a partial mode). Commit and push via the write path from 6b.
- Open the PR with the host's mechanism (`references/git-hosts.md`, "PR operations"), using the repo's PR template if it has one.
- If a git-host connector call here fails on authentication (the connection dropped or the token expired), stop without retrying, keep the local commit, and follow `references/run-modes.md`, "When the pick needs a connector": the connector card, then resume from the failed call once it is connected. Don't write re-authorisation steps into the chat.
- PR body: test id, flag key, variation keys, targeting, metrics; the evidence, quoted from the test's `evidence[]` (claim, numbers, source; correlational ones labelled); the finder's before/after preview images when the page has them; `fixFirst` when present; a control-vs-B table; files changed and why; how QA forces each arm; **launch order** (merge → confirm live → start); overlap with running tests; which older PR it supersedes.
- Update the Noibu draft's hypothesis (`noibu_update_ab_test`) to reference the PR link.
- In `pr` mode, go straight to Stage 4 after this; QA happens only if the user continues from the follow-up card.

### 2e. Show the implementation (`preview` mode)
The point of this mode is that the user reads the code before anything leaves their machine, so make it easy to read:
- Save the patch (`git format-patch` or `git diff` from the default branch) to the outputs folder as `ab-<slug>.patch`, and send it with `SendUserFile`.
- In the chat: a short table of files changed and why; the diff itself in a code block when it is under ~150 lines, otherwise the hunk that renders variation B plus a pointer to the patch; how QA would force each arm; the Noibu draft's console link with its flag key and variation keys; the `consoleFollowUps`; and one line saying nothing was pushed or published.
- Then Stage 4.
