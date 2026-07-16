# Brand, SEO, performance and production-safety release 2026-07-16

Scope: finish the code-controlled parts of iterations 1-6 without regenerating or replacing the production catalog. The catalog data, ordering state, public exposure and existing product image mount remain unchanged.

## Catalog preservation gate

- `legacy-catalog.json`: 9,276 products, SHA-256 `db9d46be7ec1a2266463e94e37134ec784b79b8cae3b6042d428d8108405eb57`;
- `product-image-manifest.json`: SHA-256 `c1b2dd3e9e8a4bd103d7f39fbabef08f792093fed4969c8302b78b9e1e939e5a`;
- sitemap: 9,289 URLs;
- the image keeps `public/images/products` outside the Docker context and reuses the existing production read-only bind mount.

## Changes

1. Site icons: the blue drop mark was extracted from the production logo. New files: src/app/favicon.ico (16/32/48), src/app/icon.png (512), src/app/apple-icon.png (180), public/icons/icon-192.png, public/icons/icon-512.png. Next.js serves /favicon.ico and emits the icon link tags automatically.
2. Web manifest: src/app/manifest.ts served at /manifest.webmanifest with brand colors (#0f6fd8) and the 192/512 icons. Display mode stays browser; no service worker or PWA scope.
3. Default OG image: public/og/default-og.jpg (1200x630, logo + Saratov line + phone). buildMetadata now falls back to it whenever a page passes no images, so the home and static pages get og:image and a valid twitter summary_large_image. Product pages keep their real product image.
4. Store JSON-LD: added hasMap (Yandex Maps point for the shop) and priceRange to the LocalBusiness/Store block. On 2026-07-17, `sameAs` was completed with the exact Yandex Maps and 2GIS organization pages after both were verified against the shop name, Saratov address, phone, opening hours and website.
5. Cyrillic image-path fix: 202 normalized image paths (aquatec, sinikon, valtec) contain raw Cyrillic file names. Rendering such a product page made React fail to emit the image preload Link header: TypeError Cannot convert argument to a ByteString (3 occurrences in the pre-release production log on 2026-07-16, reproduced deterministically on /catalog/otoplenie-i-kotelnaya/grace-tp10025323). getProductImage now percent-encodes non-ASCII paths via encodeURI, which fixes the Link header, the og:image URL and the Product JSON-LD image URL at once. Nginx decodes the encoded URL back to the UTF-8 file name and serves the same file.
6. Performance: Lighthouse identified Yandex Metrika `tag.js` as the dominant mobile long task. The loader now starts four seconds after `window.load`; pageviews and goals queue until initialization. The browser contract still verifies one initial hit, one SPA hit and all five approved goals. Public Lighthouse 13 results after warmup: home mobile 95; category mobile 87/93/92 (median 92); product mobile final three 89/96/93 (median 93); desktop 99-100. CLS is 0 on every run. Category median LCP remains about 2.72 seconds on the 0.75-CPU container and is documented rather than hidden.
7. Category content: all six public purpose categories now render the maintained `seoText` and `buyingGuide` plus a factual Saratov pickup note. `scripts/check_text.py` validates the six public and six pilot category records without network calls or AI generation.
8. Repeatable audit: `scripts/pagespeed.py` stores official PSI v5 JSON when `PAGESPEED_API_KEY` is supplied; `scripts/monthly-production-audit.sh` performs route and PSI checks. The unauthenticated PSI endpoint returned HTTP 429 during this release, so no score is invented.
9. Container safety: the blue-green compose keeps a read-only rootfs, non-root user, all capabilities dropped, `no-new-privileges`, loopback-only publication, 384 MiB memory, 0.75 CPU and 256 PIDs. It adds a real `/api/health` healthcheck and a 90-second start period for the intentionally CPU-capped 39 MB catalog cold start.
10. Nginx Brotli is an external production config: Ubuntu dynamic filter/static modules, level 5, gzip fallback. It is validated with `nginx -t` and `Content-Encoding: br`; the config remains outside Git at `/etc/nginx/conf.d/pumbum-brotli.conf`.

## Intentionally unresolved external items

- Yandex Business, Google Business, Webmaster and Search Console require owner account access and cannot be confirmed from code.
- PSI scheduling needs a Google API key; CrUX needs about 28 days of real traffic.
- Prometheus Blackbox probes `/`, `/api/health`, `/catalog` and `/sitemap.xml`. Grafana now evaluates endpoint-down, slow-endpoint and TLS-expiry rules on the USA monitoring host. Telegram delivery still requires a rotated bot token and a chat that has started the bot; secrets must not be committed or pasted into chat.
- Moving the storefront to a separate 2 vCPU / 2 GiB VPS is a budget decision. Until then, production builds remain forbidden and the 384 MiB/0.75 CPU limits plus warmup timer stay in force.
- TIM manifest status is unchanged: 3,508 products, 2,381 direct/existing mappings, 278 subsection fallbacks and 849 section fallbacks. Reducing `fallbackBySection` below 400 requires new supplier images; generated substitutes are not treated as unique product photos.
- Product Offers remain conservative: unknown stock is omitted and no price/availability is invented. ESPA preorder semantics are only emitted when the source data contains the required truthful offer fields.

## Verification gates

- lint, strict TypeScript, category text check and production build pass on the USA build host;
- pagination exposes all 1,366 products in the checked category across 23 pages with no duplicates;
- CSP enforce/nonce rotation, Metrika browser contract and Docker healthcheck pass;
- the new container starts on 127.0.0.1:3016 with the same read-only rootfs, cap-drop, 384m limit;
- public checks after cutover passed: /favicon.ico and /manifest.webmanifest return 200, home og:image is present, grace-tp10025323 emits a Link preload header with the percent-encoded image, the referenced WebP returns 200, no new ByteString entries appear in the container log, /api/health reports 9,276 products, sitemap contains 9,289 URLs, Metrika counter and goals pass the public browser test;
- public Prometheus Blackbox `probe_success` is 1 for `/`, `/api/health`, `/catalog` and `/sitemap.xml`; recent nginx access logs contain no 5xx and the error log is empty;
- rollback: previous seo-mobile service keeps running on 127.0.0.1:3015.

## Production deployment

- Image: plumbing_store_v2-v2:sameas-20260717-v1 (built manually on the USA host from the current 71e0cef tree plus the verified identity-link change; no build ran on production).
- Compose: deploy/docker-compose.bluegreen-sameas-20260717.yml, service port 127.0.0.1:3017.
- Nginx upstream plumbing_store_v2_app: primary 3017, backup 3016 (previous brand-seo release).
- Pre-cutover nginx backup: /etc/nginx/backups/plumbing_store.conf.backup-20260717-sameas.
- The obsolete 3014 Metrika container was removed after its 46-hour rollback window; its image and compose file were retained.

## Rollback

Restore the nginx backup above, run `nginx -t`, reload nginx and verify public health against 3016. Do not remove the 3016 brand-seo container until the rollback window and checks are complete.
