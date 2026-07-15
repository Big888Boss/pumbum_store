# Production deployment plan

Historical plan from the initial V2 cutover. For the current `9276`-product production state, use `AUDIT_2026-07-10.md` and `AUDIT_CSP_2026-07-11.md`; do not execute the old `5700`-product steps below.

Date: 2026-07-04

Scope: V2 storefront for `477477.ru`. The legacy production server was inspected read-only. Do not treat this document as permission to change production.

## Current production facts

- Server: `dev477477@100.66.106.32`, host `vm2602164819`, Ubuntu 24.04.
- Legacy project: `/opt/plumbing_store`.
- Public domain currently uses bare canonical URL: `https://477477.ru`; `www.477477.ru` redirects to it.
- Active app: legacy Docker service `plumbing_store_legacy-legacy-1`, bound to `127.0.0.1:3000`.
- Nginx is public on `80/443`; it proxies `477477.ru` to `127.0.0.1:3000`.
- TLS is real LetsEncrypt on current nginx, not the self-signed config from repo docs.
- Yandex Metrika is present on production: counter `109783471`.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.txt` are present.
- Legacy cart is not CRM: cart is browser-local and sends to Telegram `PaulBoss888` or email `Virado@bk.ru`.
- No separate CRM service was found in the inspected runtime.
- Server monitoring already has node exporter, nginx exporter and promtail on Tailscale-bound ports.
- Important security note: the same server/domain also exposes extra contours, including `:8443` OpenWebUI proxy and a VLESS nginx location on the main `477477.ru` nginx server. V2 deployment must not inherit this mixing blindly.
- Host resources are small: about 1 GB RAM and 20 GB disk. Do not add heavy monitoring/storage on this server without sizing.

## V2 release target

- Public storefront only: catalog, search, manufacturers, product pages, company pages, contacts.
- No public cart and no lead/order API in the first production cut.
- Buyer action is contact-first: phone, email, address, map.
- Admin panel is out of scope for this cut.
- Product images are served from normalized assets plus manifest; old image archive stays non-public.

## Current V2 staging facts

- Staging server: `administrator@100.95.56.90`.
- V2 compose binds the app to Tailscale only: `100.95.56.90:3020 -> 3010/tcp`.
- Runtime health on staging reports 5700 products and 6 categories.
- `.asset-store` is outside `public/` and is not directly served by Next.js.
- No `.env` file is present in the inspected V2 source directory; production secrets must still be provided through a controlled deploy env, not committed files.
- Cart/order intake remains disabled: `/cart` redirects to `/contacts`; `POST /api/cart` and `POST /api/leads` return `410`.
- Desktop and mobile smoke tests pass for home, catalog, search and representative category pages.

## Deployment sequence

1. Finish V2 data gates: prices, images, category/manufacturer sections, search, mobile, contacts.
2. Run V2 checks: `npm run lint`, `npm run build`, `npm run check:isolation`, image 404 check, sitemap crawl.
3. Freeze public SEO shape: canonical, robots, sitemap, product JSON-LD, LocalBusiness JSON-LD.
4. Prepare production compose/nginx files for V2 without touching legacy yet.
5. Configure monitoring and Metrika on staging/pre-prod first, then production counter on the final domain.
6. Run a pre-cutover smoke test through nginx on a temporary domain or hosts-file override.
7. Cut over `477477.ru` to V2 with a rollback path to legacy.
8. Immediately after cutover: check health, logs, 404/500, 429 spikes, Metrika hits, sitemap, 5-10 important product pages.

## Security baseline for V2

- Public ports: only `80/443` for storefront. Keep app containers on `127.0.0.1` or private Docker network.
- Do not expose databases, admin panels, Grafana, Prometheus, exporters, asset store, backups or raw catalog dumps publicly.
- Keep `.env`, supplier source files, `.asset-store`, reports and old photos outside public web root.
- Nginx should enforce HTTPS, HSTS, `nosniff`, `frame-ancestors` or `X-Frame-Options`, referrer policy and compression.
- Add nginx rate limits for catalog/search/product/API paths before traffic reaches Next.js.
- Keep the V2 app anti-bot middleware enabled as the second layer.
- Keep app-level anti-bot penalties scoped by client class and violation type, so automated probes are blocked without globally blocking normal browser traffic from the same IP.
- Keep Yandex/Google indexing working; do not block real search bots from public pages.
- Log bot pressure: 403/429 by path, user-agent, IP prefix and response time.
- Use least privilege for containers where practical. Do not run public app with write access to source code.
- Backups must cover only needed runtime data and asset manifests. Do not back up secrets into public folders.

## Anti-bot model

The current V2 anti-bot is an app-level protection layer:

- normal browser navigation gets normal pages with rate-limit headers;
- script-like clients on catalog/search/product/API paths receive `403`;
- bulk catalog probe paths like `/api/public/catalog`, `/api/catalog`, `/api/products`, `/content/generated/**` are blocked;
- repeated violations get a temporary scoped penalty window and `Retry-After`;
- `/api/health` stays available for monitoring.

This does not make public product data impossible to copy by hand. It makes automated bulk scraping expensive, noisy and blockable. Production should add nginx/WAF limits above it.

## Metrics and analytics

Yandex Metrika should be added when V2 is running under the real production domain or a separate staging counter. Do not reuse the production counter on hidden staging unless the traffic must be mixed.

Production goals:

- phone click;
- email click;
- contacts page view;
- map click/route click;
- search usage;
- zero-result search;
- product page view.

Region tracking is handled by Metrika geography reports. It can show Saratov, Engels and oblast-level traffic by IP/device data. Do not request browser geolocation for this.

Technical monitoring:

- `/api/health` uptime and response time;
- nginx 5xx/4xx/429 counts;
- page p95 latency;
- CPU, RAM, disk, container restarts;
- image 404s;
- sitemap availability;
- alerts to Telegram/email for down, high 5xx, disk pressure and abnormal bot spikes.

For this small server, start with the existing exporter style plus Grafana/Prometheus on a private Tailscale-only monitoring host. If monitoring is placed on the same host, keep retention short.

## SEO and Yandex visibility

Yandex ranking starts from normal technical indexing, not from `llms.txt`.

Required before cutover:

- `robots.txt` allows public pages and blocks only admin/API/private areas.
- `sitemap.xml` contains final `https://477477.ru/...` URLs.
- Canonical URLs use the same host as nginx redirects.
- Product pages return server-rendered HTML with unique title, description, H1 and Product JSON-LD.
- Store pages include LocalBusiness/Store data with Saratov address, phone and working hours.
- Search/filter pages are `noindex` unless explicitly approved as landing pages.
- Old important URLs either still work or get clean 301 redirects.
- Submit sitemap in Yandex Webmaster after cutover and inspect important URLs.

Boss note interpretation:

- "Yandex already indexed it, if we break it, it will stop showing" means: do not accidentally change canonical host, block robots, remove sitemap, return 404/500, add `noindex`, or break redirects. Recovery can take weeks.
- "Extract features for visibility and security" means: document and carry over production-critical items: Metrika counter, robots/sitemap/canonical rules, nginx redirects/headers, rate limits, health checks, monitoring, backup and rollback commands.

## Final cutover acceptance

- `https://477477.ru/` returns 200 and V2.
- `https://www.477477.ru/` redirects exactly as chosen.
- `/api/health` returns 200.
- `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/ai.txt` return 200.
- `/cart`, `/api/cart`, `/api/leads` are not active order flows.
- Public catalog/search/product pages are usable from desktop and mobile.
- Script-like scraping probes are blocked, while normal browser navigation is not.
- Metrika receives page views and configured goals.
- Monitoring dashboard is private and green.
- Legacy rollback command/path is known before DNS/nginx switch.
