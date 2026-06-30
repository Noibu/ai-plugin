# Stack trace classification — BigCommerce

## Merchant code (fixable)
- Store theme assets served from the store's own domain or BigCommerce CDN under the merchant's store path
- Stencil theme JS files — typically at paths like `/assets/js/` or `/theme/`
- Custom scripts added via Script Manager that reference the store domain

## Platform code (not fixable by merchant)
- `cdn11.bigcommerce.com/` — BigCommerce platform CDN (core scripts, checkout)
- `login.bigcommerce.com/` — authentication infrastructure
- BigCommerce checkout scripts (not editable on standard plans)

## Vendor code (share with vendor)
- External scripts added via Script Manager from third-party domains
- Any CDN not matching BigCommerce or the store domain

## Telemetry (discard)
Analytics, pixel, and beacon scripts — non-actionable, discard silently:
- `connect.facebook.net/` — Meta Pixel
- `www.google-analytics.com/` — Google Analytics
- `cdn.heapanalytics.com/` — Heap
- `js.posthog.com/` — PostHog
- `snap.licdn.com/` — LinkedIn Insight Tag
- `sc-static.net/` — Snapchat Pixel
- `bat.bing.com/` — Microsoft/Bing Ads
- `cdn.segment.com/` — Segment
- `cdn.amplitude.com/` — Amplitude
- `analytics.tiktok.com/` — TikTok Pixel

## HTTP errors without JS stack traces
Any 4XX or 5XX error with no JavaScript stack trace is classified as Platform and discarded. On BigCommerce this is typically DDoS protection (403), API rate limits (429), or missing assets (404).
