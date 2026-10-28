# Git-host mechanics

Read the row or section for the host Stage 1 step 6b detected; ignore the others.

## Classify the host (Stage 1 step 6b)

From the remote URL:

- `github.com` (or GitHub Enterprise) → **GitHub**
- `gitlab.com` or self-hosted GitLab → **GitLab**
- `bitbucket.org` (or Bitbucket Data Center) → **Bitbucket**
- `dev.azure.com` / `*.visualstudio.com` → **Azure DevOps**

## Connector per host (write-path rung 1, and the connector card)

Which connector serves each host. Use it in Stage 1 step 6b (is rung 1 there?) and in `references/run-modes.md`, "When the pick needs a connector" (what to search the registry for and which card to show).

| Host | Connector | Tools to look for with ToolSearch | Registry keyword | Read that proves it works |
|---|---|---|---|---|
| GitHub | GitHub | `mcp__GitHub__*` | "github" | `get_me` |
| Bitbucket | Atlassian (covers Jira, Confluence and Bitbucket) | the Atlassian server's tools (e.g. `atlassianUserInfo`, `getAccessibleAtlassianResources`, `executeRead`) | "bitbucket" (returns Atlassian) | `getAccessibleAtlassianResources` listing a Bitbucket workspace |
| GitLab | none | — | — | — |
| Azure DevOps | none | — | — | — |

- **Bitbucket via Atlassian.** The connector being connected isn't enough: it counts as rung 1 only when the read shows Bitbucket access for the workspace that holds the repo (an Atlassian account with only Jira or Confluence doesn't count). Bitbucket pull-request operations go through the connector's generic read/write tools against the Bitbucket REST paths in "PR operations" below. When showing the card, say in the same line that Bitbucket connects through the Atlassian connector, so the person isn't surprised by the name.
- **GitLab and Azure DevOps** have no connector. Don't call `SearchMcpRegistry` or `SuggestConnectors` for them; say in one clause that there's no connector for that host and use rung 2 onwards. When their CLI login is missing or expired, name the login command (`glab auth login`, `az login`) in that clause; never ask for a token.
- Re-check this table against the registry when a host gets a connector of its own; a registry search for the host that returns a connector naming it wins over this table.

## CLI per host (write-path rung 2)

`gh` (GitHub), `glab` (GitLab), `az repos` with the `azure-devops` extension (Azure DevOps). Bitbucket has no official CLI: use its REST API with credentials the environment already has.

## PR operations (Stage 2d, Stage 5)

| Step | GitHub | GitLab | Bitbucket | Azure DevOps |
|---|---|---|---|---|
| Open | MCP `create_pull_request` or `gh pr create` | `glab mr create` | `POST /2.0/repositories/{ws}/{repo}/pullrequests` | `az repos pr create` |
| Comment | MCP `add_issue_comment` or `gh pr comment` | `glab mr note` | `POST …/pullrequests/{id}/comments` | `POST …/pullRequests/{id}/threads` (REST) |
| Merged? | MCP `pull_request_read` or `gh pr view --json state` | `glab mr view` (state `merged`) | `GET …/pullrequests/{id}` (state `MERGED`) | `az repos pr show` (status `completed`) |

## PR templates

Use the repo's PR template if it has one: `.github/pull_request_template.md`, `.gitlab/merge_request_templates/`, `.azuredevops/pull_request_template.md`, etc.

## CI preview config (Stage 1 step 6c, preview rung 2)

Decide whether the repo posts a per-PR preview deployment (Vercel, Netlify, Cloudflare Pages, Oxygen, GitLab Review Apps, Azure Static Web Apps, Amplify…) from its CI config: `.github/workflows/`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, `vercel.json`, `netlify.toml`, …; don't guess.
