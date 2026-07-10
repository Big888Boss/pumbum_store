# Task 130 Stage 5 Code Ledger

## Summary
Implemented the isolated V2 frontend pages and routes inside `new-store-v2` without modifying `legacy_src`.

## Implemented
- Home page with selling hero, V2 KPI blocks, category grid, and explanation of logo overlay strategy.
- Catalog index page listing all pilot categories.
- Category landing route `/catalog/[category]` with SSG params, SEO metadata, representative SKU, selling points, and cross-sell cards.
- Product route `/catalog/[category]/[sku]` with SSG params, SEO metadata, Product JSON-LD, specs table, informative/selling copy, generated-photo prompt note, CTA panel, and cross-sells.
- General pages: `/about`, `/delivery`, `/contacts`.
- CSS additions for brand cards and list readability.
- Next config/package/ESLint fixes for V2-local build/lint checks.

## Logo/photo approach
Product photos remain logo-free placeholders under `public/images/generated-placeholders/`. Brand logos are rendered as separate HTML/CSS overlays via `ProductImage`/`BrandLogoOverlay` using V2-owned assets in `public/brand-logos/`.

## Checks
- `npm run lint` passed.
- `npm run check:isolation` passed: no direct `legacy_src` imports in V2 source.
- `npm run build` passed and generated static routes for home, general pages, six category pages, and six product pages.

## Notes for next workers
- `npm install` was run in `new-store-v2`, creating/updating V2 lockfile and dependencies.
- Radiators and mixers are still fallback pilot SKUs until supplier-backed SKUs are selected.
- Final commercial photo generation can replace placeholder SVGs without changing the overlay architecture.
