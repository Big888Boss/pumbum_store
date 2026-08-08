# Category hero corrections — 2026-08-09

## Scope

This is a staging-only visual correction. Catalog data, product order, prices,
routes, search, filters, pagination, category videos and production
`477477.ru` are unchanged.

## Active release

- Build ID: `3DPRAiMccBM2DzAzrs_iA`.
- Service: `pumbum-redesign-preview-category-hero-corrections-20260809.service`.
- App binding: loopback `127.0.0.1:3025`.
- Tailnet gate: `100.95.56.90:3027`.
- Public gate: loopback `3028` behind the existing outbound-only read-only
  tunnel. It remains `noindex` and rejects `POST /api/leads` with `405`.
- Resource limits: `MemoryHigh=700M`, `MemoryMax=1G`, `CPUQuota=150%`.

## Visual corrections

| Category | Correction |
| --- | --- |
| Water supply | Teplovik moved right to the product-frame seam. |
| Filtration | Filtrych moved left. |
| Pumps | Naporych moved left. |
| Mixers and siphons | Smesevich moved right. |
| Installation fasteners | Krepych moved left; the low-quality mounting-rail image was replaced by a clean transparent derivative. |
| Pipes and fittings | Trubych now faces inward; the VALTEC pipe image was replaced by a clean transparent three-pipe derivative without grey/black artifacts. |
| Tools and consumables | Alcohol-free Krestovich now faces inward. |

Desktop-only offsets are scoped to `min-width: 1121px`. Tablet and phone keep
the existing top-peek composition and were independently verified.

## Assets

- `/images/mascots/pose-v5/trubych-peek-right-v5.webp`
- `/images/mascots/pose-v5/krestovich-peek-right-v5.webp`
- `/images/carousel-products/tim-zsr-2501-5002-clean-v2.webp`
- `/images/carousel-products/valtec-vtp-700-al25-clean-v4.webp`

The original product images remain recoverable. Runtime selection is explicit
in the catalog override map.

## Verification

- Lint and `npx tsc --noEmit`: passed.
- Isolated production build: passed; build peak was about `3.4G` under a `4G`
  hard limit and no memory PSI occurred.
- Focused browser matrix: seven categories by desktop `1280x847`, tablet
  `820x1180` and phone `390x844` — 21 states, no horizontal overflow or
  browser/runtime errors.
- Full browser regression: passed after activation.
- Catalog invariants: `9,276` products, ten categories, nine manufacturers,
  `9,354` sitemap URLs.
- Full `3,379`-product pagination, all carousels and all ten category videos:
  passed.
- CSP enforcement and nonce rotation: passed.
- Dependency audit: zero known production vulnerabilities.
- Bounded health load after activation: `60/60` HTTP 200, p50 `34ms`, p95
  `112ms`, max `275ms`.
- Active runtime after verification: zero restarts, about `447M` current and
  `457M` peak memory; host has about `12G` available RAM and zero memory PSI.
- SalesGame and funding stateful containers remained up and healthy.

## Rollback

The exact previously active build `lS3jNHYnNcDbUzn_QdkMC` is retained at:

`/home/administrator/backups/pumbum-redesign/category-hero-corrections-20260809/.next-lS3jNHYnNcDbUzn_QdkMC`

Rollback must stop the new staging unit, restore that directory as the active
`.next`, and restart the previous staging unit. Production is outside this
release boundary.
