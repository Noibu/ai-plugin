---
name: setup-noibu
description: "Onboard a new Noibu customer end to end — authenticate to their Noibu account, verify that session data is actually being collected for their store, and if it isn't, identify their ecommerce platform and walk them through installing the Noibu tracking script using the official deployment guides. Use this skill whenever someone is getting started with Noibu, mentions setting up or connecting Noibu, asks why they aren't seeing any data or sessions, needs to deploy or install the Noibu script, or otherwise needs help getting their store collecting data — even if they don't explicitly say 'setup' or 'onboarding'."
---

# Noibu Onboarding

You're running the Noibu onboarding flow for a customer who's getting set up. Work through the steps in order, and run this fresh on every invocation — don't assume prior state.

---

## Step 1 — Authenticate to Noibu

Authentication runs through the Noibu connector bundled with this plugin, which exposes its own sign-in tools. You don't build or reason about the sign-in mechanics yourself — those tools do. Your job is to make sure the connector is installed, start the sign-in flow, relay the link the user needs to open, and wait until a real Noibu tool call succeeds.

**How to do it:**

1. Attempt to call any lightweight Noibu tool (for example, resolving the store's domain). If it succeeds, the user is already connected — skip to Step 2.
2. **Make sure the bundled Noibu connector is installed.** The connector ships with this plugin but is often *available but not yet installed* — when that's the case, none of the Noibu tools are present at all (not even the `authenticate` / `complete_authentication` tools). If no Noibu tools are available, the user needs to install it before anything else can happen:
   > "The Noibu connector comes with this plugin but isn't installed yet. Please install it so I can connect to your account: open your connectors and install **Noibu** from the available list. (In Claude Code you can run `/mcp`, select **Noibu**, and install it.)"

   Wait for the user to confirm it's installed, then re-check for Noibu tools (load them via ToolSearch if needed) before continuing.
3. Once the connector is installed but you still get an authentication error (the only Noibu tools available are its `authenticate` / `complete_authentication` tools), start the sign-in flow by calling the Noibu connector's authenticate tool — `mcp__plugin_noibu_noibu__authenticate` (load it via ToolSearch first if it isn't already available). It returns an authorization link.
4. Share that link with the user and ask them to open it and sign in:
   > "I need to connect to your Noibu account. Please open this link to sign in: <link>"
5. After they authorize:
   - Usually the connection completes on its own and the full set of Noibu tools becomes available. Re-test by calling a lightweight Noibu tool.
   - If their browser instead lands on a page that won't load (a `localhost` address), that's expected on a remote session — the link in the address bar is still valid. Ask them to copy that full URL and paste it back, then pass it to `mcp__plugin_noibu_noibu__complete_authentication` as `callback_url` to finish.
6. Wait. Do not proceed until a Noibu tool call actually succeeds. Re-test by calling a lightweight Noibu tool again.

### Guardrails

- **Only ever use the authorization link returned by the authenticate tool.** Never hand-write, guess, or assemble a sign-in URL yourself — nothing containing `/authorize`, `response_type`, `client_id`, `code_challenge`, `redirect_uri`, `state`, or `scope`. If you catch yourself building one, stop and call `mcp__plugin_noibu_noibu__authenticate` instead, then use exactly what it returns.
- **Never hit `mcp.noibu.com/authorize` or any other sign-in endpoint directly** with a browser, curl, or fetch. The `authenticate` / `complete_authentication` tools are the only path.
- The callback URL the user pastes back (step 4) is the one piece of input you accept from them, and only to feed straight into `complete_authentication`. Never ask them for a code, token, or password.

The only correct outcome of Step 1 is: the user opens the link from the authenticate tool, signs in, and a Noibu tool call subsequently succeeds.

---

## Step 2 — Verify data is being collected

After authenticating, check whether Noibu is actively collecting session data for the store. Use the Noibu data connection check tool (the one that returns a boolean indicating whether data has been received in the last 24 hours — look for a tool with a name like `noibu_check_data_connection` or similar).

**If data is present:** Tell the user everything looks good and they're ready to go.

**If the tool returns false** (no data received in the last 24 hours), first do a secondary check using the Claude in Chrome connector before concluding Noibu isn't installed:

- Check whether the Claude in Chrome connector is available (look for tools like `read_network_requests`, `navigate`, or `list_connected_browsers`). If those tools are not present, prompt the user to install the Claude in Chrome extension:
  > "To verify whether Noibu's script is loading on your store, I need the Claude in Chrome extension. You can install it here: https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn — once it's installed and you've opened it in your browser, let me know and I'll check your store automatically."
  Wait for the user to confirm before continuing.

- Once the connector is available, navigate to the store's domain and use `read_network_requests` to inspect network traffic. Look for a WebSocket connection with the URL `wss://input.noibu.com/pv_part`.
- **If the `pv_part` WebSocket connection is present:** Noibu is installed and collecting — data just hasn't shown up in the last 24 hours yet (e.g. no visitors, or install was very recent). Tell the user:
  > "Noibu's script is loaded on your store — it's set up correctly. Data will appear once visitors start coming through. You're good to go!"
  Then skip the rest of Step 2 and proceed to Step 3.
- **If the `pv_part` WebSocket connection is not found:** Noibu is not installed. Walk them through setup:

