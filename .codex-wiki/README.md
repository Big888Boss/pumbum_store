# Project wiki

The current production implementation notes are maintained in `docs/`.

- Runtime and operational context: `docs/AGENT_CONTEXT.md`
- SEO rules: `docs/SEO_RULES.md`
- Current SEO/mobile release: `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- Current catalog taxonomy release: `docs/CATALOG_TAXONOMY_RELEASE_2026-07-22.md`
- Current category showcase release: `docs/CATEGORY_SHOWCASE_RELEASE_2026-07-22.md`
- Current carousel polish release: `docs/CAROUSEL_POLISH_RELEASE_2026-07-23.md`
- Current catalog navigation release: `docs/CATALOG_NAVIGATION_RELEASE_2026-07-23.md`
- Isolated high-end redesign prototype (temporary protected preview, not deployed): `docs/HIGH_END_REDESIGN_PROTOTYPE_2026-07-25.md`
- Performance release: `docs/PERFORMANCE_RELEASE_2026-07-11.md`
- Yandex Metrika release: `docs/METRIKA_RELEASE_2026-07-15.md`
- Production deployment and rollback: `docs/PRODUCTION_DEPLOYMENT_PLAN.md`

Production builds are created on the USA build host. The small production server must never run `next build` or `docker build`.

The 2026-07-25 high-end redesign is an isolated source/build prototype based on
production commit `a6bc64e`. The owner approved a temporary preview whose app
process stays on `127.0.0.1:3025`. Tailnet access is provided through
`100.95.56.90:3027`; one non-tailnet reviewer uses an invitation-gated,
outbound-only TLS tunnel. Cloudflare Quick Tunnel is the preferred transport;
an outbound-only `localhost.run` SSH tunnel is the temporary fallback while
Cloudflare returns allocation rate-limit `1015/429`. Both reach the same
loopback invitation gate. No production route or public inbound port was
changed. The second design iteration adds the current store logo,
stable quality-gated category carousels, collection search/filter/sort
controls, lightweight scroll reveals, a back-to-top control and a denser
product-detail composition without the redundant photo explanation panel.
The colleague-feedback pass keeps the light theme stable across navigation,
reduces mobile collection render pressure to 24 products per page, advances
category carousels every 2.4 seconds with visible previous/next controls, adds
search to the task-selection page, and turns footer phone, email and address
into explicit actions with email copy feedback. A later staging-only visual
pass adds transparent theme-aware store logos, a clean alpha cutout for the
reported CIMM tank, and lightweight Teplovik, Bak Hlopotun and alcohol-free
Krestovich mascot placements. The whole header/footer logo surface links home.
The follow-up page-mascot pass at staging commit `2a42d76` gives every main
top-level page its own task-specific character scene while retaining a second,
seated alcohol-free Krestovich at the footer seam. Manufacturers, search,
delivery, about, contacts, task selection and privacy now have distinct poses;
the existing home and catalog scenes remain unchanged. The footer figure is
positioned with its seat on the section boundary instead of floating above it.
The 2026-07-26 staging-only interaction and catalog-image pass adds visible,
low-cost IntersectionObserver reveals for category and product cards, anchors
pagination to the beginning of the product grid, makes cached mascot and
product-image loading deterministic, and keeps the first six catalog/search
images eager. A versioned, reversible Sharp pipeline inspected 1,836 current
display sources: 1,451 received accepted transparent derivatives, 226 were
already transparent, and 159 were retained for manual review instead of being
damaged by an unsafe cutout. Original files remain unchanged; the generated
asset store is outside Git and the checked-in override map is the only runtime
switch. Desktop/mobile browser QA, all ten category carousels, taxonomy,
pagination and legacy-route coverage pass on the isolated staging candidate.
Browser/design QA passed after desktop/mobile, dark/light, catalog, search,
product, image, carousel and interaction checks. Production deployment still
requires separate owner approval.

The 2026-07-26 source-recovery pass is staging-only and reversible. It searched
all 343 quality/transparency review sources by exact article and supplier,
recovered 342 source candidates, and published 312 visually accepted transparent
WebP pairs. The remaining 31 keep their previous runtime image because the
foreground mask damaged the product, preserved a visible rectangle, or no
trustworthy improvement was available. Originals and every prior override map
remain intact. Supplier badges now sit in an isolated top layer with a responsive
image safe zone, so the product cannot cover the badge. The active candidate is
`pumbum-redesign-preview-image-recovery.service` on loopback port `3025`; the
protected gate is `pumbum-redesign-share-gate-image-recovery.service`.
For reviewers outside Tailscale, a separate public read-only proxy allows only
`GET` and `HEAD`, adds `noindex/nofollow/noarchive`, disables caching and returns
`405` for write requests. It does not expose a preview credential in chat.

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
