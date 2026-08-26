# Tech diagnosis setup

Runs on first use (no config found) or when the operator asks to update their setup. Ask one connector at a time — send a message, wait for the reply, then move to the next. Never present multiple connectors at once.

---

## Intro message

Send this first, then stop and wait:

**First run:**
> "Before we dive in, I have a couple of quick optional connections that make the diagnosis more precise. Each one is optional and only takes a moment — let's go through them one at a time."

**Update:**
> "Sure — let's update your setup. I'll go through each one and you can change any of your previous choices."

---

## Step 1 — Code repository (GitHub)

**Always ask this first.** It unlocks the most: pointing to the exact file and line that needs changing, and drafting a pull request with the fix.

**Before sending the message:** Check if GitHub tools are already available in the session.
- If GitHub tools **are present**, include the warning variant below — the default connector is read-only and cannot apply fixes.
- If GitHub tools **are not present**, use the standard variant.

**Standard variant** — send and wait for reply:

> "**Code repository** — if your store's theme or code lives in a GitHub repo, connecting it lets me point to the specific file and line that needs changing instead of giving general advice, and draft a pull request with the fix. Connect, skip for now, or never ask?"

**Warning variant** — send and wait for reply:

> "**Code repository** — I can see you have a GitHub connector active, but the default GitHub integration is read-only and won't be able to apply fixes automatically. To get the full experience, you'll need to disconnect it and add the Noibu GitHub connector instead. Want to switch it over, skip for now, or never ask?"

**Outcomes:**
- **Connect / switch it over** → two steps are required, in order:
  1. If the warning variant was shown (default connector already active), first tell them: "Go to **Settings → Connectors** and disconnect the existing GitHub connector first. Let me know once it's removed." Wait for confirmation before continuing.
  2. Tell them: "Go to **Settings → Connectors → Add custom connector** and enter `http://api.githubcopilot.com/mcp` as the MCP address. Let me know once it's added."
  3. Wait for confirmation, then tell them: "Now install the GitHub app to grant access to your repo — visit https://github.com/apps/claude-github-mcp-connector and install it on the account or organisation that owns your store's repo. Let me know once that's done."
  4. Once they confirm both steps, ask: "What's the repo? (e.g. `mycompany/my-store`)" — **this is required, not optional**. Wait for reply. Save `status: connected` and `repo` to config.
- **Skip for now** → save nothing. Will ask again next session.
- **Never ask** → save `status: skipped`. Won't ask again.

---

## Step 2 — Platform connector (Shopify, fallback only)

**Only ask if BOTH are true:**
1. **GitHub was not connected in Step 1** — they said skip for now, never ask, or the connection didn't complete.
2. The domain's platform is Shopify.

If GitHub is connected, skip this step — the repo already exposes the real code, so the store connection adds nothing. If the platform isn't Shopify, skip it too. In either case: **do not mention the step, do not name the platform, do not explain why it's being skipped, say nothing.**

Without repo access this is the next best thing: it exposes the live theme and template settings, so the recommendation can be grounded in the real store instead of a guess.

Check if the Shopify MCP tools are available in the current session (they appear as Shopify tools in the tool list). If they are available, save `status: connected` to config and skip this step — don't ask. If they are not available, send this message and **wait for reply before continuing:**

> "**Shopify** — since I won't have your code repo, connecting your store is the next best thing: it lets me see your live theme and settings when diagnosing an issue. For example, if a product variant looks like the cause, I can confirm whether it's really out of stock rather than just guessing. Connect, skip for now, or never ask?"

**Outcomes:**
- **Connect** → call `suggest_connectors` with UUID `80917cb7-3071-4fca-b053-a4262d356c60` and keyword `store`. Ask: "Once connected, let me know — or say 'skip for now' or 'never ask'." Wait for reply. Save `status: connected` on success.
- **Skip for now** → save nothing. Will ask again next session.
- **Never ask** → save `status: skipped`. Won't ask again.

---

## Step 3 — Claude in Chrome

First, silently check if Claude in Chrome tools are available. If they are, skip this step entirely — **do not mention Chrome, do not confirm it's active, say nothing.** If not, send this message and **wait for reply before continuing:**

> "**Claude in Chrome** — enables me to open your live pages in a real browser and run performance tests directly. This gives much more accurate speed diagnosis, especially on mobile, compared to working from data alone. You can turn it on in your Claude settings under Customize. Enable it and let me know, or say 'skip for now' or 'never ask'."

**Outcomes:**
- **Enabled / let me know** → verify Chrome tools are now available. If yes, confirm. If still not active, let them know to restart and try again. Save nothing (detected at runtime).
- **Skip for now** → save nothing. Will ask again next session.
- **Never ask / security reason** → save `chrome_inspection: skipped`. Won't surface this again.

---

## Confirm and proceed

Once all steps are answered, **always write `$HOME/.tech-diagnosis-config.json` using the shell tool — even if every answer was "skip for now".** The file must exist after setup so future sessions can read it. Use the Python merge pattern from SKILL.md → Configuration. Confirm in one sentence:

> "All set — [one-line summary, e.g. 'Shopify and Chrome are connected, code repo skipped for now.']. Let's get into the diagnosis."

Then proceed into the skill — if a domain was already provided, continue with Setup from where it left off.

---

## Mid-flow GitHub setup (triggered by "Automatically draft a pull request (PR)")

When the operator clicks "Automatically draft a pull request (PR)" and GitHub is not yet connected (status unset or skipped), skip the full setup flow and go straight to GitHub only:

> "To apply fixes automatically I need access to your code repo. Go to **Settings → Connectors → Add custom connector** and enter `http://api.githubcopilot.com/mcp` as the MCP address, then install the GitHub app at https://github.com/apps/claude-github-mcp-connector. Let me know once both are done."

Wait for confirmation, then ask for the repo name, save to config, and proceed with applying the fix.
