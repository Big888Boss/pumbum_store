# Project wiki

The current production implementation notes are maintained in `docs/`.

- Runtime and operational context: `docs/AGENT_CONTEXT.md`
- SEO rules: `docs/SEO_RULES.md`
- Current SEO/mobile release: `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- Current catalog taxonomy release: `docs/CATALOG_TAXONOMY_RELEASE_2026-07-22.md`
- Current category showcase release: `docs/CATEGORY_SHOWCASE_RELEASE_2026-07-22.md`
- Current carousel polish release: `docs/CAROUSEL_POLISH_RELEASE_2026-07-23.md`
- Current catalog navigation release: `docs/CATALOG_NAVIGATION_RELEASE_2026-07-23.md`
- Performance release: `docs/PERFORMANCE_RELEASE_2026-07-11.md`
- Yandex Metrika release: `docs/METRIKA_RELEASE_2026-07-15.md`
- Production deployment and rollback: `docs/PRODUCTION_DEPLOYMENT_PLAN.md`

Production builds are created on the USA build host. The small production server must never run `next build` or `docker build`.

Current production storefront release: `plumbing_store_v2-v2:catalog-navigation-20260723-v1` on localhost port `3023`. The previous `carousel-polish-20260723-v1` container on port `3022` is stopped to conserve RAM/swap; its image and stopped container are retained for rollback. No build runs on production. See `docs/CATALOG_NAVIGATION_RELEASE_2026-07-23.md` for acceptance evidence and rollback.

The verified organization identity links for structured data are the exact
Yandex Maps organization page `1056584886` and the 2GIS company page
`6052240280474447`. Do not replace them with search-result URLs or similarly
named organizations in Engels.

Release commits are pushed only after the public blue-green checklist is green. A prepared source tree or a healthy candidate port is not sufficient: verify the public route, catalog and sitemap totals, representative product images, logs, container health and rollback first.

Production alert delivery is active through the `Pumbum Telegram` Grafana
contact point. Availability checks `/api/health` every 30 seconds, buyer pages
every 2 minutes and the 1.8 MiB sitemap every 30 minutes. Alerts wait for a
sustained failure and use concise Russian messages. Telegram credentials live
only in mode-0600 files on the monitoring host, never in this repository.
