# Clickable option cards

Two moments in the setup ask the user to pick from a short list: which code host they use (Step 4) and which extra setup they want next (Step 9). Both are `show_widget` cards with the same chrome, falling back to `AskUserQuestion`.

## How to show a card

Load `show_widget` with ToolSearch (`select:mcp__visualize__show_widget`) if it isn't loaded, and call `mcp__visualize__read_me` once (module `interactive`, silently) if this chat hasn't yet. Then call `show_widget` with the card's `title` and two short loading messages.

Every card is one bordered panel: an uppercase eyebrow naming the domain, a heading that is the question, then full-width buttons stacked top to bottom. `[...]` are placeholders; use the markup as written.

```html
<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);overflow:hidden;">
  <div style="background:var(--color-background-secondary);padding:8px 20px;border-bottom:0.5px solid var(--color-border-tertiary);">
    <span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.06em;">Noibu setup · [domain]</span>
  </div>
  <div style="padding:20px;">
    <p style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:0 0 16px;">[The question]</p>
    [One per option, in order:]
    <button onclick="sendPrompt('[phrase]')" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:14px;font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;margin-bottom:8px;">[Label] ↗</button>
    [The last button has margin-bottom:0.]
  </div>
</div>
```

Buttons are label only: no subtitles, no text between the heading and the buttons, nothing under them. Don't put double quotes inside a `sendPrompt` phrase, escape apostrophes as `\'`, and write `&` as `&amp;`. After the card, write at most the one line given below, then wait for the click.

## Code host card (Step 4)

- `title: "noibu_setup_code_host"`; loading messages such as `["Checking which code tools are connected...", "Laying out the options..."]`.
- **Question:** "Where does your store's code live?"
- **Buttons → phrases:**
  - GitHub → "My code is on GitHub"
  - Bitbucket → "My code is on Bitbucket"
  - Azure DevOps → "My code is on Azure DevOps"
  - Something else → "My code is somewhere else"
  - I'm not sure → "I\'m not sure where my code lives"
- **After the card:** "Pick one, or type it if it's something else."
- **Reading the reply:** match the phrase or any paraphrase ("bitbucket", "ADO", "azure", "github enterprise" → GitHub; "gitlab", "self-hosted", "our agency has it", "no repo", "we edit it in Shopify" → something else; "don't know", "no idea", "ask my developer" → not sure). Something else and not sure both follow SKILL.md Step 4 item 5.

## More setup card (Step 9)

- `title: "noibu_setup_more"`; loading messages such as `["Wrapping up your setup...", "Lining up what's next..."]`.
- **Question:** "Want to set up anything else?"
- **Buttons → phrases:**
  - Custom Attributes → "Set up Custom Attributes"
  - Page Groups → "Set up Page Groups"
  - Ecommerce Events → "Set up Ecommerce Events"
- **After the card:** nothing; wait.

## Fallback without `show_widget`

If ToolSearch finds no `show_widget`, or the call fails, ask the same question with one `AskUserQuestion` using the same labels in the same order (option descriptions one short neutral phrase each, only where the tool requires one). `AskUserQuestion` takes at most four options, so for the code host card the fourth option is "Something else or not sure" (it follows SKILL.md Step 4 item 5, like both buttons it replaces). Never skip the question because the widget is missing.
