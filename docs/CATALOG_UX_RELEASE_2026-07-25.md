# Catalog UX release — 2026-07-25

## Scope

- All ten category showcases use a three-item carousel with representatives of three distinct buyer groups.
- Carousel copy and media areas have stable dimensions, so the page below the carousel does not jump between slides.
- Autoplay is exactly five seconds. The only visible controls are three round slide dots; the pause action remains available to screen readers. Keyboard focus, hidden tabs and `prefers-reduced-motion` pause motion safely.
- All 30 showcase images are 1100×825, contain useful transparency and were visually reviewed together. The low-resolution hydroaccumulator and reinforced tape were removed.
- Manufacturer group labels are real links that open the selected manufacturer with the matching group filter. Cards have consistent alignment and spacing.
- Manufacturer pages no longer repeat the manufacturer eyebrow/logo. Products are ordered by retail importance and support collection search, group navigation, filters, price sorting and grid/list views.
- Buyer-task and buyer-subcategory pages use the same collection navigation. Stateful result URLs are `noindex,follow`.
- Static manufacturer collections, default facets, price order and group summaries are cached in process memory. This avoids repeatedly scanning and sorting the immutable 9,276-product catalog on every request.
- Yandex Metrika keeps counter `109783471` and all five approved goals. CSP now permits the official `wss://mc.yandex.com` telemetry endpoint without relaxing `script-src` or allowing inline script attributes.
- Dependency overrides pin patched `brace-expansion` and `postcss` versions; the release audit has zero known vulnerabilities.

No product rows, prices, category assignments, source product-card images or
catalog routes were removed. The display-only carousel image overrides live in
`public/images/category-showcase/`.

## Showcase image acceptance

- Categories: 10.
- Slides: 30.
- Buyer groups per category: 3 distinct groups.
- Source dimensions: 1100×825 for every slide.
- Transparency: `hasUsefulAlpha=true` for all 30 images.
- Generated/restored display-only assets:
  - `tim-bad478002gy-detail.png`
  - `tim-bas0260ba-detail.png`
  - `tim-bas0802s-detail.png`
  - `tim-cl5002bk-detail.png`
  - `tim-p20-2-detail.png`
  - `tim-ptfe-tape-detail.png`
  - `zeisler-zsr25015002-detail.png`

The restoration prompts required exact product type and geometry, a 4:3
catalog composition, no labels/watermarks/source artifacts, no invented
accessories, and a clean transparent background. Chroma-key intermediate
backgrounds were removed before the final 1100×825 PNG assets were accepted.

## Verification

- `npm run lint`: passed.
- `npm run check:isolation`: passed.
- `npm run analytics:check`: passed.
- `npm audit --audit-level=moderate`: `0 vulnerabilities`.
- Production Docker build: passed on `administrator@100.95.56.90`; no build ran on production.
- Public carousel browser check: 10 categories, three products/groups each, 5,000 ms autoplay, stable height, 32 px dot targets and no page errors.
- Public collection browser check: nine manufacturer cards, clickable group tags, manufacturer/task controls and `noindex,follow` state pages.
- Public Metrika browser check: one initial hit, one SPA hit, all five goals and no raw search text.
- Public CSP check: enforcing policy, rotating nonce, no inline style attributes and report endpoint `204`; `wss://mc.yandex.com` is present only in `connect-src`.
- Public taxonomy: 9,276 products, 10 categories, 9,354 sitemap URLs, 45 buyer subcategories, six buyer tasks and nine manufacturers.
- Legacy path coverage: 1,730 unchanged product paths, 7,546 permanent moved-path redirects, zero missing and zero ambiguous.
- Heavy-category pagination: 3,379 unique products across 57 pages, 60 list rows, p50 385 ms and max 1,134 ms.
- Staging load at the production container limits:
  - VALTEC, concurrency 3: 9/9 HTTP 200, p95 2,226 ms.
  - Heavy pipes category, concurrency 3: 9/9 HTTP 200, p95 2,388 ms.
  - No OOM and no restart.
- Warm public latency after cutover:
  - manufacturers index: 0.82–1.07 s;
  - VALTEC: 1.11–1.24 s;
  - sorted VALTEC list: 1.02–1.19 s;
  - heavy pipes category: 1.12–1.53 s.
- Monitoring after cutover: `/api/health` 0.49 s, `/` 0.76 s, `/catalog` 0.77 s, all probes successful and no firing Prometheus alerts.
- Final cutover produced zero `5xx` responses.

## Production

- Active image: `plumbing_store_v2-v2:catalog-ux-20260725-v3`.
- Docker archive SHA-256: `c5deac5ef6f4fc9a73d001a29fc2b694a6cd1aabc62647f20d5bde2d8f2665fa`.
- Active loopback port: `3026`.
- Nginx upstream: `3026` primary, `3025` backup.
- Container security: `node` user, read-only root filesystem, all capabilities dropped, `no-new-privileges`, loopback-only binding, 384 MiB memory, 0.75 CPU and 256 PID limits.
- Accepted state: healthy, zero restarts, OOM false, 9,276 published products and 10 categories.
- Previous accepted v2 image/container is stopped on `3025`, not removed. The earlier v1 container is also retained stopped on `3024`.

The host cannot sustain two Next.js containers for long: overlap causes swap
and I/O pressure. Deployment therefore warms the candidate, reloads nginx,
allows 15 seconds for old keep-alive workers to drain, then stops the previous
container. This keeps the rollback point without leaving two storefronts
running.

## Rollback

1. Start `plumbing_store_v2_catalog_ux_cache_20260725-v2-catalog-ux-cache-1`.
2. Confirm `http://127.0.0.1:3025/api/health` returns 9,276 products and 10 categories.
3. Restore `/etc/nginx/plumbing_store.conf.rollback-20260725-3025-v2` to `/etc/nginx/sites-enabled/plumbing_store.conf`.
4. Run `sudo nginx -t`, reload nginx and keep 3026 running for at least 15 seconds while old keep-alive workers drain.
5. Re-run public health, collection, carousel, CSP and Metrika checks before stopping 3026.
