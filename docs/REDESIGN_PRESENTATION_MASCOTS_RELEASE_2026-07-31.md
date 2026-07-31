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
| Инструмент и расходные материалы | Крестович |

Every category uses its assigned mascot in three repeated presentation-directed
positions:

1. peeking from behind the hero carousel edge;
2. standing in the whitespace below the pre-purchase card;
3. integrated into the related-category heading/card seam.

Manufacturers use Скважинник, Капля and Крепыч between the first manufacturer
cards. About uses Капля in the marked lower-right area of the main content
card. The previously rejected global companion and category-runner layers
remain absent; previously accepted hero/page and footer mascots remain.

## Build and activation

- Implementation commit: `a872d1d`
- Active staging build ID: `MJEkSbnNCMhBroeYvLIpb`
- Build host: USA factory
- Build controls: `MemoryMax=4G`, `MemoryHigh=3500M`, `CPUQuota=160%`,
  `Nice=10`
- App listener: `127.0.0.1:3025`
- Tailnet gate: `http://100.95.56.90:3027/`
- Public access remains behind the existing read-only outbound tunnel and
  loopback gate on `127.0.0.1:3028`
- Exact rollback build:
  `/home/administrator/backups/pumbum-redesign/presentation-mascots-20260731/.next-oGVITNX3iPc27gSte3MyV`

## Verification

- Production build and TypeScript: passed
- Lint and isolation: passed
- Browser QA: desktop `1280 × 847`, mobile `390 × 844`, dark/light,
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
- Bounded load check: 100/100 `200`, five-way concurrency, p50 35 ms,
  p95 66 ms
- Tailnet gate: `200`
- Public read-only gate: `200`, `noindex/nofollow/noarchive`, `no-store`;
  `POST /api/leads` returns `405`
- Active preview and all three access services: active, zero restarts
- Preview peak RSS after switch: approximately 489 MiB
- Host memory pressure after switch: zero; approximately 11 GiB available
- SalesGame web, API, Postgres, Redis and Mailpit remained running; stateful
  containers remained healthy

Visual comparison and iteration evidence is recorded in `design-qa.md`.
