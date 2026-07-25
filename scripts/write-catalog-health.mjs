import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'content', 'generated', 'legacy-catalog.json');
const healthPath = path.join(root, 'content', 'generated', 'catalog-health.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const products = catalog.products ?? [];
const health = {
  generatedAt: catalog.generatedAt,
  products: products.length,
  publishedProducts: products.filter((product) => product.dataQuality?.publishInSitemap).length,
};

fs.writeFileSync(healthPath, `${JSON.stringify(health, null, 2)}\n`);
console.log(JSON.stringify(health));
