# Storefront QA checklist (this skill's own checks)

Read this when the `noibu:store-preview-qa` gate is closed (Stage 3 step 3), or when QA was deferred to production because no preview was possible (Stage 5 step 2). With the gate open, `noibu:store-preview-qa` runs these checks instead.

Check the test's `surface` pages (URLs in the run-level `surfaces`) first. Use only what any storefront has, so it works on every platform:

- **Add to cart** through the real button, then the cart count and cart page.
- **Product options** through the real inputs, comparing the shown price and image with the page's own product data (structured data or the page's product JSON).
- **Key page loads:** failed requests, JS errors, broken images, horizontal overflow.
- **On-screen error messages.**
- **The change itself:** B and the control, on mobile (built-in browser, `resize_window` preset `mobile`) and on desktop (Claude in Chrome, full-size window; the built-in browser at the probed desktop width only when Chrome isn't connected).

Use Shopify storefront endpoints (`/cart.js`, `/products/<handle>.js`) only when the store is Shopify.

Never type into payment fields or place an order; remove only the cart lines you added.
