# Sessions analytics

Read this reference when the user asks session-level questions: conversion rate, revenue, AOV, traffic sources, bounce rate, products viewed/purchased, search behaviour, discount usage, time-series trends.

## noibu_search_sessions

Session-level analytics. One row per session. `orderBy` is REQUIRED at the `input` level. Use for:

- Traffic analysis: sessions by UTM source/medium/campaign, referring URL, landing/exit URL
- Conversion analysis: checkout completion rates, cart event counts, payment submissions
- Revenue: order values (subtotal, shipping, tax, discounts), cart values, discount code usage
- Product performance: which products were viewed, added to cart, removed, purchased
  (by SKU, title, type, vendor, variant)
- Collection and search behavior: collection views, search queries, search counts
- Customer behavior: bounce rate, session duration, page view count
- Journey reconstruction: `PAGE_VISIT_URLS` collection (time-ordered, duplicates preserved —
  use for "show the user's navigation path"). Different from `VISITED_URLS` (deduped).
- CTA / click analysis: `CLICKED_TEXT` collection (actual button/link text users clicked —
  best signal for CTA effectiveness, friction detection, rage-click patterns).
- Custom attributes: `CUSTOM_ATTRIBUTE_NAMES` / `CUSTOM_ATTRIBUTE_VALUES` /
  `CUSTOM_ATTRIBUTE_TUPLES` collections for customer-specific tags.
- Segmentation by: browser, OS, device type, country, region, UTM params, checkout status,
  discount usage, cart currency

## noibu_get_session_trends

Same data as QuerySessions but bucketed over time. Use when the user asks about trends, changes, or "how has X changed over Y period." Resolution options: MINUTE, HOUR, DAY, WEEK. Pick by range: last 24h → HOUR, last 7d → DAY, last 90d → WEEK.

## Conversion & Revenue Analysis

For conversion analysis, use the concrete event fields:

- CHECKOUT_COMPLETED (boolean): did the session complete a purchase?
- ADDED_TO_CART_COUNT: how many add-to-cart events occurred
- CHECKOUT_STARTED_COUNT: how many times checkout was initiated
- PAYMENT_INFO_SUBMITTED_COUNT: how many payment submissions
- CHECKOUT_COMPLETE_COUNT: completed checkouts (count, not boolean)

For revenue:

- CHECKOUT_COMPLETE_TOTAL_VALUE: final order value (includes tax, discounts)
- CHECKOUT_COMPLETE_SUBTOTAL_VALUE: order value before shipping/tax
- CHECKOUT_COMPLETE_SHIPPING_VALUE, \_TAX_VALUE, \_DISCOUNT_VALUE: breakdowns
- Prefer CHECKOUT*COMPLETE*_ over CHECKOUT*START*_ for accurate totals
- ADDED_TO_CART_TOTAL_VALUE: total value of items added to cart
- MAX_CART_VALUE: peak cart value during session

For computed metrics, use measures with the DIVIDE operator:

- Checkout rate = COUNT(CHECKOUT_COMPLETED=true) / COUNT(SESSION_ID)
- Average order value = SUM(CHECKOUT_COMPLETE_TOTAL_VALUE) / COUNT(CHECKOUT_COMPLETED=true)

Prefer MEDIAN over AVG for monetary values (robust to outliers).
