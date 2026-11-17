# Choices and connection check-ins

Every choice in this setup is an `AskUserQuestion`: a click answers it straight away. Don't use `show_widget` button cards for choices: their buttons only fill in the message box, and the user has to press send (with a caution banner) before anything happens.

`AskUserQuestion` takes up to four options and always adds its own field for typing something else. Keep each option's description to one short phrase. Question text is plain: the question box doesn't render bold or other markdown, and don't add menu paths.

## Code host question (Step 5)

- header: "Code"
- question: "Where does your store's code live?"
- options, in this order:
  - "GitHub" ("Connect GitHub")
  - "Bitbucket" ("Connect Bitbucket")
  - "Azure DevOps" ("Connect Azure DevOps")
  - "I'm not sure" ("Note it and keep going")
- **Reading the answer:** the option picked, or what they typed. Typed answers: "github enterprise" → GitHub; "ADO", "azure" → Azure DevOps; "gitlab", "self-hosted", "our agency has it", "no repo", "we edit it in Shopify" → something else; "don't know", "ask my developer" → not sure. Something else and not sure both follow SKILL.md Step 5 item 5.

## Connection check-in

Use this after every connector card (`suggest_connectors`) and `/mcp` sign-in in this setup, instead of asking the user to type "done".

**The card is the confirmation.** A connector the user connects while this chat is running shows **Connected** on its card, but its tools usually don't load into this chat: they load in the chats that start after it. So once the user says it's connected, take their word and the card's, and carry on in this chat. Don't retry, don't ask them to check again, and never tell them it needs a new chat. The scheduled reports and every later chat start fresh, so they get the connector's tools.

1. Show the card (or say the `/mcp` line), then straight away one `AskUserQuestion`:
   - header: the thing being connected ("Noibu", "Shopify", "GitHub", "Bitbucket")
   - question: "<the one action, e.g. Click Connect on the GitHub card above and sign in.> Let me know when it shows Connected."
   - options: "It's connected" ("Carry on with the setup") and, except for Noibu, "Skip for now" ("Add it to the to-do list and move on")
2. **"It's connected":** wake up the connector once (below), with no waiting and no retries.
   - Its tools come back → run its proving read (SKILL.md, or the table in `references/connect-codebase.md`) and use it for the rest of the step. A proving read that fails on authentication means the sign-in didn't finish: say so in one line and show the same card again (its Connect or Reconnect fixes it).
   - Nothing comes back → record it in the ledger as **connected (confirmed on the card)**, say "<Thing> is connected." and carry on with the step's path for a connector that's confirmed but not loaded in this chat (each step says what that is). Don't mention tools or loading.
   - The one exception is Noibu: the setup can't do anything without it in this chat (SKILL.md Step 1).
3. **"Skip for now":** record "Connect <thing>" as a to-do for the user and move on as the step describes for a missing connection.
4. **Typed answers** ("done", "connected", "ok") mean "It's connected"; "skip", "later", "not now" mean "Skip for now".

The ADO hand-off is different: the user quits and reopens Claude, so they come back by typing "done" in the chat (`references/connect-codebase.md`).

## Waking up a connector

A connector that was attached to this chat when it started, but has dropped its connection since, comes back when you ask for it by name: a ToolSearch query that contains the connector's server name reconnects it with the sign-in it already has. A plain search for a tool name (like `get_me`) doesn't. Use this before showing any card (a connector that's already there needs no card) and once after "It's connected".

1. ToolSearch with the query for that connector (the `+` keeps only tools whose name contains the server name):

   | Connector | ToolSearch query | Tool that should come back |
   |---|---|---|
   | Noibu | `+noibu list_domains` | `…noibu_list_domains` |
   | Shopify | `+shopify get-shop-info` | `…get-shop-info` |
   | GitHub | `+github get_me` | `…get_me` |
   | Bitbucket (Atlassian) | `+atlassian getAccessibleAtlassianResources` | `…getAccessibleAtlassianResources` |
   | Azure DevOps (local) | `+ado core_list_projects` | `…core_list_projects` |

2. Call the proving read by the full tool name the search returned.
