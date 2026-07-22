# Catalog taxonomy release — 2026-07-22

## Result

The buyer catalog now contains ten purpose-based categories without changing the generated source catalog or deleting products.

| Category | Products |
|---|---:|
| Водоснабжение | 436 |
| Канализация | 620 |
| Фильтрация | 150 |
| Насосы | 605 |
| Смесители и сифоны | 36 |
| Отопление и котельная | 2,134 |
| Крепёж для монтажа | 382 |
| Трубы и фитинги | 3,379 |
| Арматура и комплектующие | 1,230 |
| Прочее оборудование | 304 |
| **Total** | **9,276** |

The default order ranks core equipment before auxiliary parts. Each category uses a manually verified representative product. The heating category has an accessible three-product carousel with gas, electric and solid-fuel ZOTA boilers. The unsupported label `Популярный товар` was removed.

Old combined category URLs return permanent redirects. Product URLs whose category changed are resolved by their globally unique product slug and permanently redirected to the new category, so previously indexed product links remain valid.

The public phone format is `+7 (8452) 477-477`; the `tel:` value remains `+78452477477`.

## Repeatable checks

```bash
npm run lint
npm run check:isolation
npm run analytics:check
npm audit
npm run build
CATEGORY_TAXONOMY_BASE_URL=https://477477.ru npm run catalog:check-taxonomy
CATEGORY_TAXONOMY_BASE_URL=https://477477.ru npm run catalog:check-legacy-purpose-redirects
CATEGORY_TEST_BASE_URL=https://477477.ru npm run catalog:check-pagination
CSP_BASE_URL=https://477477.ru npm run security:check-csp
METRIKA_TEST_BASE_URL=https://477477.ru npm run analytics:check-browser
```

Acceptance evidence on 2026-07-22:

- health: 9,276 products, 9,276 published products, 10 categories;
- sitemap: 9,293 unique URLs;
- route preservation: 1,730 product paths unchanged and 7,546 moved paths covered by one unambiguous redirect; zero missing or ambiguous products;
- heaviest category: 3,379 unique products across 57 pages, 60 rows in list view;
- public pagination latency: p50 670 ms, maximum 2,005 ms during the release check;
- Metrika: one initial pageview, one SPA pageview and all five approved goals; raw search text is not sent;
- CSP: enforcing policy, rotating nonce, no inline style attributes, report endpoint 204;
- dependency audit: zero known vulnerabilities;
- active container: healthy, zero restarts, OOM false;
- recent storefront 5xx and upstream errors after the final switch: none.

## Build and production runtime

Heavy work was performed on `administrator@100.95.56.90`. The production server did not run `npm install`, `next build` or `docker build`.

The production image must be built with the public values at build time because Next.js inlines `NEXT_PUBLIC_*` variables:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://477477.ru \
  --build-arg NEXT_PUBLIC_SITE_ENV=production \
  --build-arg NEXT_PUBLIC_YANDEX_METRIKA_ID=109783471 \
  -t plumbing_store_v2-v2:catalog-taxonomy-20260722-v4 .
```

- image: `plumbing_store_v2-v2:catalog-taxonomy-20260722-v4`;
- image manifest: `sha256:edba00dd2ac2be6683d6018541fc09c882b39930f7593633362d034df94adad8`;
- transferred archive SHA-256: `cafa531fe8606da9631f66fd8194cabc8fdac44e657876ac1cae3df2cb69513d`;
- active port: `127.0.0.1:3020`;
- compose: `deploy/docker-compose.bluegreen-catalog-taxonomy-20260722.yml`;
- previous `filters-price-20260717-v1` container on port 3019 is stopped, not removed.

## Rollback

```bash
cd /opt/plumbing_store_v2/deploy
docker compose -f docker-compose.bluegreen-filters-price-20260717.yml start v2-filters-price
sudo cp /etc/nginx/plumbing_store.conf.pre-taxonomy-20260722 /etc/nginx/sites-enabled/plumbing_store.conf
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://477477.ru/api/health
```

The Nginx backup is intentionally outside `sites-enabled`; files placed inside that directory are loaded as active configuration.

## Monitoring note

Public blackbox probes for health, homepage, catalog and sitemap are green. The separate Prometheus targets for production node/nginx exporters on ports 9100/9113 cannot currently be reached from the build/monitoring host because that host reports `no matching peer` for the production Tailscale address. Restoring those resource graphs requires a Tailscale ACL/grant between the two hosts; the exporters themselves are running and bound only to the production Tailscale address.
