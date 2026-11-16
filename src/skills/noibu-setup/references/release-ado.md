# Release reporting: Azure Pipelines (Step 5)

You do every step. The user answers the questions in section 2 and approves the merge and the first pipeline run; nothing else.

**Prerequisites (check them yourself):** the Azure DevOps connector from Step 4 works; Claude in Chrome (or the built-in browser) with the user signed in to dev.azure.com; the repo has at least one commit and a default branch (an empty repo has nothing to branch from); the user can create pipelines and the organization has Microsoft-hosted pipeline parallelism.

Use the **ADO connector** for repo work (read files, create a branch, commit, open the PR). Use the browser only for what the connector can't do, such as creating the pipeline definition. Don't use the git CLI.

## 1. Domain

Use the domain UUID from Step 2 (the UUID, not the `numId`). Only if missing: resolve with `noibu_get_domain` / `noibu_list_domains`, asking which if several.

## 2. Confirm details (one message)

Ask only for what's missing:

- **Organization, project and repository.** Already chosen in Step 4 → don't ask; otherwise list candidates with the connector and ask.
- **Branch** whose pushes trigger events. Default `main`.
- **Component name** (e.g. `frontend`, `backend`, `checkout`).
- **PR or direct commit.** Default PR.

Explain that this reports every push to the branch as a successful release, without verifying a deployment. If they want deployment-based reporting (classic Release pipelines or YAML deployment stages), ask which pipeline and stage, place the webhook step after the final deployment stage instead of on push, and also report status `"failed"` when the deployment fails. Once they answer, proceed without another confirmation.

## 3. Build and validate the YAML

File: `noibu-release.yml` at the repo root (follow the repo's existing pipeline-file convention if it has one).

- Trigger: push to the selected branch only. `pr: none` so PR builds don't report releases.
- Pool: `vmImage: ubuntu-latest`.
- One bash step, named "Report release to Noibu", that POSTs to `https://webhook.noibu.com/release_webhook/<DOMAIN_UUID>` with `Content-Type: application/json`.
- JSON payload:
  - `component`: the confirmed component name
  - `title`: `"$BUILD_REPOSITORY_NAME release $BUILD_BUILDNUMBER"`
  - `description`: the commit message (`$BUILD_SOURCEVERSIONMESSAGE`)
  - `status`: `"success"`
  - `version`: `$BUILD_SOURCEVERSION`
  - `release_time`: `date -u +%Y-%m-%dT%H:%M:%SZ`
- Build the JSON with `jq -n --arg ...`, never by string concatenation.
- Read the commit message **only through the environment variable**. Never use `$(Build.SourceVersionMessage)` macro syntax in the script body: Azure substitutes it into the script text before the shell runs, so a crafted commit message could inject shell code.
- `curl --fail --silent --show-error --max-time 30`.
- Check existing pipeline YAML first. If this file or an equivalent Noibu integration exists, inspect it; don't duplicate reporting or overwrite unrelated work.

Validate the YAML with a parser and review the diff. Don't paste the full YAML into chat.

## 4. Commit through the connector

- Commit message: "Add Noibu release event webhook".
- PR → new branch, PR against the default branch, left unmerged.
- Direct commit (only if explicitly chosen) → default branch, subject to branch policies.
- Re-read the saved file and confirm it matches the validated YAML exactly.

## 5. Merge, register the pipeline, verify

1. Share the PR link in one line, then ask with `AskUserQuestion`: "Merge the Noibu release pipeline into <branch>?" options "Merge it for me" / "I'll review and merge it myself".
   - **Merge it for me** → complete the PR with the connector, subject to branch policies. A required reviewer you can't stand in for → say who needs to approve, record it for Step 7, and continue with Step 6.
   - **I'll merge it myself** → continue with Step 6 now; re-check in Step 7.
2. Once the file is on the trigger branch, **register the pipeline yourself.** Azure DevOps doesn't run a YAML file until a pipeline definition points at it.
   - Check for an existing definition for this file first (`pipelines_definition` list) so you don't make a duplicate.
   - Create it with the connector's pipeline tools if they support it; otherwise in the browser: **Pipelines → New pipeline → Azure Repos Git →** the repo **→ Existing Azure Pipelines YAML file →** trigger branch and `/noibu-release.yml` **→ Save**.
3. Ask "Run the Noibu release pipeline on <branch> now?" ("Yes, run it" / "Not now"). On yes, start the run (connector `pipelines_run`, or **Run pipeline** in the browser) and watch it until "Report release to Noibu" finishes.
   - Green → call `noibu_list_releases` for the domain UUID and confirm an entry with the component, status success, title `<repo> release <build number>` and the commit SHA as version. Report it in one line.
   - Red → read the build log (`pipelines_build_log`), diagnose, fix through the same PR flow, and re-run.
4. Don't claim delivery unless `noibu_list_releases` shows it. Record the PR, pipeline link and release state in the ledger.

## Blockers

- Not signed in to dev.azure.com in the browser (needed only for registering the pipeline) → open it and ask the user, in one line, to sign in there; continue when they say so. Never type their credentials.
- No browser (in Claude Code: Claude in Chrome isn't connected) and the connector's pipeline tools can't create the definition → the PR still goes in; record "Register the Noibu release pipeline for /noibu-release.yml" as a to-do for the user and move on.
- Missing write or pipeline-creation permission, branch policies blocking the change, or an empty repo → stop this step, say exactly what's blocking and who can fix it, record it for Step 7, and move on. Don't guess or bypass policies.

Diagnose and handle these yourself:

| Symptom | Likely cause | What you do |
|---|---|---|
| Run never starts | Pipeline not registered, or file not on the trigger branch | Confirm the merge, register the pipeline (section 5) |
| Run stays queued / parallelism error | No Microsoft-hosted parallelism in the org | Record "ADO admin requests a free parallelism grant or buys a parallel job" for Step 7 |
| Step fails with an HTTP error | Wrong domain UUID or mistyped URL | Fix the UUID and URL in the file |
