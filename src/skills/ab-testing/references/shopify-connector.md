# Shopify connector: theme access, the `noibu:store-preview-qa` gate, and preview themes

Read this only when Stage 1 step 6a found the Shopify connector connected to **this** store. With the connector off, the gate is closed and nothing here applies.

Contents:
1. Theme access check (Stage 1 step 6a)
2. The `noibu:store-preview-qa` gate (Stage 1 step 6a)
3. Building the preview with the gate open (Stage 3)
4. Preview theme housekeeping (room check, reuse, delete)

## 1. Theme access check (Stage 1 step 6a)

Check the connector's theme access before relying on it. These are read-only checks: build each with the Shopify server's own GraphQL workflow (`graphql_schema` → `validate_graphql_codeblocks` → `graphql_query`); don't guess fields, and don't call any mutation here.

1. **Read and write access.** Query `currentAppInstallation { accessScopes { handle } }` and record whether `read_themes` and `write_themes` are present (`write_themes` implies read).
2. **`themeFilesUpsert` available.** Look the mutation up with `graphql_schema` and confirm the connector exposes it. Look up `themeDelete` the same way and record whether it's available (it decides how preview themes are cleaned up; see section 4).
3. **Result.** Connector **write** = matching shop + `write_themes` + `themeFilesUpsert` available. Connector **read-only** = matching shop with `read_themes` but missing either of the others. No theme scopes at all → treat as **off** for theme work.
4. Read-only isn't a blocker. Use the connector for reads (e.g. checksums) and fall through to the next preview method in Stage 1 step 6c. Tell the user once, in the Stage 1 step 6e setup question, what's missing (`write_themes` or `themeFilesUpsert`) and that the run will use another preview method.

## 2. The `noibu:store-preview-qa` gate (Stage 1 step 6a)

This skill calls `noibu:store-preview-qa` on Shopify stores only. Decide the gate from what's reachable without the repo, which may not be connected. The gate is **open** only when both hold:

- **a) The store runs on a Shopify Online Store theme.** The connector match already says it's a Shopify store; only "theme or headless?" is left. Use the first signal that settles it:
  1. The live storefront: `window.Shopify.shop` and `Shopify.theme` on the homepage, or `cdn.shopify.com` assets in its HTML (the finder's `candidates.json` `platform` already records this check). `Shopify.theme` present = Online Store theme; Shopify without it (a Hydrogen/Oxygen or custom front end) = headless, which has no theme to preview and counts as not Shopify here.
  2. Noibu's `siteType` from `noibu_get_domain`, and business context (`noibu_get_business_context`) when it names the platform.
  3. **Ask** when the signals disagree or none settles it. Put it in the Stage 1 `AskUserQuestion` call, not a message of its own: "Is <store> built on Shopify?" with options "Yes, a Shopify Online Store theme" · "Yes, but headless (Hydrogen or a custom front end)" · "No, another platform" · "Not sure". "Not sure", no answer, or an unattended run → treat as not Shopify.
- **b) The connector can write themes:** section 1 ended at connector **write**.

Anything else closes the gate: headless, or read-only. A closed gate is not an error; it only means Stage 3 uses the skill's own checks.

## 3. Building the preview with the gate open (Stage 3)

