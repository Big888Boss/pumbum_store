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
