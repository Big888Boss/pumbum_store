# Task #130 DAG autofix iteration 1

Role: dag-autofix-1

## Diagnosis from latest review

The read-only review accepted the V2 implementation structurally, but identified four concrete release gaps:

1. Product images still referenced SVG placeholder assets under `public/images/generated-placeholders/` instead of realistic product photos.
2. Radiator and mixer categories still used fallback pilot SKUs instead of supplier-backed catalog products.
3. The VIVALDO brand logo was not available in the V2 public logo set for a supplier-backed radiator-related product.
4. UI overlay behavior had not been verified; mobile overlay sizing could clash with product photos.

## Fixes applied

- Replaced all six V2 catalog image references from generated-placeholder SVGs to existing realistic product/supplier image assets under `/images/products/...`.
- Upgraded the radiator fallback from `legacy-3`/generic to supplier-backed VIVALDO `STRV-CR` (Комплект подключения радиатора термостатический прямой 1/2", хром) sourced from `legacy_src/data/vivaldo/catalog.json`.
- Upgraded the mixer fallback from `legacy-5`/generic to supplier-backed VALTEC `VT.MR02.N` (трёхходовой смесительный клапан) sourced from `legacy_src/data/valtec/catalog.json`.
- Added `vivaldo` to the V2 `BrandId` union and copied the existing VIVALDO logo into `new-store-v2/public/brand-logos/vivaldo.png` for CSS/HTML overlay use.
- Tightened mobile overlay CSS so `.logo-overlay` is smaller on narrow screens and product photos retain padding, reducing overlay/photo collision risk.

## Verification evidence

Command run from `new-store-v2`:

```bash
npm run lint && npm run check:isolation && npm run build
```

Result: exit code 0.

Observed outputs:

- ESLint completed without errors.
- Isolation check printed: `OK: v2 source has no direct legacy_src imports. Legacy data must be ingested through copy/normalization scripts only.`
- Next.js 15.5.18 production build compiled successfully, type-checked, generated static pages `(20/20)`, and listed V2 routes for `/`, `/about`, `/catalog`, category SSG pages, PDP SSG pages, `/contacts`, and `/delivery`.

Targeted post-check output:

- `placeholderSvgRefs 0`
- `fallbackSources 1` (remaining occurrence is the allowed source type literal, not an active product source value)
- `vivaldo-strv-cr true`
- `valtec-vt-mr02-n true`
- `/brand-logos/vivaldo.png true`
- `/brand-logos/valtec.svg true`
- `vivaldoLogoExists true`
- `mobileOverlayRules true`

## Files changed

- `new-store-v2/src/data/v2-catalog.ts`
- `new-store-v2/src/app/globals.css`
- `new-store-v2/public/brand-logos/vivaldo.png`
- `new-store-v2/docs/TASK130_DAG_AUTOFIX_1_LEDGER.md`

## Remaining risks

- The replacement images are real existing supplier/product image assets, not newly generated photo files from an image model. They resolve the placeholder SVG issue without embedding logos, but final marketing-grade regenerated photos may still be a later creative asset task.
- UI overlay was verified by code/static build checks, not by a live browser screenshot in this worker pass.
