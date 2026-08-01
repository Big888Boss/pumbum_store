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
- manufacturer detail routes: nine verified pages under `/catalog/proizvoditeli/{manufacturer}`;
- buyer task routes: `/catalog/po-zadache` plus six task pages;
- buyer subcategories: 45 non-empty pages under `/catalog/{category}/podrazdel/{subcategory}`;
- cart route: `/cart` redirects to `/contacts`; `/api/cart` and `/api/leads` return `410` until order intake is explicitly approved;
- image references: all 9276 runtime products have real image references; legacy-local `/images/products/**` must be available as runtime static assets on server;
- generated output: `content/generated/legacy-catalog.json`;
- skipped as non-catalog/runtime/doc/demo: `products.json`, `valtec/catalog_desc.json`, `valtec/catalog_image_overrides.json`, `valtec/documents.json`.
- VALTEC import follows the live legacy mapper three-level section/group/model traversal and legacy unique article fallback; current VALTEC rows: 4410.

Текущий production runtime:

- image: `plumbing_store_v2-v2:catalog-navigation-20260723-v1`;
- active localhost port: `3023`;
- verified rollback image/container: `carousel-polish-20260723-v1` on `3022`, stopped after the public release checks to save RAM/swap;
- build only on `administrator@100.95.56.90`; never build on the small production host;
- release and rollback evidence: `docs/CATALOG_NAVIGATION_RELEASE_2026-07-23.md`.

Нельзя:

- коммитить `.env`, admin users, session files, private keys;
- коммитить `.data/leads.jsonl` или другие файлы с заявками/PII;
- переносить `server_data/admin/users.json`;
- коммитить весь `public/images` без отдельного решения по asset strategy.

## Active isolated redesign staging — 2026-08-01

- Source commit: `65cb51d`
- Build: `6ifPip-yNQOrJD9gbAXST`
- Unit: `pumbum-redesign-preview-mobile-composition-final-20260801.service`
- App listener: `127.0.0.1:3025`
- Tailnet preview: `http://100.95.56.90:3027/`
- Exact previous-build rollback:
  `/home/administrator/backups/pumbum-redesign/mobile-composition-20260801/.next-CkM2fMHxqyyBr5tPBja5R`
- Pre-correction build retained at:
  `/home/administrator/backups/pumbum-redesign/mobile-composition-20260801/.next-XMTbntr5PKZm4v3TAQ9X6`
- At `1120px` and below, category hero figures use the ten transparent
  `public/images/mascots/pose-v3/*-top-peek-v3.webp` assets. Desktop keeps the
  accepted side-peek pose.
- Mobile/tablet manufacturer and About content figures are intentionally
  visible in reserved seams. Do not restore the old blanket mobile
  `display:none` rule.
- Mobile menu close behavior is implemented in the client `SiteHeader` and is
  covered by Escape, outside-pointer and navigation assertions.
- Browser QA covers desktop, phone and tablet. Production `477477.ru` was not
  changed by this release.
- Top-peek figures are hosted inside the carousel and use alpha-trimmed
  `pose-v4` assets. Do not move them back to `.category-hero-media` or restore
  transparent bottom padding.
- Phone guidance cards reserve a stable post-CTA seam; geometry tests wait for
  fonts and cover every category before activation.
- On phone layouts, the top-peek figure overlaps the carousel frame by
  `10-16px` (measured `12px` on the reference category), so the crop line is
  hidden and the hands visibly grip the frame.
- The `Товары раздела` title occupies the left safe zone beside the thoughtful
  figure; the following product-count copy starts `4-14px` below the figure's
  feet. The card, CTA and catalog content were not moved or changed.
