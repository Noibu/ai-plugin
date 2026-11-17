# Release reporting: GitHub Actions (Step 6)

You do every step. The user's part: signing in if the browser isn't (section 0), one click to confirm the details (section 2), and the merge. Nothing else.

## 0. Sign-in, then access (before anything else)

Check these in this order, before asking the user anything. Never judge access while signed out: a signed-out visitor can still view a public repo, so everyone looks like they only have read access.

- **Claude Code:** `gh auth status` already passed in Step 5. Check write access with `gh api repos/<owner/repo> --jq .permissions.push`: `true` → go on; `false` → no write access (Blockers).
- **Cowork:**
  1. **Signed in?** Open `https://github.com/settings/profile` in the browser. Any signed-in user can open it; signed out, GitHub sends you to its login page → the sign-in check-in below.
  2. **Write access?** Only once signed in: open `https://github.com/<owner/repo>/new/<default branch>`. The new-file editor opens → write access; this is also the page section 3 uses. "You need to fork this repository", or a 404 on a private repo → no write access (Blockers).

**Sign-in check-in:** leave the login page open (if Claude's browser panel is hidden, ask them to bring it up first) and ask one `AskUserQuestion`: "Sign in to GitHub in the browser window I've opened." Options "I've signed in" and "Skip for now". "I've signed in" → repeat item 1. "Skip for now" → record "Add the Noibu release workflow to <owner/repo>" as a to-do for the user and go to Step 7. Never type their credentials.

## 1. Domain

Use the domain UUID from Step 2. Only if the ledger doesn't have one: resolve it with the Noibu tools (`noibu_get_domain`, falling back to `noibu_list_domains`), and if there's more than one, ask which. Use the **UUID**, not the `numId`. Never ask the user to look it up.

## 2. Confirm the details (one click)

Work out sensible defaults instead of asking: the repo from Step 5; the trigger branch = the repo's default branch (`main` if you can't tell); the component = `frontend` (or what the business context or repo name suggests, e.g. `checkout`); a pull request. Then one `AskUserQuestion`:
- header: "Releases"
- question: "I'll report every push to <branch> in <repo> to Noibu as a <component> release, through a pull request you can review. Each push counts as a successful release, not a verified deploy."
- options: "Sounds good" ("Set it up") and "Change something" ("Branch, label, or commit directly")

"Sounds good" → go ahead with no more questions. "Change something" → ask only for what they want changed, in one message, then go ahead.

## 3. Add the workflow

- First check `.github/workflows/` for an existing Noibu workflow (any file mentioning `webhook.noibu.com`). If one exists, read it and don't add a duplicate; fix it only if it's broken, and say what you changed.
- PR → commit to a new branch (`noibu/release-events`) and open the PR against the default branch, leaving it unmerged. Direct commit only when they explicitly chose it.
- Commit message: "Add Noibu release event webhook".

