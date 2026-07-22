# Category showcase release — 2026-07-22

## Scope

- Replaced the generic category hero in `Трубы и фитинги` with the real VALTEC stainless-steel pipe family used by `valtec-vti-900-304-1208`.
- Replaced the weak `Крепёж для монтажа` hero with the real SINIKON KM038.R clamp.
- Replaced the sewer elbow hero with the representative SINIKON 20015 orange sewer pipe.
- Removed opaque/noisy backgrounds from the VALTEC pipe, SINIKON KM038.R and KM100D.R product families without changing catalog rows or product routes.
- Renamed unsupported `Основной товар раздела` wording to the truthful `Рекомендуемый товар раздела` / `Рекомендуемые товары раздела`.
- Added five-second automatic rotation to the three-boiler heating carousel. It pauses on hover, keyboard focus, explicit pause, hidden tabs and `prefers-reduced-motion`; previous, next and dot controls remain available.

## Image assets

The committed presentation assets are limited to eight files under
`public/images/category-showcase/`: detail and 480x360 card PNG versions for
VALTEC stainless pipe, SINIKON KM038.R, SINIKON KM100D.R and SINIKON sewer pipe.

Source catalog images under `/images/products/**` were not replaced or deleted.
Background segmentation was executed only in an isolated `.venv-bg` on the USA
build host. That environment and its model are excluded by `.dockerignore` and
are not included in the application image or production host.

`src/lib/catalog/product-images.ts` applies presentation overrides only when a
product already resolves to one of the exact normalized source image paths.
This keeps unrelated products and all 9,276 catalog rows unchanged.

## Verification

- `npm run lint`: passed.
- `npm run check:isolation`: passed.
- `npm run analytics:check`: passed.
- `npm audit --audit-level=moderate`: `0 vulnerabilities`.
- `npm run build`: passed on `administrator@100.95.56.90`; no build ran on production.
- `catalog:check-taxonomy`: 9,276 products, 10 categories and 9,293 sitemap URLs.
- `catalog:check-legacy-purpose-redirects`: 7,546 moved paths covered, 0 missing, 0 ambiguous.
- `catalog:check-pagination`: 3,379 unique pipe/fitting products across 57 pages; warm staging max 746 ms.
- `security:check-csp`: enforcing policy, rotating nonce, no unsafe inline/eval, report endpoint 204.
- `analytics:check-browser`: counter `109783471`, one initial hit, one SPA hit, all five goals, no raw search query.
- Browser acceptance: public heating carousel moved from item 1 to item 2 after five seconds; pause and manual next were verified on staging.
- Browser acceptance: public sewer, fastener and pipe hero PNGs loaded successfully and used the intended representative products.

## Production

- Image: `plumbing_store_v2-v2:category-showcase-20260722-v1`.
- Docker archive SHA-256: `dff701de9436946d649ce18b7c6dfbbba5492dafb5323d7eb2b1a156d959c063`.
- Active loopback port: `3021`.
- Nginx upstream: `3021` primary, `3020` backup.
- Container: healthy, 0 restarts, OOM false.
- Public repeated warm check for `/catalog/truby-i-fitingi`: 331–690 ms after the old container was stopped.
- Previous `catalog-taxonomy-20260722-v4` container on `3020` is stopped, not removed, to conserve RAM while preserving rollback.

## Rollback

1. Start `plumbing_store_v2_catalog_taxonomy_20260722-v2-catalog-taxonomy-1`.
2. Confirm `http://127.0.0.1:3020/api/health` returns 9,276 products and 10 categories.
3. Restore `/etc/nginx/plumbing_store.conf.rollback-20260722-3020` to `/etc/nginx/sites-enabled/plumbing_store.conf`.
4. Run `sudo nginx -t` before `sudo systemctl reload nginx`.
5. Re-run public health, catalog, sitemap, CSP and image checks before stopping the 3021 container.
