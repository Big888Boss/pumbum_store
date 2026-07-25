# Catalog navigation release — 2026-07-23

## Result

The storefront keeps all 9,276 generated product rows and the ten existing
purpose categories. No source catalog row, product slug, product category
assignment, price or product image was deleted or rewritten in this release.

The buyer-facing navigation no longer exposes supplier spreadsheet labels as
the primary catalog structure:

- 45 non-empty curated subcategory pages use stable URLs under
  `/catalog/{category}/podrazdel/{subcategory}`;
- six task pages cover water supply, home heating, hydronic floor heating,
  sewerage, boiler-room piping and installation/repair;
- nine manufacturer pages link to the real products already present in the
  generated catalog;
- duplicate supplier labels are collapsed into one buyer label;
- the visible `Прочее оборудование` category name is now
  `Инструмент и расходные материалы`; its slug stays unchanged to preserve URLs;
- category chips link to indexable subcategory pages, while arbitrary
  filter/sort/pagination URLs remain `noindex`;
- related products are selected from adjacent real catalog groups without
  claiming that specific articles are compatible.

Every category now uses the existing accessible five-second carousel with
three products from three distinct buyer groups. The heating catalog contains
boilers, collector systems and radiator fittings, but no verified radiator or
water-heater product group. Its carousel therefore truthfully uses a boiler,
a collector item and radiator fittings instead of inventing absent products.

## Search and route contract

- Sitemap: 9,354 unique URLs.
- Product URLs in sitemap: 9,276.
- Product redirect coverage: 7,546 moved routes covered, zero missing and zero
  ambiguous.
- New navigation URLs checked: 60 (45 subcategories, six tasks and nine
  manufacturers), all non-empty and returning `200`.
- Search/filter URLs stay out of the sitemap.
- The six task pages are navigation collections, not a claim that the displayed
  articles form a compatible kit.

## Performance and resource behavior

Product-to-subcategory classification is cached per runtime product object.
Before caching, a 20-request category test with concurrency three on the build
host produced p50 3,590 ms. With the same image limits and test parameters,
p50 was 895 ms, p95 1,692 ms and all 20 responses were `200`.

The production host did not run `npm install`, `next build` or `docker build`.
The image was built and tested on `administrator@100.95.56.90`. During
blue-green verification both versions ran briefly; the previous container was
stopped after public acceptance. The warmed single-release runtime left about
220–300 MiB available and used about 750–790 MiB of swap during final checks.

## Verification

- `npm run lint`: passed.
- `npm run check:isolation`: passed.
- `npm run analytics:check`: passed.
- `npm audit --audit-level=moderate`: zero known vulnerabilities.
- production Next.js build: passed.
- public taxonomy/navigation check: 9,276 products, ten categories, 9,354
  sitemap URLs and all 60 new navigation routes green.
- public legacy route check: zero missing or ambiguous product routes.
- public CSP check: enforcing policy, rotating nonce, no inline style
  attributes, report endpoint `204`.
- public browser analytics check: counter `109783471`, one initial pageview,
  one SPA pageview, all five approved goals and no raw search query.
- public mobile carousel check: all ten categories, three distinct groups,
  five-second autoplay, 32 px controls, 9 px round markers and zero page errors.
- public Prometheus blackbox probes for health, homepage and catalog:
  `probe_success=1`; no firing alerts after the switch.
- production container: healthy, zero restarts, OOM false, `node` user,
  read-only root, all capabilities dropped, `no-new-privileges`, loopback-only
  port and bounded CPU/memory/PIDs.

## Production

- Image: `plumbing_store_v2-v2:catalog-navigation-20260723-v1`.
- Build-host manifest: `sha256:da6c88eb116abc50fec063f9b45ecce6cfc7f12bd797a30703acd7e31ec5d6f3`.
- Transferred archive SHA-256:
  `10c0fe6db328aedadb7338d441f1ca13872e91f9bde809dd5f4846bdb36a5a72`.
- Active loopback port: `3023`.
- Nginx upstream: `3023` primary, `3022` backup.
- Compose: `deploy/docker-compose.bluegreen-catalog-navigation-20260723.yml`.
- Previous `carousel-polish-20260723-v1` container on `3022` is stopped, not
  removed, and remains the rollback release.

## Rollback

```bash
cd /opt/plumbing_store_v2/deploy
docker compose -f docker-compose.bluegreen-carousel-polish-20260723.yml start v2-carousel-polish
curl -fsS http://127.0.0.1:3022/api/health
sudo cp /etc/nginx/plumbing_store.conf.rollback-20260723-3022 /etc/nginx/sites-enabled/plumbing_store.conf
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://477477.ru/api/health
docker compose -f docker-compose.bluegreen-catalog-navigation-20260723.yml stop v2-catalog-navigation
```

Do not stop the new container until the restored public route and catalog
checks are green.
