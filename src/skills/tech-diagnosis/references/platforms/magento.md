# Stack trace classification — Magento / Adobe Commerce

## Merchant code (fixable)
- `pub/static/frontend/[Vendor]/[ThemeName]/` — merchant's custom theme
- `app/design/frontend/[Vendor]/[ThemeName]/` — theme source files
- Custom modules in `app/code/[Vendor]/` — merchant or agency-built modules

## Platform code (not fixable by merchant)
- `pub/static/frontend/Magento/` — Magento core frontend modules
- `lib/web/` — Magento core JS libraries
- `pub/static/adminhtml/` — admin panel code
- `vendor/magento/` — Magento core (Composer-installed)

## Vendor code (share with vendor)
- `vendor/[ThirdParty]/` — third-party extensions installed via Composer
- Any external CDN scripts not matching the store domain

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
- `omtrdc.net/` — Adobe Analytics (common on Adobe Commerce)
- `demdex.net/` — Adobe Audience Manager

## HTTP errors without JS stack traces
Any 4XX or 5XX error with no JavaScript stack trace is classified as Platform and discarded. On Magento this is typically access control (403), rate limiting (429), or missing static assets (404).
