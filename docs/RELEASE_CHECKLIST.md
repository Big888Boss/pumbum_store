# Release Checklist

## Before staging

- `LEGACY_CATALOG_SOURCE=<path> LEGACY_CATALOG_GENERATED_AT=<iso> npm run catalog:import-legacy` when source data changes
- `npm run catalog:import-espa` when the normalized ESPA source changes
- `npm run catalog:validate-espa`
- `npm run lint`
- `npm run analytics:check`
- `npm run check:isolation`
- `npm audit --audit-level=moderate`
- `npm run build`
- Production Docker builds pass `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_ENV=production` and `NEXT_PUBLIC_YANDEX_METRIKA_ID=109783471` as build arguments; runtime environment variables alone are not sufficient for `NEXT_PUBLIC_*` values.
- `npm run seo:inventory` with legacy source path
- `SEO_CRAWL_BASE_URL=<local-or-staging-url> npm run seo:crawl`
- `/robots.txt` returns staging-safe policy
- `/sitemap.xml` does not contain Tailscale IP
- Product JSON-LD has no fake offers
- Generated legacy Product JSON-LD has `Product` but no `Offer` until price and availability are confirmed
- `/search?q=<known-sku>` returns expected product
- `/contacts?category=<category>&sku=<slug>` shows selected product context
- `/cart` redirects to contacts or another approved non-order page
- `/api/cart` and `/api/leads` are disabled until order intake is explicitly approved
- Contact paths are visible and usable: phone, email, address, working hours, map
- `/images/products/**` legacy runtime assets are mounted/synchronized for V2 and product pages do not render generated placeholder art
- `/api/health` returns `200` and current catalog totals
- `/catalog/<category>` includes rate-limit headers
- `/search?q=random-gibberish` returns zero results

## Before production switch

- Confirm `NEXT_PUBLIC_SITE_URL=https://477477.ru`
- Confirm `NEXT_PUBLIC_SITE_ENV=production`
- Confirm `NEXT_PUBLIC_YANDEX_METRIKA_ID` uses the approved production counter
- Confirm the existing Metrika JavaScript goals `search_submit`, `click_phone`, `click_email`, `view_product` and `click_order` remain configured on counter `109783471`.
- Run `METRIKA_TEST_BASE_URL=<staging-url> npm run analytics:check-browser` with Yandex requests intercepted; require one initial `hit`, one `hit` per SPA route change, all five goals, and no raw search query in goal parameters.
- Confirm order intake is still disabled, or document the approved CRM/webhook owner before enabling it
- Run PageSpeed/Lighthouse on HTTPS URL
- Validate Rich Results / Schema Markup
- Run crawl against sitemap
- Verify contacts, delivery, about, privacy
- Verify contact flow
- Verify disabled cart/API behavior if order intake is still out of scope
- Verify headers: HSTS, CSP plan, nosniff, referrer policy, permissions policy
- Run `CSP_BASE_URL=https://477477.ru npm run security:check-csp`; require one enforcing CSP header, rotating nonces, no `unsafe-inline`/`unsafe-eval`, and a `204` report endpoint.
- Run `CATEGORY_TEST_BASE_URL=https://477477.ru npm run catalog:check-pagination`; require every product in the tested heavy category to appear exactly once, `60` rows in list view, and `noindex,follow` on paginated pages.
- Run `CATEGORY_TAXONOMY_BASE_URL=https://477477.ru npm run catalog:check-taxonomy`; require 9,276 products, 10 categories, 9,293 sitemap URLs, the representative products and permanent legacy redirects.
- Run `CATEGORY_TAXONOMY_BASE_URL=https://477477.ru npm run catalog:check-legacy-purpose-redirects`; require all 9,276 former product paths to be either unchanged or covered by one unambiguous permanent redirect.
- For the heaviest category, require a warm public p95 below `2s`, no response above `3s` in the standard sequential check, and no OOM/restart under the staging concurrency check.
- Confirm the storefront publishes only on `127.0.0.1`, the container has no OOM/restarts, root disk usage is below `80%`, and at least one tested rollback image remains.
- Confirm `/etc/logrotate.d/docker-containers` is installed and Docker JSON logs are bounded.
- Confirm rollback to legacy

## After production switch

- Submit sitemap to Google Search Console
- Submit sitemap to Yandex Webmaster
- Inspect 5-10 URLs
- Check logs for 404/500
- Check `/api/health`, latency, 429 spikes and suspicious user agents
- Confirm `pumbum-store-warmup.timer` is active and its recent service runs complete successfully.
- Check Yandex Metrika geography and goal events
- Verify one real production pageview and each applicable goal in Metrika diagnostics without creating duplicate hits.
- Start weekly SEO crew review

## Commit and push gate

- Commit and push only after the active public release passes the complete after-switch checklist.
- Before pushing, confirm `/api/health`, catalog totals, sitemap totals, representative product images, nginx syntax, container health, restart/OOM state and recent `5xx` logs.
- If a production check is red, keep the release unpushed or roll back; do not publish a commit that is described as deployed and accepted.
