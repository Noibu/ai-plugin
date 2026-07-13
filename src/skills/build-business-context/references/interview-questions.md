# Interview Question Bank

Pull from this — don't read it aloud question by question. Ask in small themed batches
(3-4 at a time, the `AskUserQuestion` limit), react to answers, and follow the threads
that open up. Skip questions that research already answered or that don't apply. The
goal is grounded context, not a completed form.

**Default to `AskUserQuestion` widgets.** Each `→ widget:` line below gives a starting
menu; fill the options with what your research found (the detected platform, their real
channels) and lead with the most likely answer. The tool always adds an "Other"
free-text escape, so options never trap the user. Questions marked `→ prose` resist
widgets (exact numbers, open narrative) — ask those in plain text, ideally as a short
follow-up after a widget batch.

Each theme lists the core questions plus follow-ups worth chasing.

---

## 0. Setup (ask before researching)

The domain is already resolved in SKILL Step 1 — don't re-ask it here. Setup below is
the Step 2 batch.

- Do you have any existing context files, brand guidelines, personas, or strategy docs
  I should fold in? `→ widget:` Yes, I'll share them / No, start fresh.
- Do you record customer or sales calls in Gong or Fellow? If so, should I pull the
  transcripts and mine them for context?
  - `→ widget:` Yes — Gong / Yes — Fellow / Yes — both / No, skip transcripts.
  - *Follow-up:* which calls matter — a specific account, a date range, or all of them?
    (Used to scope the transcript pull in research.)

---

## 1. Goals for the year

- What does success look like this year for the business?
- If you could only improve ONE of these this year, which? (Single choice — this is the
  priority signal that feeds **Goals & priorities** in the file, distinct from what they
  merely track in Theme 3.)
  - `→ widget:` Conversion rate / AOV / ROAS / Total revenue / Retention — adapt to the
    business (add wholesale growth, a sub-brand, a new market if research surfaced one).
- Any specific initiative or launch that has to land this year?
- *Follow-ups:* Revenue or growth target? New market or channel? A turnaround on
  something that's underperforming?

---

## 2. Where you think you're losing money

- Where on the site does it feel like money leaks out?
  - `→ widget (multiSelect):` Checkout / Cart / PDP / Search / Collection pages / Mobile
    vs. desktop / Paid traffic that doesn't convert. Multi-select — leaks rarely have one
    home.
- Have you seen this in data, or is it a gut feel?
  - `→ widget:` Seen it in data / Gut feel / Both. (Label which in the file.)
- *Follow-ups:* Any specific PDPs, collections, or flows you already worry about? Does
  checkout feel solid, or do people fall out there? How's mobile vs. desktop?

---

## 3. Performance targets & current numbers

- `→ prose:` What's your target vs. current ROAS? Target vs. current conversion rate?
  AOV? These are exact figures — ask in plain text; widgets can't capture a number.
- Which of these do you already track week to week? (Feeds the **Performance targets**
  table — same metrics as Theme 1, but here the lens is what they monitor, not their one
  priority.)
  - `→ widget (multiSelect):` Conversion rate / AOV / ROAS / Revenue / Sessions or
    traffic / Bounce or exit rate / Retention or repeat rate.
- *Follow-ups:* A benchmark you measure yourself against?

---

## 4. The customer (in their words)

- Is there a B2B / B2C split? Roughly what's the revenue mix?
  - `→ widget:` Pure B2C / Pure B2B / Mostly B2C with some B2B / Mostly B2B with some
    B2C / Even mix.
- Do you have buyer personas, formal or informal?
  - `→ widget:` Formal documented personas / Informal sense of them / None yet.
- `→ prose:` Here's the important one — is there anything about how your store works
  that makes standard e-commerce metrics misleading? (Minimum order values/quantities,
  multi-visit research before buying, bulk/trade buyers, a page that "converts badly"
  but is doing its job.) **Keep this open** — the unprompted answer is the whole point;
  don't reduce it to checkboxes.
- *Follow-ups:* Who's your most valuable customer? How do you tell a high-value customer
  from a tire-kicker in your data? Any past analysis that got your business wrong?

---

## 5. Tech stack & site quirks

- What platform is the store on? (Confirm what research found.)
  - `→ widget:` Lead with the platform research detected, labelled `(likely)` — then
    Shopify / BigCommerce / Magento or Adobe Commerce / Salesforce Commerce / WooCommerce
    / Custom.
- Is checkout the platform's native checkout, or customized?
  - `→ widget:` Native / Customized / Fully custom / Not sure.
- Custom theme or a stock/standard one?
  - `→ widget:` Custom theme / Stock theme / Lightly customized stock.
- *Follow-ups:* Who's your payment processor and any separate vaulting provider? Key
  apps — reviews, search, loyalty, subscriptions, analytics? Anything fragile where a
  code change is risky? Is your repo connected to Claude? Any staging store?

---

## 6. Deployment & dev team

- Who builds and ships changes right now?
  - `→ widget:` Internal engineers / An agency / A freelancer / No one technical.
    (This answer reshapes the follow-ups — branch on it.)
- Is there a staging or test environment, or do changes go straight to production?
  - `→ widget:` Staging then production / Straight to production / Not sure.
- How cautious is the team about merging changes — especially AI-suggested ones?
  - `→ widget:` Very cautious, heavy review / Moderate, normal review / Move fast, light
    review.
- *Follow-ups:* What's the typical process to get a change live? Who reviews and
  approves? For an agency — retainer or hourly, how fast, new to AI workflows? What kind
  of change is easiest vs. hardest to get merged?

---

## 7. Support / CS workflow

- How big is your support team?
  - `→ widget:` No dedicated support / 1-2 people / 3-10 / 10+.
- Do you use a ticketing system, or handle it some other way?
  - `→ widget:` Dedicated tool (Zendesk, Gorgias, etc.) / Shared inbox / Ad hoc, no
    system.
- *Follow-ups:* When something breaks on the site, how does it get flagged and fixed?
  Cross-team visibility, or does it live in inboxes? Any appetite for process change?

---

## 8. Marketing & channels

- Which channels do you use today?
  - `→ widget (multiSelect):` Paid search / Paid social / Email / SMS / Organic social /
    SEO / Affiliate or influencer / Marketplaces. Pre-check the ones research surfaced.
- Which feels like your single biggest near-term growth opportunity?
  - `→ widget:` Offer the same channel list single-select, framed as "most upside."
- *Follow-ups:* Which channels are working vs. underused? Email program maturity? Paid
  vs. organic mix? Strong seasonal patterns? Any channel you know you're neglecting?

---

## 9. How you want Claude to work with you

This whole theme is option-shaped — ask it as one or two widget batches (4 questions max
each).

- Direct and concise, or more thorough?
  - `→ widget:` Direct and concise / Thorough and detailed / Depends on the task.
- Plain language, or comfortable with technical detail?
  - `→ widget:` Plain language / Technical is fine / Mix depending on topic.
- When you ask for something, do you want it produced, or options to choose from?
  - `→ widget:` Just produce it / Give me options first / Depends on the stakes.
- Should Claude plan before acting on big tasks?
  - `→ widget:` Always plan first / Only for big or risky tasks / Just go.
- *Follow-ups:* How opinionated do you want it to be? Any tone or formatting
  preferences? Brand spelling conventions to always apply?

---

## Closing

- Anything important about the business I didn't ask that Claude should always know?
- Of everything we covered, what are the two or three things Claude must never get
  wrong about your store?

Use the answer to that last question to build the standing-reminders checklist at the
end of the file.
