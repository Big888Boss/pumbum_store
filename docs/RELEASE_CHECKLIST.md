# Release Checklist

## Before staging

- `LEGACY_CATALOG_SOURCE=<path> LEGACY_CATALOG_GENERATED_AT=<iso> npm run catalog:import-legacy` when source data changes
- `npm run lint`
- `npm run check:isolation`
- `npm audit --audit-level=moderate`
- `npm run build`
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
- Configure Metrika goals for phone click, email click, contacts view, map/route click and search usage
- Confirm order intake is still disabled, or document the approved CRM/webhook owner before enabling it
- Run PageSpeed/Lighthouse on HTTPS URL
- Validate Rich Results / Schema Markup
- Run crawl against sitemap
- Verify contacts, delivery, about, privacy
- Verify contact flow
- Verify disabled cart/API behavior if order intake is still out of scope
- Verify headers: HSTS, CSP plan, nosniff, referrer policy, permissions policy
- Confirm rollback to legacy

## After production switch

- Submit sitemap to Google Search Console
- Submit sitemap to Yandex Webmaster
- Inspect 5-10 URLs
- Check logs for 404/500
- Check `/api/health`, latency, 429 spikes and suspicious user agents
- Check Yandex Metrika geography and goal events
- Start weekly SEO crew review
