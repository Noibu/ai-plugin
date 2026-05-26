# Integrations

Read this reference when the user asks about integrations, available services, "connect a new service", "check my integrations", or "what can I connect" — or when they want to disconnect or reconnect something.

Four tools manage the integration lifecycle.

## noibu_list_integrations

Renders an interactive integrations panel inside Claude's UI listing all supported services and their current connection status (connected, not-connected, expired, failed, pending). Call when the user asks about integrations, available services, "connect a new service", "check my integrations", or "what can I connect".

**After calling this tool, do NOT generate a text table, list, or summary of the integrations.** The UI panel displays all the data. Respond with one brief sentence at most (e.g. "Here are your integrations.") then stop.

The rendered panel has built-in **Connect** and **Disconnect** buttons per row that drive `noibu_connect_integration` / `noibu_disconnect_integration` directly from the iframe. You don't need to call those tools yourself once the panel is up unless the user asks in chat.

## noibu_connect_integration

Call when the user wants to connect a named service in chat (e.g. "connect my Shopify"). The UI opens the OAuth flow automatically. **Do NOT describe the OAuth steps, repeat the redirect URL, or generate any further text** — the panel handles it. Respond with one brief sentence (e.g. "Opening Shopify authorization now.") then stop.

(The integrations panel calls this tool internally when the user clicks **Connect**, so you usually only invoke it directly when the panel isn't already mounted.)

## noibu_check_integration

Call when the user says "done" after an OAuth flow. On success, confirms the connection. On failure, shows the root cause and offers to retry.

## Available external services

Toolkit slug → display name:

- `googleads` → **Google Ads** (campaigns, ad groups, keyword performance)
- `metaads` → **Meta Ads** (ad campaigns and performance)
- `instagram` → **Instagram** (business accounts and media)
- `facebook` → **Facebook** (pages and business data)
- `google_search_console` → **Google Search Console** (search performance and indexing)
- `gorgias` → **Gorgias** (customer support tickets)

## Connection flow

1. User asks about integrations → call `noibu_list_integrations` — the Integrations panel mounts and shows all connectors grouped by category.
2. The panel owns Connect and Disconnect — **do not call `noibu_connect_integration` or `noibu_disconnect_integration` directly while the panel is visible**.
3. After the user clicks **Connect** in the panel, it opens the OAuth URL automatically and polls every 10 s (up to 1 min) until the connection succeeds or fails — **do not prompt the user to say "done"** and do not call `noibu_check_integration`.
4. If the panel is not mounted (chat-only context), call `noibu_connect_integration` directly, then ask the user to say "done" and call `noibu_check_integration` to confirm.
