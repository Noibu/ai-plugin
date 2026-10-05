# Storefront platforms: where surfaces live, how a flag script loads, how to prove code is live

Home: this file lives in the opportunity finder
(`ab-test-opportunity-finder/references/shared/platforms.md`), which owns
it; other A/B skills cite it by that path (inside a plugin,
`../ab-test-opportunity-finder/references/shared/platforms.md`). It
complements the platform files `tech-diagnosis` and `accessibility-audit`
keep (those classify errors and locate accessibility fixes; this one
locates test surfaces and deployment proof). Identify the platform from
the code tree when one is connected (the tree is the truth about what the
developer edits) and from `noibu_get_domain`'s `siteType` or the
walkthrough's `read_home.platform` otherwise.

Three questions per platform, because three different skills ask them: the
skill that writes variation code asks where a surface is rendered; a
preview or QA skill asks how to see a change before it ships; an
orchestrator asks how to prove the change is live before a test starts.

| Platform | Where the surfaces usually live | How to see a change before it ships | How to prove the code is live |
| --- | --- | --- | --- |
| Shopify (Online Store 2.0) | `sections/main-product.liquid` (PDP), `sections/main-cart-items.liquid` or a cart drawer snippet (cart), `sections/header.liquid` + `announcement-bar.liquid` (bar), `sections/main-collection-product-grid.liquid` (collection); CSS in `assets/`; JS in `assets/*.js`; sections placed via `templates/*.json` or section-group JSON | An unpublished preview theme: duplicate MAIN, upload only the changed files, open `https://<domain>/?preview_theme_id=<id>`; Shopify caps a store at 20 themes and the API cannot delete them | Admin API `theme.files` `checksumMd5` on the MAIN theme matches the merged files; themes deployed from GitHub can lag a minute; then fetch the served asset and look for the flag key |
| Shopify (Hydrogen / headless) | `app/routes/products.$handle.tsx`, `app/components/Cart*.tsx`, `app/components/Header.tsx` | The host's preview deployment (Oxygen or the hosting provider's per-branch URL) | Fetch the production bundle and look for the flag key; the hosting provider's deployment status for the commit |
| Salesforce Commerce Cloud | `cartridges/<app>/cartridge/templates/default/product/productDetails.isml`, `cart/cart.isml`, `components/header/*.isml`; client JS under `cartridge/client/default/js/` | A staging or development instance URL the merchant provides | Code version activated on production matches the commit; fetch the served static asset and look for the flag key |
| Magento 2 | `app/design/frontend/<Vendor>/<theme>/Magento_Catalog/templates/product/view/*.phtml`, `Magento_Checkout/templates/cart/*.phtml`, layout XML under `Magento_Theme/layout/` | A staging environment URL the merchant provides | Deployed static content (`pub/static/.../<theme>/`) contains the flag script; fetch it from production and look for the flag key |
| BigCommerce Stencil | `templates/pages/product.html`, `templates/components/products/*.html`, `templates/components/cart/*.html` | A theme preview via the Stencil CLI or an inactive theme copy in the control panel | The active theme's bundle contains the flag script; fetch the served asset and look for the flag key |
| WooCommerce | The child theme's `woocommerce/single-product/*.php`, `woocommerce/cart/*.php`, `header.php`; enqueued JS under the child theme's `assets/` | A staging site from the host | The enqueued script URL on production serves the flag key |
| Custom / other | grep the tree first for the recorded selectors and copy; ask the user for the file only if grep finds nothing | A staging or preview URL the merchant provides | Fetch the served asset and look for the flag key; when no served asset can be fetched, a human attests that the deploy is live, and the test is not started on an assumption |

How the flag script loads: on every platform the SDK pattern is the same
(`references/shared/noibu-feature-flag-sdk.md`); what differs is where the
helper is enqueued so it runs before first paint for above-the-fold
changes (Shopify: `layout/theme.liquid` head or the top of the theme's main
script; SFCC: the `htmlHead` hook; Magento: a `requirejs-config.js` or
layout XML head script; BigCommerce: `templates/layout/base.html`;
WooCommerce: `wp_enqueue_script` with a head placement).

Proof of life is the property that matters: a test started before its
code is live buckets visitors into a variation they cannot see
(`querying-noibu-data/references/ab-tests.md`, "assigned without
rendering"). Shopify is the only platform where a skill can verify this
mechanically through an API it can reach; everywhere else the column above
describes the fetch to make and, failing that, the human attestation to
collect in place of a checksum.
