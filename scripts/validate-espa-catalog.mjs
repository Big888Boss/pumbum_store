import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, 'content', 'generated', 'legacy-catalog.json'), 'utf8'),
);
const catalogHealth = JSON.parse(
  fs.readFileSync(path.join(root, 'content', 'generated', 'catalog-health.json'), 'utf8'),
);
const products = catalog.products ?? [];
const espaProducts = products.filter((product) => product.supplier === 'espa');
const stockProducts = espaProducts.filter((product) => product.availability === 'in_stock');
const orderProducts = espaProducts.filter((product) => product.availability === 'preorder');
const ids = new Set();
const routes = new Set();

function assert(condition, message) {
  if (!condition) throw new Error(`ESPA validation failed: ${message}`);
}

assert(products.length === 9276, `expected 9276 total products, got ${products.length}`);
assert(espaProducts.length === 68, `expected 68 ESPA products, got ${espaProducts.length}`);
assert(stockProducts.length === 32, `expected 32 stock products, got ${stockProducts.length}`);
assert(orderProducts.length === 36, `expected 36 order products, got ${orderProducts.length}`);
assert(catalogHealth.products === products.length, 'catalog-health product count is stale');
assert(
  catalogHealth.publishedProducts === products.filter((product) => product.dataQuality?.publishInSitemap).length,
  'catalog-health published count is stale',
);

for (const product of products) {
  const route = `${product.categorySlug}/${product.slug}`;
  assert(!ids.has(product.id), `duplicate product id ${product.id}`);
  assert(!routes.has(route), `duplicate product route ${route}`);
  ids.add(product.id);
  routes.add(route);
}

for (const product of espaProducts) {
  assert(!product.price, `article ${product.sku} unexpectedly has a price`);
  assert(product.dataQuality?.hasPrice === false, `article ${product.sku} hasPrice must be false`);
  assert(product.dataQuality?.hasAvailability === true, `article ${product.sku} availability is not verified`);
  assert(product.dataQuality?.publishInSitemap === true, `article ${product.sku} is absent from sitemap policy`);
  assert(product.specs?.['Статус поставки'], `article ${product.sku} has no explicit delivery status`);
  assert(product.specs?.Производитель === 'ESPA', `article ${product.sku} has an invalid manufacturer`);
  const imagePath = path.join(root, 'public', product.image.replace(/^\//, ''));
  assert(fs.existsSync(imagePath), `missing image ${product.image}`);
}

for (const product of orderProducts) {
  assert(
    product.description.length > 250,
    `order article ${product.sku} has no useful official series description`,
  );
  assert(
    product.crossSell?.includes('Канализация и водоотведение'),
    `order article ${product.sku} has an invalid catalog purpose`,
  );
}

const orderSeries = Object.fromEntries(
  ['DRAIN', 'DRAINCOR', 'DRAINEX', 'VIGILA'].map((series) => [
    series,
    orderProducts.filter((product) => product.specs?.Группа === series).length,
  ]),
);
assert(orderSeries.DRAIN === 1, `expected 1 DRAIN product, got ${orderSeries.DRAIN}`);
assert(orderSeries.DRAINCOR === 3, `expected 3 DRAINCOR products, got ${orderSeries.DRAINCOR}`);
assert(orderSeries.DRAINEX === 28, `expected 28 DRAINEX products, got ${orderSeries.DRAINEX}`);
assert(orderSeries.VIGILA === 4, `expected 4 VIGILA products, got ${orderSeries.VIGILA}`);

console.log(JSON.stringify({
  totalProducts: products.length,
  espaProducts: espaProducts.length,
  stockProducts: stockProducts.length,
  orderProducts: orderProducts.length,
  orderSeries,
}, null, 2));