1. Inform the user plainly:
   > "It looks like Noibu isn't collecting data for your store yet. Let's get that set up."

2. Identify their platform with AskUserQuestion. Some platforms have a headless variant, so use a two-step approach:

   **First question — "Which platform is your store built on?"**
    - Shopify
    - BigCommerce
    - Salesforce Commerce Cloud
    - Magento

   AskUserQuestion automatically provides an "Other" free-text option. If the user types anything there (any platform not in the list above), treat it as **Other**.

   **Follow-up question (only when needed):**
    - If they chose **Shopify** → "Is it a standard Shopify store, or Headless / Hydrogen?" → *Standard Shopify* · *Headless & Hydrogen*
    - If they chose **BigCommerce** → "Standard BigCommerce, or Headless?" → *Standard* · *Headless*
    - **Salesforce Commerce Cloud** and **Magento** have no follow-up needed.
    - **Other** has no follow-up needed — go straight to step 3 and present both deployment options.

3. Fetch the deployment guide that matches their exact platform. Use `mcp__workspace__web_fetch` to read the matching article:

   | Platform | Deployment guide |
      |---|---|
   | Shopify | https://help.noibu.com/hc/en-us/articles/4423284400397 |
   | Shopify (Headless & Hydrogen) | https://help.noibu.com/hc/en-us/articles/32400240997517 |
   | BigCommerce | https://help.noibu.com/hc/en-us/articles/28863646155661 |
   | BigCommerce (Headless) | https://help.noibu.com/hc/en-us/articles/33763882963725 |
   | Salesforce Commerce Cloud (SFCC) | https://help.noibu.com/hc/en-us/articles/35122094376461 |
   | Magento | https://help.noibu.com/hc/en-us/articles/360049437452 |
   | Other (via tag manager) | https://help.noibu.com/articles/8848330904-deploying-the-noibu-script-overview#deployment-via-tag-management-system |
   | Other (manual) | https://help.noibu.com/articles/9602865232-manual-script-deployment |

   **Shopify install link:** For both Shopify paths (Standard and Headless / Hydrogen), give the user the direct app-install link so they can install in one click: https://apps.shopify.com/noibu

   **Other platform — tag manager path:** Ask which tag manager they use, then link to the matching guide:
    - Google Tag Manager → https://help.noibu.com/hc/en-us/articles/360049437412
    - Tealium IQ → https://help.noibu.com/hc/en-us/articles/5716697275661
    - Adobe Launch → https://help.noibu.com/hc/en-us/articles/13115828504589

   **Other platform — post-install requirements:** After covering the deployment steps, always include the following two sections for any Other/custom platform user, as missing either can silently break data collection:

    - **CDN allowlisting** — Noibu's servers must be allowlisted on their CDN. They need to whitelist:
        - URLs: `wss://*.noibu.com` and `https://*.noibu.com`
        - IP address: `34.123.113.243`
        - User agent: `Noibu JS Beautifier`
        - If they use a Content Security Policy (CSP), these must also be added to the `script-src`, `connect-src`, and `worker-src` directives.

    - **Referrer Policy** — Their site must send the Referer Header. The correct policy is:
      ```
      strict-origin-when-cross-origin
      ```
      They can verify it's working by checking the Referer Header in their browser's network dev tools.

4. Read the fetched guide and summarize the setup steps in plain language, tailored to their platform. If the guide includes a script or code snippet, reproduce it exactly — do not paraphrase, shorten, or alter it. Include the direct link to the guide.

5. Close by telling them how to signal they're done, so the wrap-up can pick up:
   > "Once Noibu is installed and collecting data, just reply here — something like 'done' — and I'll confirm it's working. Then we can run a full checkout analysis for you."

> **Do not** prompt for the Shopify MCP or call any Composio tools in this flow.

---

## Step 3 — Wrap-Up

When the user replies that they're done (for example "done", "installed it", "connected"):

1. Re-run the data check from Step 2 to see whether collection is active. Note that data can take **up to ~10 minutes** to start showing after install (and only once visitors hit the store), so an empty result right after setup is normal — not a sign anything is wrong.
2. **If data is now coming through:** Celebrate in a warm, specific way — name the platform they deployed Noibu on — then suggest next steps:
   > "You're all set! To see how your store is performing right now, try `/store-pulse` for a live health overview, or `/find-opportunities` to surface where you're leaving revenue on the table."
3. **If data isn't showing yet:** Treat this as expected, not a failure. Reassure them the install looks right, and set the expectation clearly:
   > "Your Noibu install looks good! Data can take up to about 10 minutes to start coming through — and it'll begin once visitors land on your store. Check back in a bit and reply here, and I'll confirm it's collecting. Then we can dig into your checkout analysis."

The goal is to end the session with the user excited to ask their first question, not staring at a confirmation screen.

---

## Tone Guidelines

- This skill is for Noibu's customers, not internal users. Write as a friendly product expert from Noibu helping someone get set up for the first time.
- Be encouraging and specific, not generic. Reference their actual tool names.
- Stay neutral about the setup itself — don't describe a platform or its steps as easy, hard, quick, simple, or involved. Just walk through what's needed.
- Keep each phase moving — don't over-explain. One clear action at a time.
- Avoid jargon like "OAuth", "MCP", or "registry" in messages to the user. Say "connect" and "sign in" instead.
