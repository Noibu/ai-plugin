# Stack trace classification — Generic / Headless / Custom

Use this file when the platform isn't Shopify, Magento, WooCommerce, or BigCommerce — or when the store runs a headless or custom frontend where platform-specific path patterns don't apply.

## Classification approach

Without reliable path patterns, classify by what you can identify:

### Known telemetry scripts (discard)
Non-actionable — discard silently:
- `connect.facebook.net/` — Meta Pixel
- `www.google-analytics.com/` — Google Analytics
- `static.ads-twitter.com/` — Twitter/X Pixel
- `analytics.tiktok.com/` — TikTok Pixel
- `snap.licdn.com/` — LinkedIn Insight Tag
- `sc-static.net/` — Snapchat Pixel
- `bat.bing.com/` — Microsoft/Bing Ads
- `cdn.heapanalytics.com/`, `heapanalytics.com/`, `heap-api.com/` — Heap (CDN + API endpoints)
- `js.posthog.com/` — PostHog
- `cdn.segment.com/` — Segment
- `cdn.amplitude.com/` — Amplitude

### Known vendor scripts (share with vendor)
Regardless of platform, these are always third-party and not fixable by the merchant:
- `static.klaviyo.com/` — Klaviyo
- `googletagmanager.com/` — Google Tag Manager
- `cdn.shopify.com/shopifycloud/` — Shopify platform (even in headless)
- Any recognisable marketing, reviews, support, or payments CDN

### ERR_TYPE as primary classifier
When stack trace origin is unclear:
- **JS error types** (TypeError, ReferenceError, RangeError, etc.) — likely code-level, treat as fixable candidate
- **HTTP error types** (any 4XX or 5XX) with no JS stack trace — infrastructure or platform, classify as Platform and discard

### Frames on the store's own domain
If a frame points to the store's own domain or a CDN that clearly serves the merchant's app (e.g. Vercel deployment URLs for a known merchant project), treat as merchant code and fixable.

### When uncertain
If you can't confidently classify an error, surface it as a fixable candidate but note in the card description that the origin is unclear and the fix may require developer investigation.

## Editing this file
Add platform-specific patterns here as you identify them. This file is meant to be extended.
