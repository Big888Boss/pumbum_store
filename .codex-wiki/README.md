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
- Current redesign performance release: `docs/REDESIGN_PERFORMANCE_RELEASE_2026-07-29.md`
- Current redesign UX and mascot release: `docs/REDESIGN_UX_MASCOTS_RELEASE_2026-07-30.md`
- Current presentation-directed mascot release: `docs/REDESIGN_PRESENTATION_MASCOTS_RELEASE_2026-07-31.md`
- Current responsive manufacturer mascot release: `docs/MANUFACTURER_RESPONSIVE_RELEASE_2026-08-01.md`
- Current category 3D video release: `docs/CATEGORY_3D_VIDEO_RELEASE_2026-08-08.md`
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
`GET` and `HEAD`, plus the CSP reporting endpoint, and adds
`noindex/nofollow/noarchive`. HTML and APIs remain uncached, while hashed Next.js
assets are immutable and public images/fonts use a bounded 30-day cache. Other
write requests return `405`. The active external transport is the bounded
`pumbum-redesign-cloudflared-public-readonly.service`; anonymous
`localhost.run` was removed after it reassigned the hostname while the SSH
process was still alive. It does not expose a preview credential in chat.

The 2026-07-29 redesign performance release removes the entry animation from
above-the-fold content, replaces the non-composited placeholder shimmer with a
static low-cost state, and serves the selected carousel/category showcase images
as deterministic WebP derivatives while retaining their PNG originals. The
active build ID is `ntJzITqB6mFDEfk1uCyWy`; the previous `.next` build remains
under `/home/administrator/backups/pumbum-redesign/performance-20260729` for
rollback. The live loopback app remains on `3025`, the Tailnet gate remains on
`3027`, and the public read-only gate remains on `3028`. Health reports all
9,276 products and ten categories. Desktop/mobile browser QA, taxonomy, legacy
redirect, carousel, CSP, dependency, load, and public/Tailnet checks passed.

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

The 2026-07-30 staging-only card-mascot follow-up removes the small page-edge
companion strip and reuses the same character count inside real category,
manufacturer, task, product and information cards. Desktop figures are roughly
224–310 px high and mobile figures 168–214 px, with dedicated card ledges,
peeking and pointing placements. The supplier badge remains in the highest
product-media layer. A browser-QA-discovered mobile issue where a very tall
catalog container could remain transparent was fixed by revealing oversized
containers immediately and lowering the fallback observer threshold. No
catalog, route, price, search, filter, sorting or pagination contract changed.
Candidate build `aan2vpoPFXuxQezetsdd_` passed desktop/mobile visual QA, lint,
isolation, taxonomy, full pagination, CSP, load and dependency checks before
staging activation. Production `477477.ru` was not changed.

The card-integrated mascot build is now active on staging at commit `92bde2b`
and build ID `aan2vpoPFXuxQezetsdd_`. The app remains loopback-only on `3025`,
with the Tailnet gate on `100.95.56.90:3027` and the public read-only gate on
`3028`. Post-switch browser QA passed at desktop `1280 x 847` and mobile
`390 x 844` with no runtime errors. The exact previous build is retained at
`/home/administrator/backups/pumbum-redesign/card-mascots-v2-20260730/.next-ioTJXSOnOFtqczXlpHGzk`.

The owner-directed rollback candidate `oGVITNX3iPc27gSte3MyV` removes the two
newest mascot layers only: the page-edge companion trail and the later
card-integrated/category-runner figures. Previously accepted hero/page scenes
and the seated footer Krestovich remain. Catalog, search, filter, sorting,
pagination, CTA, performance and mobile reveal behavior are unchanged. The
candidate passed desktop/mobile browser QA, full taxonomy and pagination,
CSP, dependency and bounded load checks before staging activation. Production
`477477.ru` is not part of this rollback.

The rollback is active on staging at commit `1ec79e0` and build ID
`oGVITNX3iPc27gSte3MyV`. The Tailnet endpoint remains
`http://100.95.56.90:3027/`; loopback listeners and access gates did not
change. Post-switch desktop/mobile browser QA passed without runtime errors,
and the rejected companion/runner layers are absent. The exact previously
active build is retained at
`/home/administrator/backups/pumbum-redesign/mascot-layer-rollback-20260730/.next-aan2vpoPFXuxQezetsdd_`.

The corrected 2026-07-31 presentation-directed staging release restores only
the character assets required by the colleague's marked composition, without
restoring the rejected global companion or runner layers. Each of the ten
categories uses its semantic mascot in three separately generated poses:
peeking with a hand on the carousel edge, standing thoughtfully below the
pre-purchase card, and sitting on the related-category explanatory line.
Manufacturers use seated Тепловик, Стыкович and Фильтрыч figures between the
first cards; About uses a thoughtful Крепыч in the marked lower-right content
area. The overlays do not change card, grid or text geometry. Active commit
`b76eba4` and build `JKCl7iHZyZoerzEGWZ7YM` passed candidate and
post-activation desktop/mobile browser QA, all ten mappings, lint, TypeScript,
isolation, taxonomy, full pagination, carousel and CSP checks. The previous
build `oGVITNX3iPc27gSte3MyV` remains available under
`/home/administrator/backups/pumbum-redesign/presentation-mascots-corrective-20260731`
for exact rollback. Production `477477.ru` was not changed.

