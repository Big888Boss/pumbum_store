# SEO, GEO and mobile release 2026-07-15

## Scope

This release is based on the exact production source and catalog snapshot from 2026-07-15. The generated catalog remains unchanged at `9276` products. OpenWebUI and unrelated VPN services are outside the deployment scope.

## SEO and GEO contract

1. Every indexable page keeps a unique title, description, H1 and canonical URL on `https://477477.ru`.
2. Product titles use the normalized product and brand name plus the commercial Saratov intent.
3. Product pages show a natural category line: product group, sale and pickup in Saratov.
4. Global Saratov geo metadata and Store/Organization JSON-LD remain enabled.
5. Product and Breadcrumb JSON-LD remain server-rendered. Offer is published only with a numeric price; availability is never invented.
6. Search, filtered catalog pages and page 2+ remain outside the index according to `docs/SEO_RULES.md`.
7. Sitemap and robots remain generated from the current production catalog and canonical host.
8. Old brand, subcategory, group and `/product/<article>` URLs use an exact generated permanent-redirect map instead of a generic search redirect.
9. Ordinary products do not claim exact stock in the UI. Explicit ESPA preorder products keep `Под заказ`; all other products ask the manager to confirm the price and shipping possibility.

## Legacy redirects

- Source: public catalog cache from the production backup dated 2026-07-04.
- Source SHA-256: `9f63c3ec535488f0c217f719d75c266e8c34e119b6e9215304d6bc638fd1cce7`.
- Coverage: `601` old catalog routes and `5619` unique article routes.
- Exact current product matches: `5624` of `5640` old rows.
- The remaining `16` removed old rows redirect to the closest current purpose category.
- Generator: `scripts/generate-legacy-route-redirects.mjs`.
- Runtime artifact: `content/generated/legacy-route-redirects.json`.

## Mobile and logos

- Mobile header uses a compact native dropdown menu with keyboard support; desktop navigation is unchanged.
- Manufacturer anchors are stable redirect targets.
- The broken handcrafted TIM mark was replaced by the published TIM logo asset. Its white raster background is blended into the logo surface without modifying the mark.
- White SVG background rectangles were removed from the local manufacturer assets.
- VIVALDO is rendered black in manufacturer cards, product overlays and product fallbacks.

## Release gates

- catalog checksum and `9276` route count unchanged;
- lint, TypeScript, build and legacy redirect checks pass on the USA build host;
- new container starts on a separate localhost port with read-only root filesystem and existing memory limits;
- mobile and desktop browser checks cover menu, catalog, filters, search, product, manufacturers and contacts;
- headers, CSP, Metrika, robots, sitemap, old redirects, logs, memory, swap, disk and restart count are checked before and after cutover;
- the previous active production image/container remains available for rollback.

## Production deployment

- Final image: `plumbing_store_v2-v2:seo-mobile-20260715-v6`.
- Active service: `plumbing_store_v2_seo_mobile_20260715-v2-seo-mobile-1` on `127.0.0.1:3015`.
- Nginx primary: `127.0.0.1:3015`; live rollback backup: previous Metrika service on `127.0.0.1:3014`.
- Versioned compose: `deploy/docker-compose.bluegreen-seo-mobile-20260715.yml`.
- Pre-cutover Nginx backup: `/etc/nginx/backups/plumbing_store.conf.backup-20260715-seo-mobile`. Backups must stay outside `sites-enabled` because that directory is included as active configuration.
- The application remains bound only to localhost, runs as `node`, uses a read-only root filesystem and has a `384m` memory limit.

Production acceptance confirmed:

- health reports `9276` products and `6` categories;
- sitemap contains `9289` URLs, including `68` ESPA products;
- all `3517` product detail/card asset paths selected by the runtime manifest exist on production;
- the heavy category exposes all `1366` products across `23` pages with no duplicates; production direct latency was `193-975 ms`, with `282 ms` p50;
- repeated public checks returned manufacturers in `170-318 ms`, search normally in `198-463 ms` with a `1167 ms` maximum, and the heavy category in `195-777 ms`;
- the public browser test passed initial and SPA pageviews plus all five approved Metrika goals;
- enforced CSP rotates the nonce, contains no inline style attributes and accepts reports with `204`;
- the new container has zero restarts and was not OOM-killed; the disk retained about `6.8 GiB` free after deployment.

## Rollback

No rebuild is required. Restore the Nginx backup above, run `nginx -t`, reload Nginx and verify public health. The previous service remains running on `127.0.0.1:3014` during the rollback window. Do not stop or remove the new service until the public checks pass after rollback.
