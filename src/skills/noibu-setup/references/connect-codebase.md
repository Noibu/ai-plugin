# Connecting Claude to the code host (Step 5)

Read only the section for the host the user picked. **You do every step yourself.** The user's part is limited to clicking the connector card, signing in to the provider's own window, approving a tool or command prompt, clicking a link you give them, and picking from options. Never paste instructions, menus, or help-centre links for them to follow. Only when a step genuinely can't be automated (named below) do you ask for that one action, in one sentence, then continue on your own.

## Detecting the client

Decide once and record it in the ledger:

- **Cowork:** `search_mcp_registry` and `suggest_connectors` are available. Connectors are added with cards.
- **Claude Code** (CLI, desktop Code tab, IDE): Bash is available and `suggest_connectors` isn't. Connections are made with terminal commands you run yourself.

## Proving reads

A host counts as connected only when its proving read succeeds. Run it silently after every connection attempt.

| Host | Tools (find them as in `references/cards.md`, "Waking up a connector") | Proving read |
|---|---|---|
| GitHub | GitHub server tools (`get_me`, `search_repositories`, `get_file_contents`); in Claude Code, `gh` | `get_me` (or `gh api user`) returns their login, **and** the chosen repo is readable (`get_file_contents` on its root, or `gh repo view <owner/repo>`) |
| Bitbucket | Atlassian server tools (`atlassianUserInfo`, `getAccessibleAtlassianResources`, `executeRead`) | `getAccessibleAtlassianResources` lists a **Bitbucket** workspace, and a read of its repositories succeeds. Jira or Confluence alone doesn't count. |
| Azure DevOps | ADO server tools (`core_list_projects`, `repo_repository`, `repo_file`) | `core_list_projects` lists their projects |

## Finding the repo and org without asking

Before asking the user anything, look for it: repo URLs in the business context, a git remote in a connected folder or, in Claude Code, the working folder (`git remote -v`), the Noibu domain's company name matched against repo names once the connector works. Ask only when none of these settle it, and then as options, not free text.

---

## GitHub

1. **Already connected?** Run the proving read. Passes → done.
2. **Connect the account.**
   - Cowork: `search_mcp_registry(["github"])`, then `suggest_connectors` with the GitHub result's `directoryUuid`. Then the connection check-in (`references/cards.md`) with "Click Connect on the GitHub card above and sign in." Confirmed on the card but not loaded in this chat → say "GitHub is connected." and go to SKILL.md Step 5 item 4 (the release workflow is added in the browser, so it doesn't need the connector's tools); skip items 3 and 4 here.
   - Claude Code: check `gh auth status`. `gh` not installed → install it yourself after the user approves (`brew install gh` on Mac, `winget install GitHub.cli` on Windows). Not signed in → run `gh auth login --web --git-protocol https` yourself (in a terminal tab the user can see, or Bash in the background) and tell them one line: "Approve the GitHub sign-in in the browser window that just opened (the one-time code is shown in the terminal)." Then re-run the proving read.
