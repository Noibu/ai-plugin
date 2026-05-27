# Block: paid-performance

A per-platform table showing Noibu's UTM-attributed traffic, conversions, and revenue per paid ad channel — Google Ads, Facebook, and Instagram.

## What it shows

| Column | Format | Source |
|---|---|---|
| Paid Ad Platform | String | Platform name |
| Sessions | Integer | Noibu sessions tagged to the platform via UTM |
| Conversions | Integer | Noibu sessions where `CHECKOUT_COMPLETED = true` AND tagged to the platform |
| Revenue | Currency | Sum of `CHECKOUT_COMPLETE_TOTAL_VALUE` for those converted sessions |

The block always renders **three rows** — one for each platform — regardless of whether tagged traffic exists. Rows with no tagged traffic show zeros; don't suppress them, because operators want to know when a paid channel isn't driving traffic.

## Data source

Noibu only — last-touch attribution via UTM, matched to actual orders in the merchant's checkout.

## MCP calls

One Noibu query per platform, filtered by that platform's UTM source patterns:

```json
{
  "queryInput": {
    "measures": [
      { "aggregate": { "measureAlias": "sessions", "measureFunc": "COUNT", "target": { "field": "SESSION_ID" } } },
      {
        "aggregate": {
          "measureAlias": "conversions",
          "measureFunc": "COUNT",
          "target": { "field": "SESSION_ID" },
          "filters": [{ "fieldName": "CHECKOUT_COMPLETED", "operator": "EQUALS", "comparisonValues": ["true"] }]
        }
      },
      {
        "aggregate": {
          "measureAlias": "revenue",
          "measureFunc": "SUM",
          "target": { "field": "CHECKOUT_COMPLETE_TOTAL_VALUE" }
        }
      }
    ],
    "filters": [
      { "fieldFilter": { "fieldName": "UTM_SOURCE", "operator": "IS_ANY_OF", "comparisonValues": ["<platform_utm_sources>"] } }
    ],
    "orderBy": { "measureAlias": "sessions", "direction": "DESCENDING" }
  }
}
```

Per-platform UTM source patterns:

- Google Ads: `["google", "googleads"]`
- Facebook: `["fb", "facebook", "meta"]`
- Instagram: `["ig", "instagram"]`

## Methodology tooltips

- **Conversions** (column header) → "Last-touch attributed via UTM and matched to your store's order data. Will diverge from each ad platform's native conversion count due to attribution-window differences."

## Polarity

Sessions, Conversions, and Revenue are all higher-is-better.

## Important attribution note

Numbers here come from Noibu's own attribution (last-touch via UTM, matched to actual orders). These diverge from each ad platform's native reporting because:

1. Ad platforms use post-impression and view-through attribution windows (sometimes 7+ days) that Noibu doesn't.
2. Ad platforms count modeled conversions, not just observed ones.
3. UTM tracking is imperfect (lost params, custom domains, etc.).

This is why the methodology tooltip on Conversions matters — operators comparing Store Pulse to their ad-platform dashboards will see different figures and need to know why.

## Empty state

If a platform has zero UTM-tagged traffic in the window, show its row with `0` / `0` / `$0`. Don't suppress the row.
