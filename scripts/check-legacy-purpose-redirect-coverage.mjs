import { readFile } from 'node:fs/promises';

const baseUrl = (process.env.CATEGORY_TAXONOMY_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const catalog = JSON.parse(await readFile(new URL('../content/generated/legacy-catalog.json', import.meta.url), 'utf8'));
const products = Array.isArray(catalog.products) ? catalog.products : [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const response = await fetch(`${baseUrl}/sitemap.xml`, {
  headers: {
    'accept-language': 'ru-RU,ru;q=0.9',
    'user-agent': 'Mozilla/5.0 pumbum-legacy-route-coverage/1.0',
  },
});
assert(response.ok, `/sitemap.xml returned ${response.status}`);
const sitemap = await response.text();
const productPaths = [...sitemap.matchAll(/<loc>https:\/\/477477\.ru(\/catalog\/[^<]+\/[^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((path) => path !== '/catalog/proizvoditeli');
const currentPaths = new Set(productPaths);
const pathsBySlug = new Map();

for (const path of productPaths) {
  const slug = path.split('/').at(-1);
  const paths = pathsBySlug.get(slug) ?? [];
  paths.push(path);
  pathsBySlug.set(slug, paths);
}

const moved = [];
const missing = [];
const ambiguous = [];
for (const product of products) {
  const oldPath = `/catalog/${product.categorySlug}/${product.slug}`;
  if (currentPaths.has(oldPath)) continue;
  const destinations = pathsBySlug.get(product.slug) ?? [];
  if (destinations.length === 1) moved.push([oldPath, destinations[0]]);
  else if (destinations.length === 0) missing.push(oldPath);
  else ambiguous.push({ oldPath, destinations });
}

assert(products.length === 9276, `expected 9276 source products, got ${products.length}`);
assert(productPaths.length === 9276, `expected 9276 sitemap product paths, got ${productPaths.length}`);
assert(missing.length === 0, `missing moved product routes: ${missing.slice(0, 5).join(', ')}`);
assert(ambiguous.length === 0, `ambiguous moved product routes: ${JSON.stringify(ambiguous.slice(0, 3))}`);

console.log(JSON.stringify({
  baseUrl,
  sourceProducts: products.length,
  currentProductPaths: productPaths.length,
  unchangedProductPaths: products.length - moved.length,
  movedProductRedirectsCovered: moved.length,
  missing: missing.length,
  ambiguous: ambiguous.length,
}, null, 2));