The later 2026-07-31 seam-tuning follow-up is active at commit `38d8c9c` and
build `KoqQfjCznzqwU-erirpnY`. It moves every category hero peek to the exact
carousel seam, seats every related-category figure lower on the left edge of
the third card, and rebalances the pre-purchase phone card without moving the
surrounding grids. Manufacturers and About were intentionally left unchanged.
The previous build is retained at
`/home/administrator/backups/pumbum-redesign/mascot-tuning-20260731/.next-JKCl7iHZyZoerzEGWZ7YM`.
Desktop/mobile browser QA, catalog/taxonomy/pagination/carousel, CSP, dependency
and bounded load checks passed; production `477477.ru` was not touched.

The manufacturer-only semantic follow-up is active at commit `4139f46` and
build `sh4maH1zXLMXPQW744aKf`. Стыкович now sits on `SINIKON`, Фильтрыч remains
on `Гидроконтракт`, and Тепловик sits on `ZOTA` with the accepted leftward
offset; `VALTEC` no longer hosts a figure. Pose assets, scale, vertical seam,
card geometry and mobile behavior are unchanged. Candidate and post-activation
desktop/mobile QA, lint, TypeScript, isolation, taxonomy, CSP and dependency
checks passed. The previous build is retained at
`/home/administrator/backups/pumbum-redesign/manufacturer-placement-20260731/.next-KoqQfjCznzqwU-erirpnY`;
production `477477.ru` was not touched.

The final 2026-08-01 mobile geometry correction is active at commit `05d1c50`
and build `XMTbntr5PKZm4v3TAQ9X6`. On all ten category pages, the narrow
top-peek figure is now positioned by the actual carousel/product frame and its
accepted image has only empty alpha padding removed. The thoughtful figure
starts below the phone CTA, while the gap before `Товары раздела` remains
bounded and collision-free. Automated checks wait for fonts, measure all ten
phone categories plus tablet, and retain the accepted desktop composition.
Exact rollback builds are stored under
`/home/administrator/backups/pumbum-redesign/mobile-geometry-20260801`.
Production `477477.ru` was not touched.

The exact-corner correction is active at commit `7f8ee9f` and build
`7amE_klJPTk9sNkUGIEkJ`. It follows the owner's supplied crop: Стыкович now
straddles the rounded upper-left SINIKON border with both legs hanging inside
the card, while Тепловик is centered farther left on ZOTA. Фильтрыч, card
geometry, manufacturer copy and the mobile breakpoint remain unchanged. The
previous build is retained at
`/home/administrator/backups/pumbum-redesign/manufacturer-corner-20260731/.next-sh4maH1zXLMXPQW744aKf`.
Candidate and post-activation desktop/mobile QA, geometry assertions, lint,
TypeScript, isolation, taxonomy, CSP and dependency checks passed; production
`477477.ru` was not touched.

The 2026-08-01 responsive follow-up is active on isolated staging at commit
`5ae1fb8` and build `E4IO4uqeibUwYb9MjOG6P`. At widths up to `1120px`, all ten
category owners switch from the desktop side-peek to dedicated transparent
top-peek assets that grip the carousel upper edge without entering the product
or supplier-logo safe zone. Manufacturer figures and the About content figure
are now visible in reserved phone/tablet seams. The mobile menu closes on
Escape, outside pointer input and route navigation. Candidate and active runs
passed desktop `1280x847`, tablet `820x1180` and phone `390x844` browser QA,
lint, TypeScript, isolation, taxonomy, full pagination, CSP and dependency
checks. The exact rollback is
`/home/administrator/backups/pumbum-redesign/mobile-responsive-20260801/.next-7amE_klJPTk9sNkUGIEkJ`;
production `477477.ru` was not touched.

The final 2026-08-01 phone composition alignment is active at commit
`65cb51d` and build `6ifPip-yNQOrJD9gbAXST`. Across all ten category pages,
top-peek figures now overlap the carousel frame by `10-16px`, hiding the crop
line and placing their hands on the frame. The `Товары раздела` heading uses
the left safe zone beside the thoughtful figure, while the product-count copy
starts `4-14px` below its feet. Candidate and post-switch desktop, tablet and
phone browser QA, taxonomy, full pagination, CSP and carousel checks passed.
The exact previous build is retained at
`/home/administrator/backups/pumbum-redesign/mobile-composition-20260801/.next-CkM2fMHxqyyBr5tPBja5R`;
production `477477.ru` was not changed.

The 2026-08-01 manufacturer responsive seam correction is active at
implementation commit `074a2f9` and build `QZnoOkwbi7rClrMSQP2nG`.
Desktop placement remains unchanged. At tablet and phone widths, Стыкович is
attached to the upper-left SINIKON corner, Фильтрыч sits on the lower
Гидроконтракт seam toward AQUARIO, and Тепловик sits on the lower ZOTA seam
toward TIM. All manufacturer-card gaps remain `16px`; figures do not cover
logos, copy or the manufacturer links. Focused geometry and the full storefront
browser suite passed at `1280x847`, `820x1180` and `390x844`. The exact prior
build remains under
`/home/administrator/backups/pumbum-redesign/manufacturer-responsive-20260801`.
Production `477477.ru` was not changed.

The 2026-08-08 category-video release is active only on isolated staging at
build `VrSm6Yp1QPN1nYTJVNRbY`. Each of the ten catalog categories now has one
semantically matched, optimized 3D product video immediately after the
`Товары раздела` summary. Media loads only near the viewport, plays while
visible, pauses out of view and becomes a static poster for reduced-motion
users. Candidate and post-switch checks passed all 30 phone/tablet/desktop
combinations plus full storefront, taxonomy, pagination, CSP, dependency and
bounded-load regressions. The previous build is retained at
`/home/administrator/backups/pumbum-redesign/category-videos-20260808/.next-QZnoOkwbi7rClrMSQP2nG`;
production `477477.ru` was not changed.
