# Stack trace classification — Shopify

## Merchant code (fixable)
Stack frames from these paths point to code the merchant owns and can edit:
- `cdn.shopify.com/s/files/` — theme assets (JS, CSS, images) served via Shopify CDN
- `cdn.shopify.com/s/trekkie/` — theme analytics snippets
- Store's own domain (e.g. `store.myshopify.com` or custom domain) for any inline scripts

## Platform code (discard — Shopify core infrastructure only)
Errors originating here are non-actionable — no merchant or app vendor can fix them:
- `cdn.shopify.com/shopifycloud/` — Shopify platform scripts
- `cdn.shopify.com/s/shopifycloud/` — same
- `checkout.shopify.com/` — Shopify checkout
- `monorail-edge.shopifysvc.com/` — Shopify analytics infrastructure
- `*.shopifysvc.com/` — internal Shopify service endpoints

## Vendor code (share with vendor)
Anything with its own support channel that isn't merchant-owned or telemetry — including Shopify-built products that operate independently of core infrastructure:
- `*.shopifyapps.com/` — Shopify app platform endpoints (each app has its own support)
- `shop.app/` — Shop app (separate Shopify product with its own support)
- `pay.shopify.com/` — Shop Pay (separate product)
- `static.klaviyo.com/`, `static-tracking.klaviyo.com/` — Klaviyo
- `heyethos.com/` — Hey Ethos (loyalty)
- `yotpo.com/`, `loox.io/` — reviews apps
- Any third-party CDN not matching the store domain or Shopify core infrastructure above

## Headless / custom frontend note
If this Shopify store runs a headless frontend (Next.js, Remix, Hydrogen, etc.), theme asset paths won't match the patterns above. Merchant code will be on the store's own CDN (Vercel, AWS CloudFront, etc.). In this case, classify by vendor script identification and ERR_TYPE — see `references/platforms/generic.md`.

## Telemetry (discard)
Analytics, pixel, and beacon scripts — non-actionable, discard silently:
- `connect.facebook.net/` — Meta Pixel
- `www.google-analytics.com/` — Google Analytics
- `cdn.heapanalytics.com/`, `heapanalytics.com/`, `heap-api.com/` — Heap (CDN + API endpoints)
- `js.posthog.com/` — PostHog
- `snap.licdn.com/` — LinkedIn Insight Tag
- `sc-static.net/` — Snapchat Pixel
- `bat.bing.com/` — Microsoft/Bing Ads
- `cdn.segment.com/` — Segment
- `cdn.amplitude.com/` — Amplitude
- `analytics.tiktok.com/` — TikTok Pixel
- `cdn.shopify.com/shopifycloud/analytics-next/` — Shopify analytics beacon

## HTTP errors without JS stack traces
Any 4XX or 5XX error with no JavaScript stack trace is classified as Platform and discarded — not fixable by merchant code. On Shopify this is most commonly bot/abuse protection (403, 429) or missing assets (404).
