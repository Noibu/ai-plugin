---
name: setup-noibu
description: "Connect to your ecommerce tools via Noibu. Interactive onboarding guide for Noibu customers in Cowork. Checks the connection status of the Noibu MCP and key integrations (Google Ads, Klaviyo, Instagram, Facebook, Mailchimp, Google Search Console, Gorgias) on every run, then guides the user through connecting new tools or reconnecting broken ones with a warm, step-by-step experience."
---

You're running the Noibu onboarding flow. This skill runs two phases: first confirming the Noibu MCP is connected, then checking and setting up the third-party integrations.

Run this on every invocation — don't assume prior state. Always check fresh so the status you show the user is accurate right now.
 
---

## Phase 1 — Connect Noibu

Search the registry to check if Noibu is connected:

```
search_mcp_registry(keywords: ["noibu"])
```

The Noibu connector UUID is: `a53d8516-38be-4a45-bddb-88be145c1e57`

**If connected** (`"connected": true`): Greet the user warmly and confirm Noibu is active. For example:

> "Great news — Noibu is already connected! That means I can help you dig into your checkout error data, analyse session impact, and surface revenue leaks. Let's make sure your integrations are set up too."

Then move straight to Phase 2.

**If not connected** (`"connected": false`): Explain what connecting Noibu unlocks in plain, customer-friendly terms — e.g., the ability to ask natural-language questions about checkout errors, session replays, and revenue impact. Keep it to 2-3 sentences. Then show the connect button:

```
suggest_connectors(uuids: ["a53d8516-38be-4a45-bddb-88be145c1e57"], keywords: ["noibu"])
```

After showing the button, tell the user:

> "Once you've connected Noibu using the button above, just reply here with something like 'done' or 'connected' — I'll verify it's working and we'll move straight to your integrations."

Wait for the user to confirm before continuing. When they do, re-run the registry search to verify the connection. If verified, congratulate them briefly and continue to Phase 2. If still not connected, let them know gently and ask them to try again.
 
---

## Phase 2 — Shopify MCP

This phase is separate from the Noibu-managed integrations. Shopify's own MCP server gives Claude direct access to your store's products, orders, customers, inventory, and analytics — independently of Noibu.

Check the registry for the Shopify MCP connector:

```
search_mcp_registry(keywords: ["shopify"])
```

- Shopify MCP connector UUID: `80917cb7-3071-4fca-b053-a4262d356c60`
- Shopify MCP URL: `https://setup.shopify.com/mcp`
  **If connected** (`"connected": true`): Confirm it briefly and describe what it unlocks. For example:

> "Your Shopify store is connected directly — I can now browse your products, pull order history, check inventory levels, and run store analytics. This works alongside your Noibu data for a complete picture."

Then move on to Phase 3.

**If not connected** (`"connected": false`): Explain the value in plain terms — e.g., being able to look up products, orders, and customers directly from chat. Then show the connect button:

```
suggest_connectors(uuids: ["80917cb7-3071-4fca-b053-a4262d356c60"], keywords: ["shopify"])
```

After showing the button, tell the user:

> "Once you've signed into Shopify using the button above, just reply here and I'll verify it's live — then we'll move on to your other integrations."

Wait for the user to confirm, re-run the registry check to verify. If verified, confirm it briefly and continue to Phase 3. If still not connected, let them know gently and ask them to try again.
 
---

## Phase 3 — Audit Integration Status

Call the list integrations tool to open the integrations UI:

```
noibu_list_integrations()
```

> **Important:** `noibu_list_integrations` renders its own interactive UI panel. Do NOT generate any additional visualization, chart, or custom UI after calling it — the panel is the complete output. Simply wait for the user to tell you they are done or tell you what they want to connect.
 
---

## Phase 4 — Wrap-Up

When the user says they're done connecting, call `noibu_list_integrations()` again to refresh the integrations UI and show updated statuses. Do NOT generate any additional visualization after this call — the rendered panel is the complete output. Then:

- Celebrate what they've set up in a warm, specific way.
- Suggest the following skills: `/store-pulse` or `/find-opportunities`
  Keep the tone warm and action-oriented — the goal is to end the session with the user excited to ask their first question, not just staring at a confirmation screen.

---

## Reconnecting a Broken Connector

If a connector appears connected but tools are failing, call `noibu_list_integrations()` to open the integrations UI — the user can reconnect directly from there. Do NOT generate any additional visualization after this call.

For Shopify MCP specifically, if tools under `mcp__0b59c5c4-496b-46fe-9bd3-6b8e776743c8` are failing, show the reconnect button:

```
suggest_connectors(uuids: ["80917cb7-3071-4fca-b053-a4262d356c60"], keywords: ["shopify"])
```
 
---

## Tone Guidelines

- This skill is for Noibu's customers, not internal users. Write as if you're a friendly product expert from Noibu helping someone get set up for the first time.
- Be encouraging and specific, not generic. Reference their actual tool names.
- Keep each phase moving — don't over-explain. One clear action at a time.
- Avoid jargon like "OAuth", "MCP", "registry" in messages to the user. Say "connect" and "sign in" instead.