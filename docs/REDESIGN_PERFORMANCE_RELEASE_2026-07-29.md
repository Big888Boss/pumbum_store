# Redesign performance release — 2026-07-29

## Scope

This is a staging-only performance release of the isolated high-end redesign.
It does not change the production storefront. Product data, prices, taxonomy,
search, routes, image override maps, page mascots, carousel behavior, and
indexing boundary remain unchanged.

## Changes

- Removed the delayed above-the-fold entry animation so the hero can paint
  immediately.
- Replaced the continuously animated background-position shimmer with a static
  low-opacity placeholder state.
- Converted the selected category-showcase and carousel PNG assets to WebP with
  a deterministic Sharp script. Original PNG assets remain available.
- Updated the public read-only gate cache policy:
  - HTML and APIs: `no-store`;
  - hashed `/_next/static/` assets: one year, immutable;
  - public images, icons, fonts, and brand assets: 30 days plus stale revalidation.
- Allowed the CSP report endpoint through the public read-only gate while all
  other write requests remain blocked.
- Updated runtime dependency overrides and verified zero npm audit findings.

## Artifact and rollback

- Active build ID: `ntJzITqB6mFDEfk1uCyWy`
- Active service: `pumbum-redesign-preview-image-recovery.service`
- Active app: `127.0.0.1:3025`
- Tailnet review gate: `100.95.56.90:3027`
- Public read-only gate: `127.0.0.1:3028`
- Previous build backup:
  `/home/administrator/backups/pumbum-redesign/performance-20260729/.next-YGRfpAanulE_-XUt-qG2P`

Rollback is an atomic `.next` directory swap followed by a restart of the app
and both gates. Do not remove the backup during the review period.

## Verification

- Health: 9,276 published products and 10 categories.
- Taxonomy: 9,276 products, 45 subcategories, 6 task collections, 9
  manufacturers, 60 navigation routes, and 9,354 sitemap URLs.
- Legacy redirects: 7,546 moved routes covered; zero missing and zero ambiguous.
- CSP: rotating nonce, no inline style regression, report endpoint `204`.
- Load: 30/30 requests passed at concurrency 3; p50 30 ms, p95 53 ms, max 131 ms
  on the isolated candidate.
- Browser QA: desktop 1280×720 and mobile 390×844 passed for theme, navigation,
  catalog, search, product/contact actions, tabs, scroll reveals, mascots,
  pagination anchor, carousel, and overflow.
- All ten category carousels passed content, controls, and autoplay checks.
- `npm audit`, lint, TypeScript, isolation, and analytics checks passed.
- Public Cloudflare and Tailnet review paths both returned `200` after cutover.
- Service restarts: 0; OOM: none; factory memory PSI remained zero during build.

## Image savings

- Category showcase: 1,895,996 bytes PNG to 240,976 bytes WebP, about 87.3%
  smaller.
- Selected carousel images: 1,124,182 bytes PNG to 190,894 bytes WebP, about
  83.0% smaller.

The versioned transparent-product stores and all source-recovery reports remain
outside Git and unchanged.
