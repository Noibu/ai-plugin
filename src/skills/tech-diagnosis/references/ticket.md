# Ticket

Reached when the operator selects "Open a ticket" from the closing offer.

Full content always included (Summary + Technical details + Cause + Fix). No widget, no content selection.

## Automatically draft a pull request (PR)

Only available when **both** conditions are met:
- GitHub tools are active in the session and a repo has been provided
- A specific file and line was identified from source enrichment

If either condition isn't met, do not offer or mention this option.

When both conditions are met:
1. **Confirm the fix** — briefly restate the specific change in plain language and ask the operator to confirm before touching their code.
2. **Create a branch** — name it descriptively (e.g. `fix/[plain-English-description]`).
3. **Apply the fix** — write the exact code change to the correct file in the repo.
4. **Open a review request** — title: plain-English summary of what was fixed. Body: Summary → Cause → Fix in markdown. Link to the Noibu finding by issue ID.
5. **Confirm it's ready** — surface the link and tell them someone needs to review and approve it before it goes live.

---

## Creating a ticket

Only create tickets for **fixable JS errors** and **performance issues**. Do not create tickets for vendor issues — those are third-party origin and not actionable by the operator's team.

1. **Ask where the ticket should go** — use `AskUserQuestion` with a single question, `header: "Destination"`, `multiSelect: false`, four options: Linear, Jira, GitHub Issues, Notion. No status indicators.

   After the operator selects: check if the chosen destination is connected. If connected, proceed directly. If not connected, **do not narrate that it's unavailable** — call `suggest_connectors` immediately to show the install UI. Load `suggest_connectors` via ToolSearch if needed. UUIDs:
   - Linear: search registry for "linear"
   - Jira: search registry for "jira"
   - GitHub Issues: `fe983ccb-92c7-4df1-85af-b1c3340b89bb`
   - Notion: `69f3a300-cc60-48c4-b237-dfac56530dbf`

   Wait for the operator to connect, then proceed.

2. **Ask for destination details** — team, project, or page as needed for the selected platform. Ask before creating and collect all details in one message. No saving — ask each session.

3. **Create tickets in parallel** — one per eligible finding (fixable JS errors and performance issues only) per selected destination:
   - Title: `[severity] [summary] (affecting [segment])`
   - Body in markdown: Summary → Technical details → Cause → Fix
   - Priority mapping (where supported): critical → high; standard → medium; third-party-origin → default/low
   - Labels (only if pre-existing): `tech-diagnosis`, `error` or `performance`, severity, `noibu`
   - Assignee: unset unless operator specifies

4. **Surface ticket URLs** after creation. Report partial failures honestly.
