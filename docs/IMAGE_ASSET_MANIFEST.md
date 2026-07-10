# V2 image asset manifest

All files below live inside `new-store-v2/public` and are isolated from Legacy.

## Brand logos for overlay
- `/brand-logos/valtec.svg` — copied from existing public assets.
- `/brand-logos/aquario.svg` — copied from existing public assets.
- `/brand-logos/zota.svg` — copied from existing main-category asset when no dedicated brand logo was present.

## Generated/mock placeholders
These SVGs are intentionally logo-free. V2 must render logos as a separate CSS/HTML overlay to avoid AI-generated text/logo artifacts.

- `/images/generated-placeholders/pipes-valtec-v2020-080.svg`
- `/images/generated-placeholders/valves-valtec-vt4410-ne16.svg`
- `/images/generated-placeholders/pumps-aquario-adb35.svg`
- `/images/generated-placeholders/boilers-zota-zuma.svg`
- `/images/generated-placeholders/radiators-generic.svg`
- `/images/generated-placeholders/mixers-generic.svg`

## Runtime legacy product assets

Generated catalog products now point to real imported images:

- `/images/products/**` — legacy-local product assets from the Legacy runtime/public tree.
- `https://aquario.ru/**`, `https://gidrokontrakt.ru/**`, `https://valtec.ru/**`, `https://zota.ru/**` — supplier-hosted images allowed by `next.config.mjs`.

Current generated catalog image references:

- 5700 total products.
- 5240 `/images/products/**` local legacy asset references.
- 460 external supplier image URLs.
- 0 generated placeholder references.

Do not commit the full legacy `/public/images/products` tree into this repo. On VPS deployment, mount or synchronize that directory into the V2 container at `/app/public/images/products` read-only.

## Normalized product image pipeline

V2 now supports a generated image manifest:

- `content/generated/product-image-manifest.json` maps `categorySlug/slug` to normalized product images.
- `scripts/audit-product-images.mjs` writes `image-audit-before.json` and `image-audit-before.csv`.
- `scripts/normalize-product-images.mjs` reads the generated catalog, normalizes current supplier/legacy images to WebP variants and writes `missing-product-images.csv`.
- `scripts/apply-sinikon-source-images.mjs` pulls exact product images from official `sinikon.ru` product pages by article.
- `scripts/apply-aquatec-source-images.mjs` pulls exact АКВАТЕК model images from official `aq-plastic.ru` catalog cards by SKU/model name.
- `scripts/repair-product-image-manifest-suppliers.mjs` repairs manifest supplier labels from generated product source refs, without changing images.

2026-07-06 АКВАТЕК production batch:

- Source: official `aq-plastic.ru` catalog cards and official family/detail pages.
- Result: 75/75 АКВАТЕК products mapped to `aquatec-source-card`.
- Exact product-card images: 26.
- Official family images: 49. These are intentionally marked `family-image`, not exact SKU photos, because the supplier site does not expose a separate exact card for every local SKU/volume.
- Generated assets: 138 WebP files under `/images/products/_normalized-v2/aquatec/`.
- Production image deployed as V2 after smoke checks; rollback image tag on production: `plumbing_store_v2-v2:pre-aquatec-photo-20260706c`.

2026-07-08 АКВАТЕК manifest remap:

- Scope: 75 АКВАТЕК products already present in production.
- No new source images were downloaded during the production remap.
- Existing normalized WebP files under `/images/products/_normalized-v2/aquatec/` were matched by SKU/model and reused.
- 74 manifest image entries were changed away from the old shared `d24e6e7...` family files.
- Remaining АКВАТЕК entries no longer reference the old shared `d24e6e7...` files after the remap check.
- Старые WebP файлы не удалялись; rollback возможен через backup manifest.

Default public output is:

- `/images/products/_normalized-v2/<supplier>/<hash>-detail.webp` for product pages.
- `/images/products/_normalized-v2/<supplier>/<hash>-card.webp` for catalog cards.

Supplier source image repair examples:

```bash
npm run images:apply-sinikon-source -- \
  --page-url https://sinikon.ru/catalog/aksialnye-latunnye-fitingi/vodorozetka-prokhodnaya/ \
  --sku FA161801

npm run images:apply-aquatec-source -- --sku "ATV 5000"
npm run images:repair-manifest-suppliers
```

Use `--dry-run` first when adding a new supplier page or batch. Use `--no-default-seeds` with the SINIKON connector for single-page checks.

Operational server rule:

- Before replacing or pruning any old product image tree, copy the current product images into `.asset-store/legacy-products-<date>/`.
- `.asset-store/` is non-public and excluded from Docker context/git; it is for rollback and migration only.
- Do not delete old photos during normalization unless a later explicit cleanup task approves it.

## Extension and size audit

2026-07-07 local V2 source audit:

- 175 public image files, about 4.38 MB total.
- 166 WebP files, about 4.18 MB.
- 2 PNG files, about 168 KB.
- 1 JPG file, about 15 KB.
- 5 SVG files, about 11 KB.

2026-07-07 production `/opt/plumbing_store_v2/public` audit:

- JPG: 74 files, about 28.04 MB.
- JPEG: 24 files, about 0.58 MB.
- PNG: 454 files, about 267.16 MB.
- WebP: 3417 files, about 106.08 MB.
- GIF: 1 file, about 0.01 MB.
- SVG: 2 files, negligible size.

The main storage waste is production PNG, especially large AQUARIO mirror/source
images. A confirmed PNG/JPG -> WebP conversion batch should be done only after:

1. copying the current image tree into non-public `.asset-store`;
2. generating WebP files beside the originals or under `_normalized-v2`;
3. updating the manifest/references atomically;
4. checking product image 404s and visual samples;
5. keeping rollback originals until the owner approves cleanup.

Expected space saving is material, but it depends on quality settings and alpha
channel preservation. Do not run this conversion without explicit approval.

2026-07-07 lossless runtime WebP batch:

- Scope: only runtime-referenced `/images/products/**` PNG/JPG/JPEG files from `legacy-catalog.json` and `product-image-manifest.json`.
- Conversion mode: WebP `lossless`, switched references only when the WebP file was smaller than the source.
- Runtime refs checked: 1061 non-WebP references before conversion.
- Converted files: 119.
- Skipped because lossless WebP was not smaller: 941.
- Bad source image skipped: 1 (`unsupported image format`).
- Source bytes for converted files: 32.99 MB.
- WebP bytes for converted files: 25.44 MB.
- Runtime traffic saving: about 7.55 MB across the affected image set.
- Tar prepared on factory: `webp-converted-runtime-files-20260707.tgz`.

This is intentionally conservative: it avoids visible quality loss and does not
force lossy WebP for JPEGs that do not shrink in lossless mode.
