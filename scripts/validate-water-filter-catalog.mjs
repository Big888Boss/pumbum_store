import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalog = read('content/generated/legacy-catalog.json');
const vrt = read('content/sources/vrt/price-2026-09-20.json');
const vrtPhotos = read('content/sources/vrt/photos.json');
const terra = read('content/sources/aquabright/offer-2026-06-19.json');
const terraPhotos = read('content/sources/aquabright/photos.json');
const health = read('content/generated/catalog-health.json');
const imported = catalog.products.filter((product) => /^water-(vrt|terra)-/.test(product.id));
const bySku = new Map(imported.map((product) => [product.sku, product]));

assert.equal(vrt.items.length, 51, 'VRT source row count');
assert.equal(terra.items.length, 235, 'unique Terra Water source row count');
assert.equal(terra.duplicateRows.length, 7, 'duplicate Terra Water row count');
assert.equal(imported.length, 286, 'imported product count');
assert.equal(bySku.size, imported.length, 'duplicate imported SKU');
assert.equal(catalog.products.length, 9562, 'full catalog count');
assert.equal(catalog.products.length - imported.length, 9276, 'legacy catalog count');

for (const [source, photoMap, prefix] of [
  [vrt.items, vrtPhotos, 'water-vrt-'],
  [terra.items, terraPhotos, 'water-terra-'],
]) {
  for (const row of source) {
    const sku = row.code ?? row.model;
    const product = bySku.get(sku);
    assert(product, `missing imported SKU ${sku}`);
    assert(product.id.startsWith(prefix), `wrong import group for ${sku}`);
    assert.equal(product.vendorCode, sku, `vendor code mismatch for ${sku}`);
    assert.equal(product.price?.amount ?? null, row.retailRub, `retail price mismatch for ${sku}`);
    assert.equal(product.price?.currency ?? null, row.retailRub === null ? null : 'RUB', `currency mismatch for ${sku}`);
    assert.equal(product.dataQuality.hasPrice, row.retailRub !== null, `price quality flag mismatch for ${sku}`);
    assert.equal(product.availability, 'unknown', `unverified availability for ${sku}`);
    assert.equal(product.dataQuality.hasAvailability, false, `availability quality flag mismatch for ${sku}`);
    assert(product.sourceRefs.some((ref) => ref.label.includes(`строка ${row.row}, колонка «Розница»`)), `retail provenance missing for ${sku}`);
    const photo = photoMap[sku];
    assert.equal(product.dataQuality.hasRealImage, Boolean(photo), `image quality flag mismatch for ${sku}`);
    assert.equal(product.dataQuality.publishInSitemap, Boolean(photo) && !(prefix === 'water-terra-' && row.row === 30), `sitemap flag mismatch for ${sku}`);
    if (photo) {
      assert.equal(product.image, photo.file, `image path mismatch for ${sku}`);
      assert(['exact', 'series'].includes(photo.kind), `unknown image evidence for ${sku}`);
      assert(/^https:\/\//.test(photo.sourceImageUrl), `photo source missing for ${sku}`);
      const imagePath = path.join(root, 'public', photo.file.replace(/^\//, ''));
      assert(fs.statSync(imagePath).size > 2_000, `missing or empty product image for ${sku}`);
    } else {
      assert.equal(product.image, '/images/generated-placeholders/catalog-product.svg', `unexpected image for ${sku}`);
      assert(product.dataQuality.notes.some((note) => note.includes('Фото конкретной модели')), `missing placeholder disclosure for ${sku}`);
    }
  }
}

const routes = new Set(catalog.products.map((product) => `${product.categorySlug}/${product.slug}`));
assert.equal(routes.size, catalog.products.length, 'duplicate catalog route');
assert.equal(imported.filter((product) => !product.price).length, 23, 'Terra Water blank retail prices');
assert.equal(imported.filter((product) => product.dataQuality.hasRealImage).length, 257, 'verified product photo count');
assert.equal(imported.filter((product) => !product.dataQuality.hasRealImage).length, 29, 'missing product photo count');
assert.equal(imported.filter((product) => product.brand === 'alsis').length, 6, 'ALSIS manufacturer count');
assert.equal(health.products, catalog.products.length, 'health product count');
assert.equal(health.publishedProducts, catalog.products.filter((product) => product.dataQuality.publishInSitemap).length, 'health published product count');

console.log(JSON.stringify({
  imported: imported.length,
  vrt: vrt.items.length,
  terra: terra.items.length,
  terraDuplicateRows: terra.duplicateRows.length,
  withoutRetailPrice: imported.filter((product) => !product.price).length,
  withVerifiedPhoto: imported.filter((product) => product.dataQuality.hasRealImage).length,
  withPlaceholder: imported.filter((product) => !product.dataQuality.hasRealImage).length,
  fullCatalog: catalog.products.length,
}, null, 2));
