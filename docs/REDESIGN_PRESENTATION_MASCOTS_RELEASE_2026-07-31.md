# Presentation-directed mascot release — 2026-07-31

## Scope

This release changes only the isolated high-end staging redesign. Production
`477477.ru` was not connected to, restarted or modified.

The implementation follows the handwritten placement scheme from
`/Users/zilbertov/Downloads/Presentation.pdf` while preserving all 9,276
products, ten categories, prices, routes, filters, sorting, pagination,
manufacturer pages, search and SEO contracts.

## Category ownership

| Category | Mascot |
| --- | --- |
| Водоснабжение | Тепловик |
| Канализация | Стыкович |
| Фильтрация | Фильтрыч |
| Насосы | Напорыч |
| Смесители и сифоны | Смесевич |
| Отопление и котельная | Бак Хлопотун |
| Крепёж для монтажа | Крепыч |
| Трубы и фитинги | Трубыч |
| Арматура и комплектующие | Арматурыч |
| Прочее оборудование | Крестович |

Every category uses its assigned mascot in three repeated presentation-directed
positions:

1. peeking from behind the hero carousel edge;
2. standing thoughtfully in the whitespace below the pre-purchase card;
3. sitting on the related-category explanatory line/card seam.

Manufacturers use seated Тепловик, Стыкович and Фильтрыч figures between the
first manufacturer cards. About uses a thoughtful Крепыч in the marked
lower-right area of the main content card. These are separate transparent
assets composed for their exact slots; the same full-body image is not reused
for all three poses. The previously rejected global companion and
category-runner layers remain absent; previously accepted hero/page and footer
mascots remain.

## Build and activation

- Implementation commit: `b76eba4`
- Active staging build ID: `JKCl7iHZyZoerzEGWZ7YM`
- Build host: USA factory
- Build controls: `MemoryMax=4G`, `MemoryHigh=3500M`, `CPUQuota=160%`,
  `Nice=10`
- App listener: `127.0.0.1:3025`
- Tailnet gate: `http://100.95.56.90:3027/`
- Public read-only URL:
  `https://giving-moves-winds-sig.trycloudflare.com/`
- Public access remains behind the existing outbound tunnel and loopback gate
  on `127.0.0.1:3028`
- Exact rollback build:
  `/home/administrator/backups/pumbum-redesign/presentation-mascots-corrective-20260731/.next-oGVITNX3iPc27gSte3MyV`
- Transparent PNG working sources:
  `/home/administrator/backups/pumbum-redesign/presentation-mascots-corrective-20260731/pose-v2-png-sources/`

## Verification

- Production build and TypeScript: passed
- Lint and isolation: passed
- Browser QA before and after activation: desktop `1280 × 847`, mobile
  `390 × 844`, dark/light,
  navigation, filters, sorting, pagination, carousel, scroll reveal and all
  presentation placements passed
- All ten category mappings render exactly three figures
- Rejected `.mascot-companion` and `.category-mascot-runner` layers are absent
- Browser console, page and same-origin request errors: none
- Taxonomy: 9,276 products, ten categories, 9,354 sitemap URLs, 60 navigation
  routes
- Full pipes/fittings pagination: 3,379 unique products across 141 pages
- Carousel QA: all ten categories, two or three accepted images, 32 px mobile
  controls, zero page errors
- CSP: enforce mode, rotating nonce, no inline style attributes, report
  endpoint `204`
- Tailnet gate: `200`
- Public URL and read-only gate: `200`; public health reports 9,276 products
  and ten categories
- Active preview and access gates: active, zero preview restarts
- Isolated build peak: 332.6 MiB, zero swap
- Active preview RSS after switch: approximately 390 MiB
- Host memory pressure after switch: zero; approximately 11 GiB available
- SalesGame web, API, Postgres, Redis and Mailpit remained running; stateful
  containers remained healthy

Visual comparison and iteration evidence is recorded in `design-qa.md`.

## Category seam tuning follow-up

The owner-approved follow-up keeps the same thirty category pose assets and
changes only their composition geometry plus the internal layout of the
pre-purchase advice card.

- Peeking figures overlap the carousel boundary by a measured `40px`, so the
  straight crop follows the product-media seam on desktop; the mobile offset
  was moved inward by the same visual direction.
- Seated figures are `12-14px` lower and anchored to the left edge of the third
  related-category card. The card remains above the decorative layer, while a
  leg can hang visibly into the inter-card gap.
- The pre-purchase card keeps its original copy and phone action, but now uses
  its height deliberately: the buying guidance occupies the center and the
  manager note plus full-width phone button form one aligned lower row.
- Thoughtful figures, About, manufacturers, card geometry, catalog content and
  all existing routes were not changed. Manufacturer figures were deliberately
  left in their current cards pending an owner choice.

### Active staging release

- Implementation commit: `38d8c9c`
- Active build ID: `KoqQfjCznzqwU-erirpnY`
- Active unit: `pumbum-redesign-preview-mascot-tuning-20260731.service`
- Listener: `127.0.0.1:3025`
- Tailnet and public read-only routes: unchanged
- Exact previous-build rollback:
  `/home/administrator/backups/pumbum-redesign/mascot-tuning-20260731/.next-JKCl7iHZyZoerzEGWZ7YM`

### Follow-up verification

- lint, TypeScript, production build, isolation and dependency audit: passed;
- browser QA before and after activation: desktop `1280 x 847`, mobile
  `390 x 844`, dark/light, zero runtime errors and zero horizontal overflow;
- explicit geometry assertions: `40px` hero overlap, seated anchor within the
  third-card seam and call action aligned to the card's lower inset;
- taxonomy: `9276` products, ten categories, `9354` sitemap URLs and 60
  navigation routes;
- full `3379`-product pipes/fittings pagination and all ten carousels: passed;
- CSP enforcement and 100-request health load: passed; load p50 `38ms`, p95
  `70ms`, all responses `200`;
- public preview remains `noindex`, read-only `POST /api/leads` remains `405`;
- preview restart count is zero; host memory PSI is zero and approximately
  `11 GiB` remains available; SalesGame and funding services remained running.

Production `477477.ru` was not connected to, restarted or modified.
