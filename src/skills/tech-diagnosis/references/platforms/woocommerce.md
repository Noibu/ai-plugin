# Stack trace classification — WooCommerce / WordPress

## Merchant code (fixable)
- `/wp-content/themes/[active-theme]/` — merchant's active theme
- `/wp-content/themes/[child-theme]/` — child theme overrides
- Custom plugins built for this store in `/wp-content/plugins/[custom-plugin]/`

## Platform code (not fixable by merchant)
- `/wp-includes/` — WordPress core
- `/wp-content/plugins/woocommerce/` — WooCommerce core
- `/wp-admin/` — admin scripts

## Vendor code (share with vendor)
- `/wp-content/plugins/[third-party-plugin]/` — third-party plugins (Klaviyo for WooCommerce, etc.)
- External CDN scripts not matching the store domain

## Note on plugin vs theme errors
Errors in `/wp-content/plugins/` may be fixable if it's a merchant-owned or agency-built plugin, or vendor issues if it's a purchased/free third-party plugin. Use the plugin name to determine ownership — merchant-built plugins are usually named after the store or agency.

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
Any 4XX or 5XX error with no JavaScript stack trace is classified as Platform and discarded. On WooCommerce this is typically access control (403), rate limiting (429), or security plugin blocks (Wordfence, etc.).
