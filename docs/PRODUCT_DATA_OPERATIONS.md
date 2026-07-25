# Product and image operations

## Current production reality

- Public `477477.ru` currently runs the legacy storefront.
- Live legacy admin is not the reliable product-management path for V2.
- V2 must not edit legacy data directly. Legacy/source data is read-only input.

## How V2 products are added now

1. Update the supplier source through an approved sync/import script in the parent project.
2. Rebuild the normalized V2 artifact:

```bash
LEGACY_CATALOG_SOURCE=/home/administrator/agent-projects/pumbum-store \
LEGACY_CATALOG_GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
npm run catalog:import-legacy
```

3. Verify the generated artifact:

```bash
npm run seo:inventory
npm run lint
npm run build
```

4. Deploy V2 only after checking `/catalog`, `/search`, product URLs and `/sitemap.xml`.

## Supplier normalization

Every generated runtime product must have a concrete source supplier, even when the
visible product family photo is shared across several SKUs. Run this after legacy
catalog import when supplier fields are missing or when a new supplier connector is
added:

```bash
npm run catalog:normalize-suppliers
```

The script updates `content/generated/legacy-catalog.json`, writes a backup and
produces CSV/JSON reports under `.asset-store/reports/`.

2026-07-07 supplier normalization result:

- 5700 total products.
- 5700 products have `supplier`, `supplierName` and `specs["Поставщик"]`.
- 0 unresolved products.
- Supplier counts: VALTEC 4410, SINIKON 649, AQUARIO 282, Гидроконтракт 178, АКВАТЕК 75, VIVALDO 73, ZOTA 33.

For shared family photos, product pages and catalog rows must expose distinguishing
facts such as article, diameters, angle, thread, size, power, volume or material.
Do not treat shared photos as an error when the supplier only publishes a family
image; instead make the SKU differences clear in text and specs.

## TIM supplier status

TIM was imported on 2026-07-08 from the supplier price/catalog processing flow:

- 3508 runtime products;
- supplier and brand normalized to `tim`;
- price and source metadata retained in each product;
- TIM products are part of the current `9276`-product production baseline.

Do not rebuild the current site from the old `5700`-product legacy artifact. The
authoritative rebuild baseline is the `9276`-product generated catalog containing
the TIM and ESPA imports.

## ESPA supplier import

The ESPA import added on 2026-07-10 is replayable:

```bash
npm run catalog:import-espa
npm run catalog:validate-espa
```

Normalized source:

- `content/sources/espa/catalog.json`;
- 32 numeric articles from Telegram document `Наша Гамма Espa` are marked
  `in_stock`;
- 36 official export products in DRAIN, DRAINEX, DRAINCOR and VIGILA are marked
  `preorder`;
- prices are intentionally absent and the UI displays `Цена по запросу`;
- the UI displays `В наличии` or `Под заказ` from verified availability data;
- official images are stored at `public/images/products/espa/<article>.webp`;
- the generic source row `Насосная станция ESPA` with article `ESPA` is
  recorded in the source audit but is not imported as a fabricated product.

The import removes prior ESPA rows before appending the current normalized source,
checks article collisions, updates supplier statistics and normalizes duplicate
internal product IDs without changing product routes.

## Do not do this

- Do not manually patch `content/generated/legacy-catalog.json` as the normal workflow.
- Do not commit real leads, `.env`, admin users, tokens, or private data.
- Do not commit the full legacy `public/images/products` directory into V2 git.

## Image strategy

Good long-term storage:

- product image files in a controlled object store or mounted server directory;
- normalized image references in product data;
- stable public paths like `/images/products/<supplier>/<article>.webp`;
- source metadata retained separately: supplier URL, download date, license/usage note;
- generated thumbnails/WebP variants built by script, not manually edited.

This keeps product data separate from page layout. If the site design changes later, the same product records and image paths can be rendered by new components without redoing the source import.

## Current V2 image workflow

1. Archive the current server image tree before a normalization run:

```bash
mkdir -p .asset-store/legacy-products-2026-07-02
rsync -a --ignore-existing ../public/images/products/ .asset-store/legacy-products-2026-07-02/
```

2. Audit image quality and current references:

```bash
npm run images:audit -- --public-root ../public --output-dir .asset-store/reports
```

3. Generate normalized WebP variants and manifest:

```bash
npm run images:normalize -- \
  --public-root ../public \
  --output-root ../public/images/products/_normalized-v2 \
  --manifest content/generated/product-image-manifest.json \
  --report-dir .asset-store/reports
```

4. Rebuild V2 so the generated manifest is included in the app bundle.

The manifest is the switchboard. Product JSON stays stable, while UI components can render either normalized card images or detail images.

For supplier-specific repairs, prefer exact source connectors over manual manifest edits:

- SINIKON article page: `npm run images:apply-sinikon-source -- --dry-run --no-default-seeds --page-url <official product url> --sku <article>`.
- АКВАТЕК model card: `npm run images:apply-aquatec-source -- --dry-run --sku "<model>"`.

After `dry-run` matches the expected product and source image, rerun without `--dry-run`.

## Minimum image quality rules

- Main image: real product image, not a stretched thumbnail.
- Prefer 800-1200px on the long side for catalog/product pages.
- Convert heavy source files to optimized WebP where possible.
- Keep original source URL/provenance.
- If an image is missing, render a clear fallback and keep the item in the image-quality report.

## Future admin path

The clean production path is not editing JSON by hand. It is:

- source imports for bulk supplier updates;
- small admin UI for manual overrides: title, description, category override, image override, visibility;
- audit log for who changed what;
- backup/restore for overrides and leads.