**Cowork: in the browser.**
- Make the change in the user's logged-in GitHub **in the browser**: Claude in Chrome, or Claude's built-in browser if Chrome isn't available. Don't use git or the GitHub API for this change (the GitHub connector can't create workflow files).
- Create `.github/workflows/noibu-release.yml` (Add file → Create new file).
- GitHub's web editor auto-indents typed YAML. Insert the content in a way that keeps indentation exactly (e.g. paste from the clipboard after confirming the clipboard holds the YAML). **After saving, re-read the file (raw view) and confirm the indentation is intact** and it matches what you validated.

**Claude Code: with `gh`.**
- Work in a fresh temporary folder, never in the user's own checkout: `gh repo clone <owner/repo> <tmp dir> -- --depth 1`, create the branch (or stay on the default branch for a direct commit), write `.github/workflows/noibu-release.yml` from the validated content, commit, and `git push -u origin <branch>`.
- A push rejected for missing `workflow` scope → run `gh auth refresh -h github.com -s workflow` yourself, tell the user in one line to approve it in the browser window that opens, then push again.
- PR → `gh pr create --base <default branch> --head noibu/release-events --title "Add Noibu release event webhook" --body "<one line: what it does and that every push to <branch> is reported to Noibu as a release>"`.
- Re-read the pushed file (`gh api repos/<owner/repo>/contents/.github/workflows/noibu-release.yml?ref=<branch>`, base64-decoded) and confirm it matches what you validated byte for byte. Delete the temporary folder when done.

## 4. Workflow content

Payload: title `"<repo> release <run number>"`; description = the head commit message followed by `"— by <commit author name>"` (fall back to `github.actor`); status `"success"`; version = the commit SHA; release_time = now in UTC (RFC3339). Build the JSON with `jq`, pass commit text in through **environment variables** (never `${{ }}` straight into the shell script), fail on HTTP errors, and set a timeout.

Template (fill in the branch, component and domain UUID):

```yaml
name: Noibu release event

on:
  push:
    branches: [main]

jobs:
  report-release:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Report release to Noibu
        env:
          NOIBU_URL: https://webhook.noibu.com/release_webhook/<DOMAIN_UUID>
          COMPONENT: frontend
          REPO_NAME: ${{ github.event.repository.name }}
          RUN_NUMBER: ${{ github.run_number }}
          COMMIT_MESSAGE: ${{ github.event.head_commit.message }}
          COMMIT_AUTHOR: ${{ github.event.head_commit.author.name }}
          ACTOR: ${{ github.actor }}
          COMMIT_SHA: ${{ github.sha }}
        run: |
          author="${COMMIT_AUTHOR:-$ACTOR}"
          payload=$(jq -n \
            --arg component "$COMPONENT" \
            --arg title "$REPO_NAME release $RUN_NUMBER" \
            --arg description "$COMMIT_MESSAGE — by $author" \
            --arg version "$COMMIT_SHA" \
            --arg release_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{component: $component, title: $title, description: $description, status: "success", version: $version, release_time: $release_time}')
          curl --fail --silent --show-error --max-time 30 \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$NOIBU_URL"
```

Before inserting it, validate the YAML with a parser and run the script locally (or in a sandbox) with a commit message full of quotes, backticks and `$( )` to confirm it stays inert. Don't paste the whole YAML into chat; make the change on GitHub (Cowork) or through `gh` (Claude Code).

## 5. Merge and verify

1. Share the PR link in one line, then ask with `AskUserQuestion`: "Merge the Noibu release workflow into <branch>?" options "Merge it for me" / "I'll review and merge it myself".
   - **Merge it for me** → merge the PR in the browser or with the GitHub connector (Cowork), or with `gh pr merge <number> --merge` (Claude Code), subject to branch protection. Protection requires a review you can't give → say who needs to approve, record it for Step 8, and continue with Step 7.
   - **I'll merge it myself** → continue with Step 7 now, and re-check the PR state in Step 8.
   - **Direct commit** was chosen in section 2 → nothing to merge.
2. Once merged, the merge push is the first release. Watch the "Noibu release event" run until it finishes (a couple of minutes at most): the repo's **Actions** tab in the browser (Cowork), or `gh run list --workflow "Noibu release event" --limit 1` then `gh run watch <run id>` (Claude Code).
   - Green → call `noibu_list_releases` for the domain UUID and confirm an entry with the component, status success, title `<repo> release <run number>` and the commit SHA as version. Report it in one line.
   - Red → open the run log (`gh run view <run id> --log-failed` in Claude Code), diagnose (wrong domain UUID or URL, YAML indentation, missing `jq`), fix it with a follow-up commit through the same PR flow, and re-run.
3. Don't claim delivery unless `noibu_list_releases` shows it. Record the PR link and the release state in the ledger.

## Blockers

- Cowork, not signed in to GitHub in the browser → section 0's sign-in check-in. Never type their credentials.
- Cowork, no browser available (neither Claude in Chrome nor Claude's built-in browser) → don't fall back to the GitHub connector: it can't create workflow files. Record "Add the Noibu release workflow to <owner/repo>" as a to-do for the user (it can be finished by running the setup again with a browser available), say so in one line, and move on to Step 7.
- Claude Code, `gh` can't be installed or signed in → record "Add the Noibu release workflow to <owner/repo>" as a to-do for the user, say so in one line, and move on to Step 7.
- No write access or branch protection blocks the change → stop this step, say exactly what's blocking and who can fix it, record it for Step 8, and move on. Don't work around protections.
