# Performance release 2026-07-11

Scope: the production storefront at `https://477477.ru`, especially dynamic category rendering on the existing `1 vCPU / 1 GiB RAM` host. The catalog, product data, filters, views, search, CSP and ordering state are preserved. Open WebUI and port `8443` were not changed.

## Baseline

The heaviest category rendered up to `240` product cards into one dynamic response while silently leaving the remaining products to search and sitemap discovery.

- Response body: `690555` bytes.
- Ten sequential production requests: `1.40-5.83s`, with a typical request around `2.2-3.2s`.
- An earlier cold/swapped request reached about `13.2s`.
- Product pages were already fast; the category HTML and swap-in path were the main issue.

## Changes

- Added server-side pagination with `60` products per page in both grid and list views.
- Preserved filters, active filter removal, view switching, previous/next controls and direct access to every product.
- Paginated pages use canonical category metadata with `noindex,follow`; filtered pages remain `noindex,nofollow`.
- Replaced repeated full-catalog category filtering with a low-memory category-to-products index.
- Kept expensive optional indexes lazy after a staging heap test showed that eager materialization was unsafe under `384 MiB`.
- Set the production Node heap ceiling to `320 MiB` inside the existing `384 MiB` cgroup limit.
- Added `pumbum-store-warmup.service` and `.timer`: one low-priority request per minute through local HTTPS nginx, `32M` service cap, no cache and no shared CSP nonce.
- Added `catalog:check-pagination`, which walks every page and rejects missing or duplicate product links.

## Verification

- Image: `plumbing_store_v2-v2:perf-20260711-v4`.
- Build, lint, strict TypeScript, ESPA validation and isolation checks: passed.
- Catalog remains `9276`; sitemap remains `9289` URLs with exactly `68` ESPA routes.
- Heavy category contains `1366` products across `23` pages; automated public traversal found all `1366` exactly once.
- First `22` pages contain `60` cards; the final page contains `46`.
- List view page contains `60` rows.
- Paginated response size: `170203-240565` bytes, down by roughly `65-75%` from the old first-page response.
- Public traversal from the USA checker: p50 `408ms`, max `1141ms` across all `23` pages.
- Post-warmup production sequence: p50 about `0.2s`, p95 about `1.03s`, max about `1.04s`.
- Staging concurrency check: `100/100` heavy-category responses returned `200`; p50 `2.32s`, p95 `3.12s`, max `4.05s` at concurrency `5` and CPU limit `0.75`.
- Browser checks: page 1, page 2 and page 23; correct ranges, active page, `noindex,follow`, no broken production images, no horizontal overflow and no console errors.
- CSP runtime check still passes with rotating nonces, no `unsafe-inline`/`unsafe-eval` and report endpoint `204`.
- Production container: OOM false, restart count zero, read-only rootfs, localhost-only `127.0.0.1:3013`, `384 MiB` memory limit.
- No nginx 5xx was recorded after cutover.

## Deployment and rollback

- Active upstream: `127.0.0.1:3013`.
- Previous CSP container is stopped on `127.0.0.1:3012` and remains the nginx backup target when restarted.
- Backup: `/opt/plumbing_store_v2/deploy-backups/perf-20260711-precutover`.
- Rollback image: `plumbing_store_v2-v2:rollback-pre-perf-20260711`.
- Previous compose: `/opt/plumbing_store_v2/deploy/docker-compose.bluegreen-csp-20260711.yml`.

Rollback procedure:

1. Start the previous CSP container and wait for `http://127.0.0.1:3012/api/health` to report `9276` products.
2. Restore the backed-up `plumbing_store.conf`.
3. Run `nginx -t`, reload nginx and verify public health and a category page.
4. Stop the performance container only after the public rollback succeeds.

## Residual capacity risk

The application cgroup can still hold swapped anonymous pages because the host has only `1 GiB` RAM and also runs VPN services. The warmup timer prevents that page-in cost from reaching the first normal category visitor in steady operation, but a larger VPS remains the durable way to add concurrency and eliminate host-level memory pressure.
