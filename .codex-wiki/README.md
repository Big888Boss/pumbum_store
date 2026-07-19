# Project wiki

The current production implementation notes are maintained in `docs/`.

- Runtime and operational context: `docs/AGENT_CONTEXT.md`
- SEO rules: `docs/SEO_RULES.md`
- Current SEO/mobile release: `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- Performance release: `docs/PERFORMANCE_RELEASE_2026-07-11.md`
- Yandex Metrika release: `docs/METRIKA_RELEASE_2026-07-15.md`
- Production deployment and rollback: `docs/PRODUCTION_DEPLOYMENT_PLAN.md`

Production builds are created on the USA build host. The small production server must never run `next build` or `docker build`.

Current production storefront release: `plumbing_store_v2-v2:filters-price-20260717-v1` on localhost port `3019`. The verified `brand-seo-20260716-v2` rollback container on port `3016` is stopped to conserve roughly 300 MiB of RAM/swap; its image, stopped container and compose file are retained for one-command rollback. Unused 3017/3018 releases and the old 3015 container were removed from runtime without deleting images or catalog assets. See `docs/RESOURCE_OPTIMIZATION_RELEASE_2026-07-19.md` for current acceptance evidence and rollback.

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
