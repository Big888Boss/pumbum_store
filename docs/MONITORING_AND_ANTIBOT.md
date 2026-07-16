# Monitoring and anti-bot plan

## What is implemented in V2 now

- `/api/health` returns service status, runtime, catalog totals and timestamp.
- `middleware.ts` adds app-level rate limiting for `/`, `/catalog`, product pages, `/search` and `/api`.
- Script-like clients are blocked on catalog/search/API paths by user-agent and browser-header heuristics.
- Bulk-catalog probe paths such as `/api/public/catalog`, `/api/catalog`, `/api/products` and `/content/generated/**` are blocked and penalized.
- Penalties are scoped by client class and violation type. A script probe from one IP must not poison a normal browser navigation from the same IP.
- Repeated limit violations create a short in-memory penalty window and return `429`/`403` with `Retry-After`.
- `/api/health` is allowed for monitoring with a separate higher limit.
- Search and filtered catalog pages are marked `noindex`, so accidental parameter pages do not pollute SEO.
- Yandex Metrika is enabled with `NEXT_PUBLIC_YANDEX_METRIKA_ID`. The external tag starts four seconds after `window.load`; pageviews and goals queue until initialization. The SPA integration sends one explicit `hit` for the initial URL and every client-side route change.
- Active business goals preserve the legacy identifiers: `search_submit`, `click_phone`, `click_email`, `view_product` and `click_order`.
- Search goal parameters include only the query length, category when selected, and UI location. The raw search text is not sent to Metrika.

Live V2 verification on `100.95.56.90:3020` after the July 4 anti-bot and UI hardening:

- Browser-like catalog request: `200`, `X-AntiBot-Policy: catalog`.
- `python-requests` catalog request: `403`, `X-AntiBot-Policy: script-client`, `Retry-After: 900`.
- `/api/public/catalog` probe: `404`, `X-AntiBot-Policy: bulk-catalog-probe`, `Retry-After: 900`.
- Browser-like catalog request immediately after a bulk probe: `200`. This verifies that scripted probes do not create a global IP block for normal visitors.
- `/api/health` from `curl`: `200`, `X-AntiBot-Policy: health`, `X-RateLimit-Limit: 240`.
- Mobile smoke pages `/`, `/catalog`, `/search?q=Valtec`: `200`, no `Too many requests`.

## Region analytics

Best practical option for Saratov/Engels analysis:

1. Enable Yandex Metrika only on the production domain after the domain switch, or use a separate staging counter before cutover.
2. Use reports by geography, traffic source, search phrase, device and landing page.
3. Keep the existing JavaScript goals for phone clicks, email clicks, product views, order/contact intent and search usage aligned with their identifiers in code.
4. Keep server logs for technical checks: status code, path, user agent, response time, IP prefix.

Do not request browser geolocation just for analytics. It is noisy for users, reduces trust and is not needed to understand region demand.

## Production anti-bot layers

The V2 middleware is only the first layer. Production should use several layers together:

1. Nginx or reverse-proxy rate limits per IP and per path.
2. Shared limiter storage if the app runs in more than one process/container.
3. Block or throttle obvious scraping user agents and datacenter IP bursts.
4. Return `429` with `Retry-After` instead of serving full catalog pages to scripts.
5. Keep normal users and search bots working: Yandex and Google must be allowed to index public product pages.
6. Alert when `/catalog`, `/search`, `/sitemap.xml` or product pages receive abnormal request bursts.

Absolute protection from copying public pages is impossible: a human can always open and save product data. The realistic goal is to make automated bulk scraping expensive and detectable without hurting buyers and search indexing.

## Metrics to watch

- Availability: `/api/health` status.
- Latency: p50/p95 response time for home, catalog, search, product page and API.
- Errors: 4xx/5xx by path.
- Search quality: queries with zero results, top queries, typo-like queries.
- Funnel: phone clicks, email clicks, contacts page views, route clicks and search usage.
- Bot pressure: 429 count, suspicious user agents, repeated IPs, high sitemap/catalog crawl rate.

## Server capacity guardrails

- Root filesystem: warning at `80%`, critical at `90%`; a deployment must not proceed at or above the warning threshold without first identifying reclaimable inactive data.
- Docker JSON logs: host fallback rotation at `50M`, three compressed archives, with `copytruncate` so containers are not restarted. Storefront compose files also cap new container logs at `20m` with three files.
- Never automate deletion of Docker volumes, active images, release backups, or product assets. Cleanup must target identified inactive images/build cache only and preserve a tested rollback.
- The host node exporter exposes filesystem and memory metrics on the Tailscale address. The central alert rule remains an external monitoring responsibility and must be verified separately.
- The dedicated pumbum Prometheus on the USA build host already runs Blackbox checks for `/`, `/api/health`, `/catalog` and `/sitemap.xml`. As of 2026-07-16 its Grafana has no alert rules and no approved Telegram receiver, so notification delivery is not considered verified.
- Runtime memory: inspect container usage, OOM state, restart count, host available memory, and swap after every release. Do not keep two Next.js storefront containers resident longer than the blue-green verification window on this host.
- `pumbum-store-warmup.timer` requests the heaviest category once per minute through the local HTTPS nginx endpoint with low CPU/I/O priority and a `32M` service memory cap. It keeps the catalog working set active without caching or reusing CSP nonces.

## Deployment checks

- `curl -i /api/health` returns `200`.
- `curl -I /catalog/<category>` includes `X-RateLimit-Limit`.
- `/search?q=random-gibberish` returns zero results.
- Yandex Metrika ID is empty on staging and set only for the approved production counter.
- `/cart`, `/api/cart` and `/api/leads` are disabled until order intake is approved.
- Monitoring dashboards/exporters are private or Tailscale-only.
