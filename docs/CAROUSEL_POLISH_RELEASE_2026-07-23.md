# Carousel polish release — 2026-07-23

## Scope

- Replaced elongated carousel indicators with round 9 px markers inside 32×32 px touch targets.
- Kept the active marker round and enlarged it with a scale transform instead of changing its width.
- Set the heating carousel rotation to an exact five-second interval.
- Removed pointer-hover pause so the carousel does not appear stalled during normal mouse use.
- Kept explicit pause, keyboard-focus pause, hidden-tab pause and `prefers-reduced-motion` handling.
- Added a 420 ms enter transition for the product image and copy, with motion disabled for reduced-motion users.
- Prefetched the remaining two carousel images after hydration to avoid a visible delay on the first rotation.

No catalog rows, category assignments, routes, prices or source product images
were changed.

## Verification

- `npm run lint`: passed.
- `npm run check:isolation`: passed.
- `npm run analytics:check`: passed.
- `npm audit --audit-level=moderate`: `0 vulnerabilities`.
- `npm run build`: passed on `administrator@100.95.56.90`; no build ran on production.
- Public `catalog:check-taxonomy`: 9,276 products, 10 categories and 9,293 sitemap URLs.
- Public `catalog:check-legacy-purpose-redirects`: 7,546 moved paths covered, 0 missing, 0 ambiguous.
- Public `security:check-csp`: enforcing policy, rotating nonce and report endpoint 204.
- Public `analytics:check-browser`: counter `109783471`, one initial hit, one SPA hit, all five goals and no raw search query.
- Mobile browser acceptance at 390×844: three 32×32 px controls with 9×9 px round markers; item 1 remained active at 4.2 seconds and item 2 was active at 5.4 seconds.
- Public explicit pause held the same item for 5.4 seconds.
- Image and copy transition resolved to `category-carousel-enter` with a 0.42 second duration.
- Public routes `/`, `/catalog`, representative categories, `/api/health` and `/sitemap.xml` returned 200 with a browser user agent after cutover.

Visual evidence is stored outside the source tree under
`work/carousel-audit-20260723/`.

## Production

- Image: `plumbing_store_v2-v2:carousel-polish-20260723-v1`.
- Docker archive SHA-256: `df59ec637d9f9aca08a02c1b328bed14f78ce438f973ff8dd121f6803b4d87cd`.
- Active loopback port: `3022`.
- Nginx upstream: `3022` primary, `3021` backup.
- Container security: `node` user, read-only root filesystem, all capabilities dropped, `no-new-privileges`, loopback-only binding and bounded CPU, memory and PID resources.
- Container state after cutover: healthy, 0 restarts, OOM false.
- Previous `category-showcase-20260722-v1` container on `3021` is stopped, not removed, to conserve RAM while preserving rollback.

## Rollback

1. Start `plumbing_store_v2_category_showcase_20260722-v2-category-showcase-1`.
2. Confirm `http://127.0.0.1:3021/api/health` returns 9,276 products and 10 categories.
3. Restore `/etc/nginx/plumbing_store.conf.rollback-20260723-3021` to `/etc/nginx/sites-enabled/plumbing_store.conf`.
4. Run `sudo nginx -t` before `sudo systemctl reload nginx`.
5. Re-run public health, catalog, sitemap, CSP and carousel checks before stopping the 3022 container.
