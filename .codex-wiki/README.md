# Project wiki

The current production implementation notes are maintained in `docs/`.

- Runtime and operational context: `docs/AGENT_CONTEXT.md`
- SEO rules: `docs/SEO_RULES.md`
- Current SEO/mobile release: `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- Performance release: `docs/PERFORMANCE_RELEASE_2026-07-11.md`
- Yandex Metrika release: `docs/METRIKA_RELEASE_2026-07-15.md`
- Production deployment and rollback: `docs/PRODUCTION_DEPLOYMENT_PLAN.md`

Production builds are created on the USA build host. The small production server must never run `next build` or `docker build`.

Current production storefront release: `plumbing_store_v2-v2:sameas-20260717-v1` on localhost port `3017`. Nginx keeps `brand-seo-20260716-v2` on port `3016` as the live rollback backup. The older 3015 container is stopped to conserve production memory; its image and compose file are retained. See `docs/BRAND_SEO_RELEASE_2026-07-16.md` for acceptance evidence, external blockers and rollback.

The verified organization identity links for structured data are the exact
Yandex Maps organization page `1056584886` and the 2GIS company page
`6052240280474447`. Do not replace them with search-result URLs or similarly
named organizations in Engels.

Release commits are pushed only after the public blue-green checklist is green. A prepared source tree or a healthy candidate port is not sufficient: verify the public route, catalog and sitemap totals, representative product images, logs, container health and rollback first.

Production alert delivery is active through the `Pumbum Telegram` Grafana
contact point. The three public endpoint/TLS rules were `inactive/ok` and a
Grafana test notification returned `ok` on 2026-07-17. Telegram credentials
live only in mode-0600 files on the monitoring host, never in this repository.
