import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content', 'generated', 'legacy-catalog.json'), 'utf8'));
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'content', 'generated', 'legacy-route-redirects.json'), 'utf8'));
const categorySlugs = new Set([
  'nasosy-i-vodosnabzhenie',
  'kanalizaciya-i-vodootvedenie',
  'truby-i-fitingi',
  'otoplenie-i-kotelnaya',
  'armatura-i-komplektuyuschie',
  'prochee-oborudovanie',
]);
const productSlugs = new Set((catalog.products ?? []).map((product) => product.slug));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(redirects.stats?.legacyItems === 5640, `expected 5640 legacy items, got ${redirects.stats?.legacyItems}`);
assert(redirects.stats?.matchedItems === 5624, `expected 5624 matched legacy items, got ${redirects.stats?.matchedItems}`);
assert(Object.keys(redirects.articles ?? {}).length > 5500, 'legacy article redirect coverage is unexpectedly low');

for (const destination of [...Object.values(redirects.routes ?? {}), ...Object.values(redirects.articles ?? {})]) {
  const pathOnly = String(destination).split(/[?#]/)[0];
  const [, rootSegment, category, product] = pathOnly.split('/');
  assert(rootSegment === 'catalog', `unsupported legacy redirect destination: ${destination}`);
  if (category === 'proizvoditeli') continue;
  assert(categorySlugs.has(category), `unknown redirect category: ${destination}`);
  if (product) assert(productSlugs.has(product), `unknown redirect product: ${destination}`);
}

console.log(JSON.stringify(redirects.stats, null, 2));
