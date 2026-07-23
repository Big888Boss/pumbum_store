# Agent Context

Цель файла: агент должен открывать только нужный срез V2, а не весь сайт.

## Если меняешь SEO core

Читать:

- `src/lib/seo/*`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `content/generated/legacy-route-redirects.json`
- `docs/SEO_MOBILE_RELEASE_2026-07-15.md`
- `src/app/layout.tsx`
- `content/company/profile.json`

Не читать:

- `public/images/**` целиком
- `docs/evidence/**`
- legacy snapshots

## Если меняешь категорию

Читать:

- `src/app/catalog/[category]/page.tsx`
- `src/entities/category/model.ts`
- `src/lib/catalog/loaders.ts`
- `content/generated/legacy-catalog.json`, если категория импортирована из legacy
- один файл из `content/categories/`
- товары этой категории в `content/products/**`

## Если меняешь карточку товара

Читать:

- `src/app/catalog/[category]/[sku]/page.tsx`
- `src/entities/product/model.ts`
- `src/lib/catalog/quality.ts`
- `src/lib/seo/jsonld.ts`
- конкретный файл товара в `content/products/<brand>/`

## Если меняешь поиск или заявочный путь

Читать:

- `src/app/search/page.tsx`
- `src/lib/catalog/search.ts`
- `src/app/contacts/page.tsx`
- `src/app/contacts/actions.ts`
- `src/app/api/leads/route.ts`
- `src/lib/leads/submit.ts`
- `src/entities/lead/model.ts`
- `src/app/catalog/[category]/[sku]/page.tsx`
- `src/lib/catalog/loaders.ts`

## Если переносишь данные из legacy

Читать:

- `docs/DATA_QUALITY.md`
- `scripts/import-legacy-catalog.mjs`
- `scripts/legacy-catalog-inventory.mjs`
- source snapshot вне repo или readonly server path

Текущий generated import:

- base legacy source files: 11;
- raw base legacy categories: 11;
- base legacy products: 5700;
- runtime buyer categories: 10 purpose categories defined in `src/lib/catalog/purpose.ts`;
- runtime products: 9276 generated rows: 5700 base legacy, 3508 TIM and 68 ESPA;
- sitemap-publishable runtime products: 9276;
- manufacturer index route: `/catalog/proizvoditeli`;
- cart route: `/cart` redirects to `/contacts`; `/api/cart` and `/api/leads` return `410` until order intake is explicitly approved;
- image references: all 9276 runtime products have real image references; legacy-local `/images/products/**` must be available as runtime static assets on server;
- generated output: `content/generated/legacy-catalog.json`;
- skipped as non-catalog/runtime/doc/demo: `products.json`, `valtec/catalog_desc.json`, `valtec/catalog_image_overrides.json`, `valtec/documents.json`.
- VALTEC import follows the live legacy mapper three-level section/group/model traversal and legacy unique article fallback; current VALTEC rows: 4410.

Текущий production runtime:

- image: `plumbing_store_v2-v2:carousel-polish-20260723-v1`;
- active localhost port: `3022`;
- verified rollback image/container: `category-showcase-20260722-v1` on `3021`, stopped after the public release checks to save RAM/swap;
- build only on `administrator@100.95.56.90`; never build on the small production host;
- release and rollback evidence: `docs/CAROUSEL_POLISH_RELEASE_2026-07-23.md`.

Нельзя:

- коммитить `.env`, admin users, session files, private keys;
- коммитить `.data/leads.jsonl` или другие файлы с заявками/PII;
- переносить `server_data/admin/users.json`;
- коммитить весь `public/images` без отдельного решения по asset strategy.
