---
name: noibu-setup
description: "Walks a new Noibu customer through setting up Claude with Noibu, end to end: connect and sign in to Noibu, confirm their store's domain, connect Shopify (when the store runs on it), connect their code host (GitHub, Bitbucket or Azure DevOps), automate release event reporting to Noibu from their pipeline, set up their business context file, verify everything, then set up a Claude Project and recurring Noibu reports. Use whenever someone wants to set up Noibu, get started or onboard with Noibu, connect Noibu to Claude, 'I just installed the Noibu plugin', 'help me finish my Noibu setup', 'connect my store / repo to Noibu', or 'set up release tracking'. Also use when a setup was left half done and they want to pick it back up. Use it even when Noibu isn't connected yet: connecting it is the first step."
---

# Noibu Setup

Walk a new customer from "plugin installed" to "Claude is connected to Noibu, their store, their code, and is sending them scheduled reports". The skill is a guided checklist of nine steps. Each step checks what is already in place first and only asks the user to act on what's missing, so running it again later picks up where they left off.

**Call metadata:** on every `noibu_*` call this skill drives, pass `skill: "noibu-setup"`, a short `skillStep` (e.g. `"step2-resolve-domain"`) and a one-line `rationale`.

## Ground rules

- **On the customer's computer, in Cowork or Claude Code.** This setup runs on the customer's own computer: it needs their browser sessions, their apps and their local files. Cowork is the main path; Claude Code is supported too. Decide which one this is once, before Step 1 (`references/connect-codebase.md`, "Detecting the client"), and record it in the ledger. Where the two differ, each step says so. In Cowork, the Azure DevOps install hands off to the desktop app's Code tab with a link and comes back to this chat (`references/connect-codebase.md`).
- **You do the work; the user approves and picks.** Every step is carried out by you with the tools available (connector cards, registry search, terminal commands, config edits, browser actions, repo commits, Noibu calls, scheduled tasks). The user's part is limited to: clicking a connector or plugin card, signing in or approving in a provider's own window, approving a tool or command prompt, clicking a link you give them, and choosing from options. Never hand them instructions, menu paths, or help-centre or Notion links to follow themselves. When something truly can't be automated (an OAuth sign-in, `/mcp` authentication, quitting and reopening the app, an account security setting, creating a Project), ask for that single action in one sentence and continue on your own as soon as they're back.
- **Interactive only.** This skill needs a person at the keyboard. On a scheduled or unattended run, say "Noibu setup needs you in the chat, so this run did nothing." and stop.
- **One step at a time.** Open each step with a one-line header (`**Step 3 of 9 · Connect Shopify**`), do it, and close it with one line of result before moving on. Don't front-load all nine steps' questions.
- **Check before asking.** Every step starts by checking whether it's already done (tool available, read succeeds, file exists). Already done → say so in one line and move on.
- **Skippable.** The user can skip any step from Step 3 on ("skip", "later", "not now"). Record it as skipped with who needs to do it, and carry it into Step 7's report.
- **Nothing is a dead end.** When a step can't be finished (an unsupported host, a missing permission, an admin who has to approve), record it as a to-do with who needs to do it and move on to the next step. Step 7 lists every to-do.
- **Keep a ledger.** Hold these facts in the conversation as you learn them and reuse them; never re-ask: client (Cowork or Claude Code), company name, domain name, domain UUID (`id`), domain `numId`, platform, Shopify shop, theme-change path (Shopify connector / Noibu theme tools / none), code host, Azure DevOps organization, repo, trigger branch, component name, release PR or pipeline link, context file name, which steps were skipped, and every to-do with its owner.
- **Never type secrets.** Don't enter passwords, API tokens or one-time codes for the user, and never ask them to paste a token into the chat. Sign-ins happen in the provider's own window; where a token is unavoidable, the user enters it in a terminal or settings page themselves.
- **Don't change their store or their account settings.** Store changes, merging PRs, enabling 2-step verification and turning on pipelines are the user's to do. Repo changes happen only through a PR (unless they explicitly pick a direct commit) and only after they've answered the Step 5 questions.
- **Clickable options.** Where this skill offers choices, use the cards in `references/cards.md` (a `show_widget` card, falling back to `AskUserQuestion`).

---

## Step 1 · Check and set up the Noibu connection

Runs before anything else. The onboarding prompt usually connects Noibu already, so this is normally a one-line check.

