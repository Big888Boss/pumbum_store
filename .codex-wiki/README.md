# Project wiki

The current production implementation notes are maintained in `docs/`.

- Runtime and operational context: `docs/AGENT_CONTEXT.md`
- SEO rules: `docs/SEO_RULES.md`
- Current SEO/mobile release: `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- Performance release: `docs/PERFORMANCE_RELEASE_2026-07-11.md`
- Yandex Metrika release: `docs/METRIKA_RELEASE_2026-07-15.md`
- Production deployment and rollback: `docs/PRODUCTION_DEPLOYMENT_PLAN.md`

Production builds are created on the USA build host. The small production server must never run `next build` or `docker build`.

Current production storefront release: `plumbing_store_v2-v2:seo-mobile-20260715-v6` on localhost port `3015`. Nginx keeps the previous port `3014` as the live rollback backup. See `docs/SEO_MOBILE_RELEASE_2026-07-15.md` for acceptance evidence and rollback.