1. First run the room check (rule 2) and the reuse question (rule 3) in section 4.
2. Call `noibu:store-preview-qa` with the PR (or, in `theme` mode where no PR exists yet, the branch's changed files from the local commit), the theme name to use (`nb-ab …`) and, when reusing, the approved theme ID. This skill's housekeeping replaces `noibu:store-preview-qa`'s own naming and at-limit handling. Let it build the theme and run its checks.
3. Before every `themeFilesUpsert`, re-query the target theme and confirm its `role` is `UNPUBLISHED`, its name has the `nb-ab ` prefix, and its ID is the preview theme this run created or the user approved for reuse; otherwise don't write.
4. Shopify also requires a Shopify-granted exemption for `themeFilesUpsert` that step 6a can't see, so the first upload is the real test. If it returns `Access denied for themeFilesUpsert`, or the theme build fails on permissions: drop the connector to read-only (which closes the gate for the rest of the run), tell the user the connector lacks Shopify's theme-file exemption, and move to the next preview method in Stage 1 step 6c rather than stopping.
5. If a Shopify call here fails on authentication instead (the connection dropped or the token expired), that is not rule 4: follow `references/run-modes.md`, "When the pick needs a connector" (the Shopify mid-run drop): the connector card, then resume from the failed call once it is connected.

At the end of the run (Stage 5 step 5), ask about deleting the preview theme with rule 4.

## 4. Preview theme housekeeping

Shopify caps how many themes a store can hold, by plan (`platforms.md` has the numbers), and every preview theme uses a slot. These rules keep this skill from filling the store.

1. **Name every preview theme** `nb-ab <flag key> PR<number>` — or `nb-ab <flag key> draft<testId>` when the theme is built before a PR exists (`theme` mode); if a PR is opened later from that run, keep the theme and mention the PR number in the summary rather than rebuilding — shortened to fit Shopify's theme-name limit (`platforms.md`). A theme counts as "this skill's preview" only if its name starts with `nb-ab ` **and** its role is `UNPUBLISHED`. Never reuse, rename or delete any other theme, and never the live (`MAIN`) one.
2. **Room check, before creating a theme.** Query `themes` and count them. There are two limits:
   - **The store's plan limit (hard).** Plan from `get-shop-info`, limit from `platforms.md`. Shopify enforces it, so the skill can't go past it.
   - **This skill's own limit of 3 previews at once (soft).** It exists so A/B previews don't quietly take over a store's theme slots. It can be exceeded with the user's go-ahead, because a team testing several tests on one store will legitimately need more.

   If either limit is reached, list this skill's existing previews with each one's PR state (open / merged / closed), its test's Noibu status and its created date. Then ask with `AskUserQuestion`, with the reasons in the option descriptions:
   - **Create another preview anyway** (only when the store is under its plan limit; mark it "(Recommended)" when it is): QA runs on an exact copy of today's live theme and nothing gets deleted. Show the store count after creating it (e.g. `13/20`) and the skill's count (e.g. `4 A/B previews`). It uses one more slot, so cleanup matters more afterwards.
   - **Free a slot first:** pick one of the listed previews to delete, then go to rule 4's delete question for that exact theme. Best when one belongs to a merged or closed PR. Deleting a preview whose PR is still open removes that PR's QA preview, so say so in the description.
   - **Skip the theme preview:** use the next preview method in Stage 1 step 6c. Nothing on the store changes.

   If the store is at its plan limit and nothing gets freed (the user declines, or `themeDelete` isn't available), give the user the list with Shopify admin links to delete by hand, and meanwhile use the next preview method rather than stopping. Once the user approves going over the soft limit, don't ask again for the rest of the run.
3. **Ask before reusing a preview theme.** If a preview for this flag key already exists from an earlier run, ask with `AskUserQuestion` before using it. Put the reasons in the option descriptions:
   - **Reuse it:** saves a theme slot and keeps the preview link people may already have. But it was copied from the live theme on `<created date>`, and anything changed on the live theme since then won't be in it, so QA may not match production. If reused, re-upload every PR file and re-check checksums.
   - **Make a fresh one:** an exact copy of today's live theme, so QA matches production. It uses another slot (show `<used>/<cap>`), and the old preview stays until it's deleted (offer that next).
   Within one run, re-uploading fixes to the preview this run created or already approved needs no new question.
4. **Ask before deleting a preview theme**, whether it's the room check or end-of-run cleanup. Ask with `AskUserQuestion`, one option per choice, with the reasons in the descriptions:
   - **Delete it:** frees a slot (show `<used>/<cap>`). The preview isn't needed once the code is live and the test is Running. Deleting is permanent.
   - **Keep it:** useful to compare against the live site while the test runs, or if the test may be stopped, fixed and re-run. It stays unpublished, so shoppers never see it; it only costs a slot.
   Delete only with `themeDelete`, only after re-querying the theme right before the call and confirming the name prefix, the `UNPUBLISHED` role and the exact ID the user approved. If `themeDelete` isn't available or returns access denied (it needs the same Shopify exemption as uploads), give the user the Shopify admin link to delete it by hand.