- **Check:** Noibu is connected when a tool ending in `noibu_list_domains` is available (load it with ToolSearch if tools are deferred) and the first `noibu_*` call doesn't fail on authentication. Connected → say "Noibu is connected." and go to Step 2.
- **Not connected:** say in two sentences that you'll get them fully set up (Noibu, their store, their code, release tracking, and scheduled reports) and that the first thing is connecting Noibu. Then one `AskUserQuestion`:
  - header: "Noibu"
  - question: "To start your setup, Noibu needs to be connected. Do you have a Noibu account?"
  - options: "I have an account" ("Sign in to Noibu to connect it, then I'll continue") and "Start a free trial" ("Create a Noibu account at noibu.com/free-trial-claude")
  - Never send the user to Settings or mention other connectors or Noibu servers (local, staging, test).
- **"I have an account":**
  - Cowork (`suggest_connectors` available): call `search_mcp_registry(["noibu"])`, keep only the result whose `url` is exactly `https://mcp.noibu.com/mcp`, and call `suggest_connectors` once with only its `directoryUuid` and `keywords: ["store data"]`. Then say "Click **Connect** on the Noibu card to sign in, then tell me when you're done and I'll pick up where we left off." No match or an empty card → no second card; say "Open **Connectors**, find **Noibu**, and click **Connect** to sign in. Tell me when you're done and I'll pick up where we left off." Never mention `/mcp` here.
  - Claude Code: say "Type `/mcp`, choose **plugin:noibu:noibu**, and select **Authenticate** to open the Noibu sign-in page. Tell me when you're done and I'll pick up where we left off."
  - When they're done, check again. Connected → continue to Step 2 without re-asking. Still not connected → say the tools can take a new chat to appear, ask them to start a new chat and run the setup again, and stop.
- **"Start a free trial":** reply only "[Start your free Noibu trial](https://www.noibu.com/free-trial-claude). Once your account is set up, run this again and choose **I have an account**." and stop.
- **Any other reply:** answer briefly and offer the question again.

## Step 2 · Resolve the domain

Every customer has access to one or more Noibu domains. Find the one this setup is for and confirm it.

