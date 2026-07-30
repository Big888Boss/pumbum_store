# Redesign UX and mascot release — 2026-07-30

## Scope

This is a staging-only release for the isolated high-end redesign. Production
`477477.ru`, its catalog data, routes and runtime were not changed.

The release keeps all 9,276 products and the existing category/manufacturer
logic while changing only interaction, presentation and read-path performance:

- category filters, sorting, view switching, active-filter removal and
  pagination keep the resulting state and land on `#catalog-products`;
- the redundant global search form was removed from `/catalog/po-zadache`;
- category guidance and pre-purchase panels now contain a direct tracked
  `tel:+78452477477` action;
- ten category families have stable, semantic mascot ownership;
- general pages receive lightweight decorative mascot companions, while
  category listings add an IntersectionObserver-triggered runner;
- manufacturer group data is materialized once per server process instead of
  being repeatedly derived from the full product set on every request.

## Category mascot mapping

| Category | Mascot |
| --- | --- |
| Water supply | Bak Hlopotun |
| Sewerage | Stykovich |
| Filtration | Filtrych |
| Pumps | Naporych |
| Mixers and siphons | Smesevich |
| Heating and boiler room | Teplovik |
| Installation fasteners | Krepych |
| Pipes and fittings | Trubych |
| Valves and components | Armaturych |
| Other equipment | Krestovich |

The two remaining supplied characters, Kaplya and Skvazhinnik, are used on
general-purpose pages. Existing hero and footer characters are retained. All
new assets are transparent WebP files with bounded dimensions; no sprite sheet
is shipped to the browser.

## Motion and accessibility

The runner starts only when its catalog track enters the viewport. Ambient
figures use opacity/transform-only animation. Under
`prefers-reduced-motion: reduce`, looping and travel animations are disabled and
the runner is parked in a stable position. Decorative figures have empty alt
text and do not enter the keyboard order.

## Build and safety

- Candidate source: `/home/administrator/agent-projects/pumbum-store-redesign-candidate-ux-mascots-20260730`
- Build host: USA factory only
- Build controls: `MemoryMax=4G`, `CPUQuota=160%`, Node heap 3 GiB
- Runtime remains bound to loopback; Tailnet and public gates remain the only
  access layers
- Previous `.next` build is retained before activation for one-command rollback

## Verification

The release is not considered active until lint, TypeScript, production build,
dependency audit, route/catalog/SEO/security checks, desktop/mobile browser QA,
same-viewport visual comparison and post-switch health/resource checks pass.

## Candidate acceptance evidence

- Build ID: `ioTJXSOnOFtqczXlpHGzk`
- Lint and TypeScript: passed
- Production dependency audit: `0` vulnerabilities
- Catalog: 9,276 products, ten categories, 9,354 sitemap URLs
- Full pipes/fittings pagination: all 3,379 products across 141 pages
- Legacy path coverage: 7,546 moved routes covered, zero missing/ambiguous
- Browser QA: desktop `1280 x 847`, mobile `390 x 844`, dark/light,
  filters, sorting, pagination, task-search removal, phone CTA, mascot coverage,
  carousel autoplay, visible image loading and runtime errors all passed
- Ten-category carousel QA: passed; distinct groups, two or three accepted
  images per category, 32 px mobile targets, zero page errors
- CSP: enforce mode, rotating nonces, no inline style attributes, report
  endpoint `204`
- Load check: 100/100 responses `200`, five-way concurrency, p50 37 ms,
  p95 68 ms