3. **Install the Claude GitHub App on the repo** (Cowork only; Claude needs it to open pull requests through the connector. In Claude Code, `gh` acts as the user, so skip this). If the proving read shows the account but the repo isn't readable, or opening a PR later fails on permissions:
   - Open the app's installation page in the browser (Claude in Chrome, else Claude's built-in browser): `https://github.com/apps/claude/installations/new`. Select the account or organization that owns the repo and pre-select **Only select repositories → <repo>**.
   - Stop on the final **Install** (or **Request**) button and ask with `AskUserQuestion`: "Install the Claude GitHub App on <owner/repo>?" options "Yes, install it" / "Not now". On yes, the user clicks the button themselves if the page needs their confirmation; otherwise click it after their yes.
   - The page offers only **Request** (they aren't an org admin) → submit the request after their yes, and record "Org admin approves the Claude GitHub App request" as a to-do for Step 8.
   - No browser available → record "Install the Claude GitHub App on <owner/repo>" as a to-do for the user and continue with what the connector can read.
4. Re-run the proving read and confirm in one line ("GitHub connected as <login>, and I can see <owner/repo>.").

**GitHub connector missing from the registry** (Cowork): record "Connect GitHub to Claude" as a to-do for the user (Step 8) and say so in one line. Step 6 can still run, because the GitHub release workflow is added in the browser; pick the repo as SKILL.md Step 5 item 4 does for a connector that isn't loaded (likely repos, or typed as `owner/name`).

---

## Bitbucket (Cloud)

Bitbucket connects through the **Atlassian** connector. Say so in the same line as the card so the name isn't a surprise. If the repo URL shows Bitbucket Data Center or Server (not `bitbucket.org`), say it isn't supported and record it as a to-do.

1. **Already connected?** Run the proving read. Passes → done.
2. **Connect.**
   - Cowork: `search_mcp_registry(["bitbucket"])` (returns Atlassian), then `suggest_connectors` with its `directoryUuid`. Then the connection check-in with "Bitbucket connects through the Atlassian connector. Click Connect on the card above and sign in with your Atlassian account." Confirmed on the card but not loaded in this chat → say "Bitbucket is connected." and go to SKILL.md Step 5 item 4 (the pipeline is added in the browser).
   - Claude Code: run `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp` yourself (the user approves the command). Then the one thing Claude can't do itself is start the sign-in: the connection check-in with "Type /mcp, pick atlassian, and choose Authenticate."
3. Re-run the proving read and confirm the workspace and repo in one line.
4. **Proving read fails after a successful sign-in:**
   - Atlassian tools load but no Bitbucket workspace is listed → the workspace isn't linked to their Atlassian organization, or an admin restricts the connector. Record it as a to-do for their Atlassian admin.
   - Reads work but a write later fails → their account lacks write permission on the repo; record it for the repo admin.

---

## Azure DevOps

Azure DevOps has no hosted connector. It runs as a local MCP server (`@azure-devops/mcp`) that signs in with the user's Microsoft account, so it only sees what their account sees, and it can't delete anything. How it's installed depends on the client:

- **Cowork:** the server has to be added to the Claude desktop app's config file on the user's computer, which Cowork can't reach. So the install runs in the desktop app's **Code tab**: you give the user the install prompt to copy and paste there; then they restart Claude and come back to this chat (steps 4–5).
- **Claude Code:** you add the server to Claude Code yourself (step 3, "In Claude Code").

1. **Already connected?** Run the proving read. Passes → go to step 6.
2. **Organization name.** Find an ADO URL (business context, a git remote, earlier in the chat): `dev.azure.com/<org>/...` → the first path segment; `<org>.visualstudio.com/...` → the subdomain. Only if none is found, ask with `AskUserQuestion` so they can paste it straight into the question box:
   - header: "Azure DevOps"
   - question: "Paste the link to your Azure DevOps project or repo in the box below. It starts with dev.azure.com."
   - options: "I don't have the link" ("Note it and keep going") and "It's not on Azure DevOps" ("Pick a different place")
   - Their pasted link (the type-your-own field) → read the organization, project and repo from it (`dev.azure.com/<org>/<project>/_git/<repo>`; spaces show as `%20`). "I don't have the link" → record "Connect Azure DevOps (needs the project link)" as a to-do for the user, skip Step 6, and go to Step 7. "It's not on Azure DevOps" → ask the code-host question again (`references/cards.md`).

   The name contains only letters, numbers and hyphens and is **case-sensitive**: keep its casing. Confirm it back in one line and record it.
3. **In Claude Code:** do this, then go to step 6 (steps 4–5 are for Cowork).
   - Run `node -v`. v20+ → continue. Missing or older → ask with `AskUserQuestion` "Azure DevOps needs Node.js 20 or later. Install it now?" ("Yes, install Node.js" / "Not now"). On yes, install the LTS release yourself (`brew install node` on Mac when Homebrew exists; `winget install OpenJS.NodeJS.LTS` on Windows; otherwise the official installer from nodejs.org, which the user approves). Re-check `node -v`. "Not now" → record "Install Node.js 20+" as a to-do, skip Step 6, and go to Step 7.
   - Check `claude mcp list` for an existing `ado` entry; none → run `claude mcp add ado -- npx -y @azure-devops/mcp <org>`.
   - The new server loads only after a restart. One line: "Restart Claude Code so the new connection loads (in a terminal: `claude --continue`; in the desktop Code tab: quit Claude fully and reopen this session), then type **done** and we'll pick up right here." When they're back, go to step 6.

4. **In Cowork: hand off with a prompt to paste.** Don't ask first whether they have Claude Code: go straight to the prompt. No link either: a chat doesn't make `claude://` links clickable.
   - Fill `<ORG>` in the **Code tab install prompt** below. Keep everything else exactly as written.
   - Reply with exactly this:

     "Copy the prompt below (use the copy button on the box), then open the **Code** tab in the Claude desktop app, start a new session, paste it and press send. Approve what it asks. When it's done it'll ask you to quit Claude and reopen this chat; come back here and type **done**. If you don't have the Code tab, type **skip** and I'll add it to your to-do list."

     followed by the filled prompt in one fenced code block.
   - Wait. Don't run anything else for ADO until they're back.
5. **They type "skip"** (or say they don't have Claude Code or the Code tab): record "Connect Azure DevOps (paste the install prompt into Claude Code's Code tab, or ask your Noibu contact)" as a to-do for the user, skip Step 6, and go to Step 7. Don't try to edit the desktop app's config from this chat: Cowork can't reach it.
6. **They're back ("done").** Re-run the proving read (both clients). Calling `core_list_projects` opens the Microsoft sign-in, which the user approves. Then confirm the organization, project and repo in one line. The ledger from before the restart is still in this chat; carry on without re-asking anything.

### Code tab install prompt (Cowork route)

```
Set up the Azure DevOps connection for the Claude desktop app, so my Noibu setup can continue in Cowork. Do every step yourself and only ask me to approve.

Azure DevOps organization: <ORG>  (case-sensitive: use exactly this)

1. Run `node -v`. If Node.js is missing or older than v20, install the LTS release (Mac: `brew install node` if Homebrew exists, otherwise the official installer from nodejs.org; Windows: `winget install OpenJS.NodeJS.LTS`), then run `node -v` again.
2. Find the Claude desktop app's config file. Mac: ~/Library/Application Support/Claude/claude_desktop_config.json. Windows: every one of these that exists: %LOCALAPPDATA%\Claude-Data\claude_*\claude_desktop_config.json, %LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json, %APPDATA%\Claude\claude_desktop_config.json. If none exists, create it at the %APPDATA% path with {"mcpServers": {}}.
3. Read each file (follow symlinks, strip a BOM). If one isn't valid JSON or has an unexpected shape, stop, change nothing, and tell me what you found.
4. If `mcpServers` already has an "ado" entry or anything that references @azure-devops/mcp, change nothing and go to step 7.
5. Back up every file you'll change to claude_desktop_config.backup-<timestamp>.json in the same folder.
6. Add this under `mcpServers`, keeping everything else exactly as it is. Mac: "ado": { "command": "npx", "args": ["-y", "@azure-devops/mcp", "<ORG>"] }. Windows: "ado": { "command": "cmd", "args": ["/c", "npx", "-y", "@azure-devops/mcp", "<ORG>"] }. Write the result to a .tmp file, confirm it parses as JSON, then rename it over the original. On any failure, delete the .tmp file and leave the original untouched.
7. Finish with exactly this message: "Azure DevOps is set up. Quit Claude fully (Cmd+Q on Mac, or Quit from the tray on Windows), reopen it, go back to your Noibu setup chat in Cowork, and type done."
```

**Diagnose failures yourself** before reporting them:

| Symptom | What you do |
|---|---|
| Claude Code reports Node can't be installed | Record "Install Node.js 20+ (their IT may need to)" as a to-do; skip Step 6. |
| Back in Claude Code, no ADO tools after the restart | Check `claude mcp list`; no `ado` entry → add it again (step 3, "In Claude Code") and restart with `claude --continue`. |
| Back in Cowork, no ADO tools after the restart | Ask whether they quit Claude fully (not just closed the window). Still missing → hand off again with the same prompt; Claude Code's step 4 finds an existing entry and the restart is what's left. |
| Can see projects but no repos | Their access level is Stakeholder. Record "ADO admin changes <user> to Basic (Organization settings → Users)" for Step 8. |
| 403 / "not authorized" | Wrong Microsoft account. Ask them to sign out of the ADO prompt and sign in with the account that has access. |
| "Failed to find api location for area" | The org name is wrong (case, or a URL instead of the name). Confirm the right name with them, then hand off again with the corrected org, adding this line to the end of the prompt: "The existing "ado" entry has the wrong organization name: in step 4, replace that entry instead of keeping it." In Claude Code: `claude mcp remove ado`, add it again with the right name, and restart with `claude --continue`. |
| Server fails to start | Usually Node isn't found. Cowork: hand off again so the Code tab can check Node and the config entry, then restart. Claude Code: check `node -v` and the `ado` entry in `claude mcp list`, fix, and restart with `claude --continue`. |
