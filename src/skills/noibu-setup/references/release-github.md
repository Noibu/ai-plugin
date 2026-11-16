# Release reporting: GitHub Actions (Step 5)

You do every step. The user answers the questions in section 2 and approves the merge; nothing else.

## 1. Domain

Use the domain UUID from Step 2. Only if the ledger doesn't have one: resolve it with the Noibu tools (`noibu_get_domain`, falling back to `noibu_list_domains`), and if there's more than one, ask which. Use the **UUID**, not the `numId`. Never ask the user to look it up.

## 2. Questions (one message)

Ask only for what the ledger doesn't already have, all in one message:

- **Repo** (owner/name). Already chosen in Step 4 → don't ask.
- **Branch** that counts as a release. Default `main`.
- **Component name**: the label every release from this repo will show in Noibu (e.g. `frontend`, `backend`, `checkout`).
- **PR or direct commit.** Default PR.

In the same message, say that every push to that branch is reported as a successful release, not a verified deploy. Once they answer, go ahead without another confirmation.

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
   - **Merge it for me** → merge the PR in the browser or with the GitHub connector (Cowork), or with `gh pr merge <number> --merge` (Claude Code), subject to branch protection. Protection requires a review you can't give → say who needs to approve, record it for Step 7, and continue with Step 6.
   - **I'll merge it myself** → continue with Step 6 now, and re-check the PR state in Step 7.
   - **Direct commit** was chosen in section 2 → nothing to merge.
2. Once merged, the merge push is the first release. Watch the "Noibu release event" run until it finishes (a couple of minutes at most): the repo's **Actions** tab in the browser (Cowork), or `gh run list --workflow "Noibu release event" --limit 1` then `gh run watch <run id>` (Claude Code).
   - Green → call `noibu_list_releases` for the domain UUID and confirm an entry with the component, status success, title `<repo> release <run number>` and the commit SHA as version. Report it in one line.
   - Red → open the run log (`gh run view <run id> --log-failed` in Claude Code), diagnose (wrong domain UUID or URL, YAML indentation, missing `jq`), fix it with a follow-up commit through the same PR flow, and re-run.
3. Don't claim delivery unless `noibu_list_releases` shows it. Record the PR link and the release state in the ledger.

## Blockers

- Cowork, not signed in to GitHub in the browser → open github.com/login in the browser and ask the user, in one line, to sign in there; continue when they say so. Never type their credentials.
- Cowork, no browser available (neither Claude in Chrome nor Claude's built-in browser) → don't fall back to the GitHub connector: it can't create workflow files. Record "Add the Noibu release workflow to <owner/repo>" as a to-do for the user (it can be finished by running the setup again with a browser available), say so in one line, and move on to Step 6.
- Claude Code, `gh` can't be installed or signed in → record "Add the Noibu release workflow to <owner/repo>" as a to-do for the user, say so in one line, and move on to Step 6.
- No write access or branch protection blocks the change → stop this step, say exactly what's blocking and who can fix it, record it for Step 7, and move on. Don't work around protections.