- Browser evidence: `/tmp/pumbum-redesign-browser-qa8-20260730`
- Same-state comparison input:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/design-qa-comparison-20260730.png`

Warm five-run medians on the same host:

| Route | Previous staging | Candidate |
| --- | ---: | ---: |
| `/catalog/proizvoditeli` | 2.115 s | 0.060 s |
| `/about` | 2.297 s | 0.035 s |
| `/catalog/vodosnabzhenie` | 0.109 s | 0.080 s |
| `/delivery` | 0.034 s | 0.034 s |

The slow-page improvement comes from reusing precomputed manufacturer groups
and supplier product sets inside the server process; it does not cache user
state or change catalog content.

## Activated staging evidence

- Active staging commit: `a239cc3`
- Active build ID: `ioTJXSOnOFtqczXlpHGzk`
- Tailnet endpoint: `http://100.95.56.90:3027/`
- Application listener: `127.0.0.1:3025`; public read-only gate:
  `127.0.0.1:3028`
- Post-switch health: `ok`, 9,276 published products, ten categories
- Post-switch browser QA: passed at desktop `1280 x 847` and mobile
  `390 x 844`; no console, page or same-origin request errors
- Runtime after QA: active, zero restarts, approximately 465 MiB peak RSS;
  host memory pressure remained zero
- Read-only public gate: `X-Robots-Tag: noindex, nofollow, noarchive`, CSP
  enforced, `POST /api/leads` rejected with `405`
- Exact rollback build:
  `/home/administrator/backups/pumbum-redesign/ux-mascots-20260730/.next-ntJzITqB6mFDEfk1uCyWy`

The staging service had one controlled restart during the build switch.
Production `477477.ru` was not restarted or modified.

## Card-integrated mascot follow-up

The 2026-07-30 follow-up replaces the small page-edge companion strip with the
same number of large mascots integrated into actual content. The figures are
mounted inside category, manufacturer, task, product and information cards;
they sit on card ledges, peek from the card surface or point to nearby content.
No catalog data, route, filter, sorting, pagination, price or product logic was
changed.

- Candidate source:
  `/home/administrator/agent-projects/pumbum-store-redesign-candidate-card-mascots-20260730`
- Candidate build ID: `aan2vpoPFXuxQezetsdd_`
- Desktop size ranges: 226–310 px for general card companions and 224–286 px
  for product/detail companions
- Mobile size ranges: 168–214 px and 172–208 px respectively
- Category mascot: 222–286 px desktop and 176–212 px mobile
- Supplier badges remain above product media and mascot layers
- Motion remains opacity/transform-only and respects reduced motion

Final candidate acceptance:

- browser QA passed at `1280 x 847` and `390 x 844`; `runtimeErrors: []`;
- the mobile long-catalog reveal regression found during QA is fixed;
- lint, isolation, 9,276-product/10-category taxonomy, 9,354 sitemap URLs,
  all 3,379 paginated pipe/fitting products, enforced CSP and 100-request load
  check passed;
- dependency audit reports zero production vulnerabilities;
- candidate warm route timings remain equal to or faster than the previously
  active staging build on the measured home, catalog, manufacturer, about and
  category routes;
- combined visual comparison:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/design-qa-card-mascots-comparison-20260730.png`.

Production `477477.ru` remains outside this staging-only release.

## Activated card-integrated staging build

- Active staging commit: `92bde2b`
- Active build ID: `aan2vpoPFXuxQezetsdd_`
- Tailnet endpoint: `http://100.95.56.90:3027/`
- Loopback app: `127.0.0.1:3025`; public read-only gate: `127.0.0.1:3028`
- Post-switch browser QA passed at desktop `1280 x 847` and mobile
  `390 x 844`; `runtimeErrors` remained empty
- Health, Tailnet gate and public read-only gate return `200`; public writes
  remain rejected with `405`
- Runtime is active with zero restarts, about 448 MiB peak RSS, and zero host
  memory pressure during the final checks
- SalesGame API, web, Postgres, Redis and Mailpit containers remained running;
  the stateful containers remained healthy
- Exact rollback build:
  `/home/administrator/backups/pumbum-redesign/card-mascots-v2-20260730/.next-ioTJXSOnOFtqczXlpHGzk`

Production `477477.ru` was not connected to, restarted or modified during this
staging release.