1. If the user named a domain or a UUID, use it (`noibu_get_domain` for a name; on a miss, fall back to `noibu_list_domains`). Otherwise call `noibu_list_domains`.
2. **One domain:** ask with `AskUserQuestion`: "Is **<domain>** the store we're setting up?" Options "Yes, that's it" and "No, it's a different site".
3. **Several domains:** pick the most likely one (the one the user named, else the one with the most recent traffic if the list shows it, else the first production-looking one), and ask "Is **<domain>** the store we're setting up?" with up to three of the other domains as options plus "A different site". Don't dump a long list into chat; under Other they can type any name and you resolve it with `noibu_get_domain`.
4. **"No" / "A different site":** ask them to point you to the right domain (the site's URL or name), resolve it with `noibu_get_domain`, and confirm once more. If it isn't in their Noibu account, say so, and that they need access to that domain in console.noibu.com (a Noibu admin on their team can add them) before setup can continue; stop there.
5. Record the domain name, its **UUID** (`id`) and its integer **`numId`** in the ledger. Analytics, releases and context reads use the UUID; saving business context and the Noibu theme tools use the `numId`.
6. Call `noibu_get_company` once, record the company name, and note any sibling domains (a separate checkout domain is common). Mention them in one line; the rest of the setup is for the confirmed domain.

## Step 3 · Connect the ecommerce platform (Shopify)

1. **Identify the platform.** Use the first signal that settles it: `siteType` or platform from `noibu_get_domain`; the live storefront (`window.Shopify.shop` / `Shopify.theme`, or `cdn.shopify.com` assets, read with a browser tool or a web fetch of the homepage); the business context if one exists. If the signals disagree or none settles it, ask: "Which platform is <domain> built on?" with options "Shopify", "BigCommerce", "Salesforce Commerce Cloud", "Something else". Record it.
2. **Not Shopify** (BigCommerce, any other platform, or headless with no Shopify theme): say "<domain> runs on <platform>, so there's no store connection to set up. Moving on to your code." and go to Step 4.
3. **Shopify — already connected?** Load Shopify tools with ToolSearch (look for a server exposing `get-shop-info`). If they're there, call `get-shop-info` and compare the shop's domain(s) to the confirmed Noibu domain. Match → "Shopify is connected to <shop>." and go to step 5 below. Connected to a different shop → say which shop it is connected to and ask them to switch to the right store (the Shopify server's switch-shop tool, or sign in again with the right store).
4. **Shopify — not connected.** Look for a Shopify plugin in the plugin directory: call `SearchPlugins` with `["shopify"]`. If it returns a Shopify plugin, call `SuggestPluginInstall` with it (`trigger: "proactive"`, `contextLabel: "Connect your Shopify store"`) and say "Add the Shopify plugin from the card, sign in with the Shopify account that owns <domain>, then tell me when you're done." When `SearchPlugins` isn't available or finds nothing, check the connector directory instead: `search_mcp_registry(["shopify"])` and, on a Shopify result, `suggest_connectors` with its `directoryUuid`. After they say they're done, re-check as in step 3. No Shopify plugin or connector found → say "There's no Shopify plugin or connector available here to connect your store directly." and go to step 6. In Claude Code these cards don't exist: say the same line and go straight to step 6.
5. **Theme changes through the Shopify connector (primary).** The Shopify connector is how Claude makes direct theme changes for this store. Check, read-only, whether it can write theme files, using the Shopify server's own GraphQL workflow (`graphql_schema` → `validate_graphql_codeblocks` → `graphql_query`; never a mutation here):
   - `currentAppInstallation { accessScopes { handle } }` includes `write_themes`, and `graphql_schema` shows the `themeFilesUpsert` mutation → theme-change path = **Shopify connector**. Record it and finish the step.
   - Otherwise (read-only scopes, or no `themeFilesUpsert`) → the connector stays connected for store data; go to step 6 for theme changes.
6. **Noibu theme tools (backup).** Call `noibu_list_store_themes` with the domain's `numId`:
   - It lists themes → theme-change path = **Noibu theme tools**: "Theme changes will go through Noibu (live theme: <name>): Claude edits a copy of the live theme and gives you a preview link, and you publish it in Shopify." If the store already has 18 or more themes, add in the same message that Shopify allows 20 and each preview adds one.
   - It fails or returns nothing → theme-change path = **none**. Say Noibu doesn't have theme access yet and that their Noibu contact can enable it. Record a to-do for their Noibu contact.
7. **Read only.** Nothing in this step changes the store: no theme edits, no previews, no product or setting changes, no mutations. Reads only.

## Step 4 · Connect the codebase

1. **Detect what's already connected.** With ToolSearch, look for GitHub tools (e.g. `get_me`, `create_pull_request`), Atlassian tools (`getAccessibleAtlassianResources`) and Azure DevOps tools (e.g. `core_list_projects`, `repo_*`); in Claude Code also check `gh auth status`. For any you find, run its proving read (table in `references/connect-codebase.md`).
2. **Pick the host.**
   - Exactly one host is already connected and proven → name it in one line ("GitHub is already connected as <login>.") and go ahead with it; the user can correct it.
   - Otherwise ask with the code-host card (`references/cards.md`, "Code host card"): GitHub, Bitbucket, Azure DevOps, Something else, I'm not sure.
3. **Connect the one they pick, immediately and automatically,** by running its section in `references/connect-codebase.md` end to end. Don't describe the steps first; do them, stopping only for the clicks and approvals that section names.
4. **Pick the repo.** If the business context or a git remote in a connected folder (Claude Code: the working folder) identifies it, confirm it in one line. Otherwise list the repositories the connector can see and ask which one holds the storefront code for <domain> (`AskUserQuestion`, up to three likely repos plus Other). Record it.
5. **"Something else" or "I'm not sure"** (GitLab, self-hosted, no repo, an agency holds the code, or they don't know). Nothing here is a dead end:
   - Check the business context once more for where the code lives. If it names a supported host, confirm it in one line and go to item 3.
   - **Shopify store with no repo** (the theme is edited in Shopify): say "Your theme is edited directly in Shopify, so code changes will go through the theme path from Step 3." Record "Release events: no pipeline to report from" as a to-do for their developer (it can be set up once the theme lives in a repo), skip Step 5, and go to Step 6.
   - **Anything else:** say in one line that this setup can't connect that host yet, record "Connect the code host (<what they said>)" as a to-do with who owns it (their developer or agency), skip Step 5, and go to Step 6.

## Step 5 · Set up release event reporting

Release events tell Noibu when code shipped, so errors and conversion changes can be lined up against deploys. Set this up on the code host connected in Step 4. (Step 4 ended with the code host as a to-do → skip this step. The one exception is GitHub without its connector in Cowork: the workflow is added in the browser, so this step still runs. In Claude Code, GitHub runs through `gh`.)

1. **Already set up?** Check the repo for an existing Noibu release step (`.github/workflows/*` mentioning `webhook.noibu.com`, `bitbucket-pipelines.yml`, or an Azure pipeline YAML with the same URL) and call `noibu_list_releases` for the domain UUID. If a workflow exists and releases are arriving, say so in one line and go to Step 6.
2. **Run the host's reference end to end yourself**, and only that one. The user answers its one question batch and approves the merge and first run; you write the file, open the PR, register or enable the pipeline, run it, and confirm the release reached Noibu.
   - GitHub → `references/release-github.md`
   - Bitbucket → `references/release-bitbucket.md`
   - Azure DevOps → `references/release-ado.md`
3. The domain is already resolved (Step 2) and the repo is already chosen (Step 4): reuse them from the ledger instead of asking again. Ask only for what's still missing (branch, component name, PR or direct commit).
4. Record the PR (or pipeline) link, whether a release has reached Noibu, and anything still waiting on someone else (a required reviewer, an admin) for Step 7.

## Step 6 · Set up the business context

The business context file is what keeps every Noibu report and chat grounded in how this business actually works.

1. **Look first.** Call `noibu_get_business_context` with the domain UUID, check for a context file attached to this chat, and look in the connected folder (Claude Code: the working folder) for a `*-context.md` file whose first line is a `noibu-business-context` sentinel with this domain's UUID.
2. **Ask** with `AskUserQuestion`: "Did Noibu give you a business context file for <domain>?" Options "Yes, I have the file" and "No, I don't have one". If step 1 already found one in Noibu, attached or on disk, say so in the question ("Noibu already has a business context for <domain>, saved <date>") and offer "Use that one" first.
3. **"Yes, I have the file" / "Use that one":** if it isn't attached or on disk yet, ask them to attach or drop it into the chat. Read it, confirm it's for this domain (name or sentinel UUID), and record its file name. If Noibu has no context saved for the domain, ask whether to save this file to Noibu too; on yes, call `noibu_insert_business_context` with the domain's `numId` as `domainNumId` and the file's full contents, unchanged, as `fullContent`. Make sure a copy of the file sits in the connected folder, or the working folder in Claude Code (write it there if it only came as an attachment), so Step 8 can add it to the Project.
4. **"No":** run the user through the `noibu:build-business-context` skill now, for this domain (it already knows the domain UUID and `numId` from the ledger, so tell it the domain up front). That skill writes `<domain>-context.md`, saves it to Noibu, and tells them where it lives. Record the file name and come back here when it finishes.

## Step 7 · Check everything is in place

Re-check each item live (don't rely on what an earlier step said) and report one line each, with ✅, ⚠️ (works but something's pending) or ❌:

- **Noibu connected:** a `noibu_*` call succeeds.
- **Business context saved in Noibu:** `noibu_get_business_context` for the domain UUID returns a non-empty `fullContent`. Nothing saved → say so and run the user through `noibu:build-business-context` before finishing this step.
- **Shopify** (Shopify domains only): `get-shop-info` returns the matching shop, or say there's no Shopify connector.
- **Theme changes** (Shopify domains only): the theme-change path from Step 3, re-checked: Shopify connector (`write_themes` + `themeFilesUpsert`), Noibu theme tools (`noibu_list_store_themes` lists themes), or none (to-do for their Noibu contact).
- **Code host:** the proving read for the connected host (`references/connect-codebase.md`) succeeds and the chosen repo is visible; or the to-do from Step 4.
- **Release reporting:** the PR or pipeline link, its state (open / merged / registered), and whether `noibu_list_releases` shows a release yet; or the to-do from Step 4 or 5.

Then list **anything not done yet**, each with **who needs to do it** (the user, their developer or agency, their Bitbucket or Azure DevOps admin, a Shopify store owner, or their Noibu contact). Nothing left → say "Everything is in place."

## Step 8 · Set up the Noibu Project and recurring reports

Cowork and Claude Code do this part differently: Projects and the scheduling tools below belong to the Claude desktop app. In Claude Code, skip to "In Claude Code" at the end of this step.

### In Cowork

Two parts: a Claude Project that holds the business context file for their day-to-day Noibu chats, and the recurring reports, which you schedule yourself. The reports don't have to live in the Project: each one reads the business context saved in Noibu.

**1. The Project.**
- If a tool to create a Claude Project is available here, create one called `Noibu x <Company>` (the company name from the ledger) and add the business context file from Step 6 to it.
- Otherwise ask for it in one line: "Create a Project called **Noibu x <Company>** and drag `<context file name>` (in <folder name>) into its files. Tell me when it's there." Once they're back, continue; if they'd rather do it later, record it as a to-do for the user.
- Either way, suggest sharing the Project with their organization so their team's chats read the same context.

**2. The recurring reports.** Create every task yourself, one task per report, all in the user's own timezone, so they run on this computer and deliver into Cowork (the desktop app needs to be open at those times). For each, call `list_scheduled_tasks` (or `list_triggers` for ab-testing) first and update a task with the same name instead of creating a duplicate.

| Report | When | Tool | Task name |
|---|---|---|---|
| checkout-analysis | Mondays, 9:00 | `create_scheduled_task` | `checkout-analysis-<domain>` |
| product-analysis | Mondays, 9:00 | `create_scheduled_task` | `product-analysis-<domain>` |
| segment-analysis | Mondays, 9:00 | `create_scheduled_task` | `segment-analysis-<domain>` |
| tech-diagnosis | Mondays, 9:00 | `create_scheduled_task` | `tech-scan-<domain>` |
| store-pulse | Daily, 9:00 | `create_scheduled_task` | `store-pulse-<domain-slug>` |
| ab-testing | Mondays, 10:00 | as in the ab-testing skill's "Scheduling a recurring run" (`create_trigger`, `requires_local_device: true`, goal "All goals") | `ab-testing-<domain>` |

Task names match the ones each skill uses for its own schedules, so the skills' own "edit schedule" flows find them later.

Prompt for each `create_scheduled_task` report (fill the brackets; scheduled runs start cold, so bake in every value):

> Run /noibu:[skill] for [domain] (domain UUID [uuid]) as a scheduled, unattended run. First call `noibu_get_business_context` with that UUID and use it to judge what matters for this business; if it's empty, carry on without it. Put the results directly in this chat: no email, Slack or Notion delivery, no widgets that wait for a click, and no questions.

For ab-testing, use that skill's own scheduled task prompt with the goal "All goals" and add the same first sentence about reading the business context.

When all tasks exist, confirm in one or two lines: which reports run when (say the real stored times), that results appear in Cowork, and that the computer needs to be on with the Claude desktop app open at those times. A task that couldn't be created → say which and record it as a to-do for the user.

### In Claude Code

This part happens in a Claude Project in the Claude desktop app (or claude.ai), so every report reads the domain's business context file. Walk the user through it; they do the clicks.

1. Create a **Project** called `Noibu x <Company>` (the company name from the ledger), and share it with their organization.
2. Drag the business context `.md` file from Step 6 (`<file name>`) into the project's **Context** panel (in some apps this is called "Project knowledge" or "Files").
3. Start a **new chat inside that project** and paste in the prompt below. Show it to the user in a single fenced code block, exactly as written, so they can copy it in one click:

```
First confirm you can read my business context .md file in this project's context and tell me its first heading. If you can't, stop and tell me how to add it.
I want you to do the following:
Set these all up as scheduled tasks. Do this as all separate tasks, make the outputs directly in the chat.

1. Run the following skills weekly at 9am on Monday. checkout-analysis, product-analysis, segment-analysis, tech-diagnosis.
2. Run store-pulse daily at 9am
3. Run ab-testing weekly at 10am on Monday, so I'm at my desk to see it through.
```

Ask them to tell you once the project chat confirms the first heading and the scheduled tasks are created. If they hit a problem, help from here; if they'd rather do it later, record it as a to-do for the user.

## Step 9 · Confirm setup is complete and offer more

1. Confirm the setup in two or three lines: what's connected, what's pending and with whom (from Step 7), where the business context lives (the `Noibu x <Company>` Project and Noibu), and when the scheduled reports run (in Claude Code: that they're set up from the Project chat).
2. Show the more-setup card (`references/cards.md`, "More setup card") with three options: **Custom Attributes**, **Page Groups**, **Ecommerce Events**.
3. These three aren't built into this skill yet. When the user picks one, say in one line that guided setup for it is coming soon, and that their Noibu contact can help set it up in the meantime. Don't attempt it.
