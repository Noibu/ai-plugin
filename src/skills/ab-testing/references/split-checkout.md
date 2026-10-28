# Split-checkout check (Stage 1 step 6)

Read this only when the picked test touches checkout: its `createInput.successMetric` is a checkout metric (`CHECKOUT_CONVERSION_RATE`, or `PAGE_VIEW_TO_URL_RATE` on the Checkout page group or a checkout URL), or its `surfaceTemplate` is `checkout`. (When the finder already recorded a split, it ships no checkout tests, so this mostly catches files from before that change and tests typed in by hand.)

1. **Detect.** Use the finder's `readiness.splitCheckout` from `candidates.json` when present. Otherwise list the company's domains (`noibu_list_domains` with the domain's `companyId`) and look for the store's own checkout host on another Noibu domain (`checkout.`, `secure.` or `pay.` on the same root domain), or business context saying checkout runs elsewhere.
2. **Not split** → carry on to Stage 2.
3. **If split, stop gracefully before creating anything.** Tell the user, in plain words: this test measures checkout, and checkout on this store runs on `<checkout host>`, which Noibu tracks as a separate site; sessions don't carry across, so the test couldn't count checkouts per version correctly. Say the skill is being improved to support split-domain stores in the near future.
4. Then ask with `AskUserQuestion`: one option per remaining test in `tests[]` that doesn't touch checkout (same card format as Stage 1 step 4), plus "Stop here for now". Nothing is created in Noibu or the repo until a non-checkout test is picked.
5. Unattended: stop at this point and leave that message as the run's report.
