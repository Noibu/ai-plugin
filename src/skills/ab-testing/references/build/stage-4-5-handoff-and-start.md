# Build half, Stages 4 and 5: hand off, verify live, start

Read this when Stage 2 (or 3) finishes. Stage 4 runs in every mode; Stage 5 only in `full` or after a continue option that ends in a started test.

"SDK file" below is `references/shared/noibu-feature-flag-sdk.md`; `platforms.md` is `references/shared/platforms.md`; "6b", "6c", "Stage 1 step N" and "Rules that apply throughout" are sections of SKILL.md.

## Stage 4: Hand off

Send the user one short summary of what exists now, as plain structured text (no widget: it asks nothing), only the lines that apply to the mode:
- the A/B test in Noibu, linked to its console page (`https://console.noibu.com/<domainId>/ab-tests/<testId>`)
- the preview link and how to force B, the QA verdict and any warnings — or that QA will run on production before Start (`full` with no preview)
- the PR link, and any older PR to close
- the patch file and the files changed (`preview`)
- the preview theme's name and preview link (`theme`)
- the test's `consoleFollowUps`, as steps to do in the Noibu console before starting
- overlap risks with running tests, and anything that's their call

Then the gate for the mode:

- **`full`:** `AskUserQuestion` to confirm the merge (options: "I've merged it" / "Hold, I want changes"). Never merge yourself. On "I've merged it", Stage 5.
- **`pr`, `theme`, `preview`:** the follow-up card from `references/run-modes.md` section 5, so the user can continue to a PR, a theme preview, QA-then-merge, or the full run without starting over. Nothing after the widget; wait. A continue reply resumes at the first stage not yet done, reusing the draft, branch, patch and preview theme already made (a `theme` run that continues to `full` has its QA done, so it goes 2d → Stage 4's merge gate). "Stop here" ends the run with one line on how to resume later.

## Stage 5: Verify live, then start

Runs only in `full` mode, or after the user chose a continue option that ends in a started test.

1. Confirm the PR is merged (`references/git-hosts.md`, "Merged?"). Then prove the code is live with the method from 6c. Poll every ~60s for up to 10 minutes (longer if the pipeline is known to be slow or needs a manual release — tell the user what's pending). If it never lands, stop and tell the user. **Never start a test whose code isn't live** (SDK file, "What the platform records").
2. If QA was deferred (no preview), run Stage 3 steps 2–4 now on production, with `references/qa-checklist.md`. Any FAIL → stop; don't start.
3. Start the test: `noibu_advance_ab_test`, or open it in the console, click **Start**, then **Start test** in the dialog. Screenshot it: status must read **Running**.
4. On a simulated phone, read the assignment as the SDK file says and confirm it returns a live `reason` with no `errorCode`, and that the page renders that arm. Report which arm the check landed in; one visitor isn't proof B is reachable, so say so.
5. Tell the user what's next: the minimum runtime, the lifecycle limits from the SDK file, and how to read results. For a Shopify preview theme, ask about deleting it as `references/shopify-connector.md` section 4 rule 4 says; for other preview methods, say how the preview is cleaned up (CI previews usually expire on their own).
