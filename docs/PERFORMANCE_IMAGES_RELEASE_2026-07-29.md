# Production performance and recovered-image release — 2026-07-29

## Scope and invariants

This release applies the shared performance work and the accepted transparent,
source-recovered product images to the existing production storefront. It does
not change product data, prices, taxonomy, search semantics, routes, analytics,
contact actions, robots policy, sitemap membership, or visual product ordering.

Verified invariants:

- 9,276 total and published products;
- 10 categories;
- 9,354 sitemap URLs;
- representative home, catalog, manufacturers, category, product, search,
  contacts, delivery, privacy, robots, sitemap, and health routes pass;
- legacy category/product paths keep their existing redirects and resolve to
  successful canonical pages.

## Changes

- Added the checked image override map and mounted the existing versioned
  transparent derivative stores into production.
- Added 2,916 v1 and 638 v2 transparent WebP files. Originals and previous
  catalog images remain unchanged.
- Converted the selected category showcase and TIM carousel assets to WebP;
  their PNG originals remain in the source tree.
- Changed the store logo on the production header and home page to the WebP
  derivative.
- Added an isolated supplier-logo layer and responsive top/right safe zone so a
  product cannot cover its supplier badge.
- Preserved production cache behavior: hashed Next.js assets are immutable,
  product/public images use the existing 30-day cache, and HTML/API responses
  remain dynamic.
- Removed runtime npm/npx from the standalone image, eliminating the vulnerable
  package-manager dependency tree that is not needed to run the service.

## Build and security

- Build host: USA/factory server only.
- Production ran no `next build`, `npm install`, or `docker build`.
- Image: `plumbing_store_v2-v2:performance-images-20260729-v3`
- Compressed transport artifact: 88 MiB.
- Artifact SHA-256:
  `f6609fe190ce22811552f05cc7d0794b4a24c358d12231b9179a45dc387fa142`
- Transparent asset archive SHA-256:
  `2513ed50487b1b70f9745d056f39ef8da8d7694edce1f25a6a849d31a51cc91b`
- Source update archive SHA-256:
  `03b60aec1cfe97d72cd1975e5ffe4877f4a8f38d29709e2c273be51323f52578`
- Production dependency audit: zero findings.
- Final Trivy image scan: zero HIGH/CRITICAL vulnerabilities and zero detected
  secrets.
- Runtime remains read-only, drops all Linux capabilities, uses
  `no-new-privileges`, binds only to loopback, and keeps the 384 MiB/0.75 CPU
  limit.

## Image savings

- Production category showcase: 4,970,238 bytes PNG to 515,154 bytes WebP,
  about 89.6% smaller.
- Store logo: 145,036 bytes PNG to 60,334 bytes WebP, about 58.4% smaller.
- All original PNG and source-recovery stores are retained.

## Deployment

- Active compose:
  `<deploy-root>/deploy/docker-compose.performance-images-20260729.yml`
- Active container:
  `plumbing_store_v2_performance_images_20260729-v2-performance-images-1`
- Active loopback port: `3027`
- Nginx primary: `127.0.0.1:3027`
- Nginx backup: `127.0.0.1:3026`
- Previous container:
  `plumbing_store_v2_catalog_ux_csp_20260725-v2-catalog-ux-csp-1` (stopped,
  retained)
- Backups:
  `<deploy-root>/backups/performance-images-20260729`

The candidate was warmed and verified before nginx reload. Running both Next.js
containers temporarily increased memory pressure, so the previous container was
stopped immediately after the public cutover. The new container then stabilized
without OOM or restart and public health remained successful.

## Verification

- Candidate route matrix, health, redirects, sitemap count, WebP logo,
  category-showcase asset, and v2 transparent-product sample passed.
- Factory taxonomy and redirect suites passed with zero missing or ambiguous
  routes.
- Factory load test: 30/30 requests, p50 41 ms, p95 78 ms, max 97 ms.
- Warm production loopback search samples: 0.536 s, 2.979 s, 0.536 s.
- Public browser-like home, catalog, manufacturers, search, contacts, delivery,
  privacy, robots, sitemap, health, and image requests returned successful
  responses. Bot-like catalog requests without normal locale/browser headers
  may still be rejected by the existing request boundary; this is unchanged.
- New container: healthy, zero restarts, OOM false.
- Nginx configuration test passed before reload.
- Old image/container and previous upstream config remain recoverable.

## Rollback

1. Start the previous compose:

   `cd <deploy-root> && docker compose -f deploy/docker-compose.bluegreen-catalog-ux-csp-20260725.yml up -d`

2. Verify `127.0.0.1:3026/api/health`.
3. Restore
   `<deploy-root>/backups/performance-images-20260729/plumbing_store.conf.pre-performance-images`
   to `/etc/nginx/sites-enabled/plumbing_store.conf`.
4. Run `sudo nginx -t` and reload nginx.
5. Stop the performance-images compose only after public rollback verification.

Transparent stores and WebP files may remain on disk during runtime rollback;
the old image does not reference them. Source rollback uses
`source-files-pre-performance-images.tar` plus the recorded new-file manifest.
