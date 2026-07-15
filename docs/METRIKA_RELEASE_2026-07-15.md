# Yandex Metrika release 2026-07-15

Scope: production counter `109783471` on `https://477477.ru`. The release restores the useful legacy business goals on the current Next.js storefront and fixes SPA route accounting without changing the catalog, order availability, CSP policy or infrastructure exposure.

## Pageviews

- Metrika initializes with `defer: true`, so it does not emit an automatic pageview.
- `MetrikaRouteTracker` sends one explicit `hit` for the initial URL and one for each changed pathname or query string.
- The last URL is retained as the next virtual pageview referer.
- Duplicate effects for the same absolute URL are ignored.
- Commands created before Metrika initialization are held in a bounded 50-command queue, validated and flushed only after `init`.
- The fixed bootstrap is server-rendered with the request CSP nonce. It is not inserted later by `next/script`, so strict CSP can remain enforced without `unsafe-inline`.

## Goals

The release preserves identifiers from the legacy storefront so existing counter goals continue their history:

| Goal | Current action | Parameters |
| --- | --- | --- |
| `search_submit` | Submit search from `/catalog` or `/search` | UI location, query length, optional category |
| `click_phone` | Click a visible `tel:` action in header, home or contacts | UI location |
| `click_email` | Click a visible `mailto:` action on contacts | UI location |
| `view_product` | View a product page after its pageview is queued | SKU, category, brand, availability, price status |
| `click_order` | Click a product-specific price or availability request | Product fields and UI location |

The raw search query is intentionally excluded from third-party analytics parameters. The legacy cart goals `add_to_cart`, `clear_cart` and `begin_checkout` are not emitted because the current storefront has no approved cart or order-intake flow.

## Verification

- `npm run analytics:check` validates the source contract and active goal map.
- `METRIKA_TEST_BASE_URL=<staging-url> npm run analytics:check-browser` intercepts all `mc.yandex.ru` and `mc.yandex.com` requests, injects a local `ym` recorder and verifies pageviews and goals without polluting production statistics.
- Production acceptance must additionally confirm the real `watch/109783471` pageview request, strict CSP, current catalog totals, no OOM/restarts and no new 5xx responses.

## Production deployment

- Current deployed image: `plumbing_store_v2-v2:seo-mobile-20260715-v6`.
- Current active container: `plumbing_store_v2_seo_mobile_20260715-v2-seo-mobile-1` on `127.0.0.1:3015`.
- Nginx upstream: primary `127.0.0.1:3015`, live rollback backup `127.0.0.1:3014`.
- The previous Metrika container `plumbing_store_v2_metrika_20260715-v2-metrika-1` remains running on `3014` during the rollback window.
- Current Nginx backup: `/etc/nginx/backups/plumbing_store.conf.backup-20260715-seo-mobile`.

Production acceptance on 2026-07-15 confirmed:

- health reports 9,276 published products and no catalog reduction;
- a real `watch/109783471` request is sent for the initial page and one request is sent for the SPA transition from `/` to `/catalog` with the previous URL as referer;
- all five goal identifiers pass the browser contract against the production DOM while Yandex requests are intercepted;
- the raw search query is not included in analytics parameters;
- CSP is enforced, the nonce rotates, there are no inline styles and the report endpoint returns `204`;
- the active container has zero restarts and was not OOM-killed;
- the heavy category returned `200` ten times, usually in 0.18-0.34 seconds with a 1.05-second maximum;
- no HTTP 5xx responses were present in the site access log.
- the same browser contract passed again through the public `https://477477.ru` endpoint after the SEO/mobile cutover;
- strict production CSP accepted the server-rendered nonce bootstrap without `unsafe-inline` or `unsafe-eval`.

## Rollback

Rollback does not require a rebuild. Restore `/etc/nginx/backups/plumbing_store.conf.backup-20260715-seo-mobile`, validate with `nginx -t`, reload Nginx and verify public health on the retained Metrika service at `3014`. Do not remove either active release image until the rollback window is closed.
