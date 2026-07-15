import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.env.LEGACY_PUBLIC_CATALOG_CACHE;
const catalogPath = path.join(root, 'content', 'generated', 'legacy-catalog.json');
const outputPath = path.join(root, 'content', 'generated', 'legacy-route-redirects.json');

if (!sourcePath) {
  throw new Error('Set LEGACY_PUBLIC_CATALOG_CACHE to the old public-catalog-cache.json file.');
}

const expectedSourceSha256 = '9f63c3ec535488f0c217f719d75c266e8c34e119b6e9215304d6bc638fd1cce7';
const sourceBuffer = fs.readFileSync(path.resolve(sourcePath));
const sourceSha256 = crypto.createHash('sha256').update(sourceBuffer).digest('hex');
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`Unexpected legacy catalog source SHA-256: ${sourceSha256}`);
}
const legacy = JSON.parse(sourceBuffer.toString('utf8'));
const current = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const directSourceMap = {
  aquario: 'nasosy-i-vodosnabzhenie',
  gidrokontrakt: 'nasosy-i-vodosnabzhenie',
  aquatec: 'kanalizaciya-i-vodootvedenie',
  'vnutrennie-vodostoki': 'kanalizaciya-i-vodootvedenie',
  'truby-pe-x-pe-rt': 'truby-i-fitingi',
  'vnutrennyaya-kanalizaciya': 'otoplenie-i-kotelnaya',
  'latunnye-aksialnye-fitingi': 'otoplenie-i-kotelnaya',
  vivaldo: 'prochee-oborudovanie',
};

const valtecTopSectionMap = {
  'Насосное оборудование': 'nasosy-i-vodosnabzhenie',
  'Инструмент': 'truby-i-fitingi',
  'Крепеж и расходные материалы': 'truby-i-fitingi',
  'Резьбовые и ремонтные соединения для трубопроводов': 'truby-i-fitingi',
  'Системы трубопроводов из нержавеющей стали': 'truby-i-fitingi',
  'Трубопроводная арматура': 'truby-i-fitingi',
  'Регулирующая арматура': 'armatura-i-komplektuyuschie',
  'Арматура безопасности': 'armatura-i-komplektuyuschie',
  'Контрольно-измерительные приборы': 'armatura-i-komplektuyuschie',
  'Системы диспетчеризации': 'armatura-i-komplektuyuschie',
  'Системы модульного монтажа': 'armatura-i-komplektuyuschie',
  'Шаровые краны для газоснабжения': 'armatura-i-komplektuyuschie',
  'Подводка гибкая': 'prochee-oborudovanie',
  'Фильтры': 'prochee-oborudovanie',
};

const zotaHeatingSections = new Set(['Газовые настенные котлы', 'Твердотопливные котлы']);
const espaDrainageSeries = new Set(['DRAIN', 'DRAINEX', 'DRAINCOR', 'VIGILA']);

function clean(value) {
  return String(value ?? '').trim();
}

function key(value) {
  return clean(value).toLocaleLowerCase('ru-RU');
}

function topSection(product) {
  return clean(product.specs?.['Подраздел']).split('/')[0]?.trim() ?? '';
}

function purposeCategory(product) {
  const section = topSection(product);
  const supplier = key(product.supplier || product.brand || product.brandName);
  if (supplier === 'tim' && product.categorySlug?.includes('-')) return product.categorySlug;
  if (supplier === 'espa') {
    return espaDrainageSeries.has(section) ? 'kanalizaciya-i-vodootvedenie' : 'nasosy-i-vodosnabzhenie';
  }
  if (product.categorySlug === 'naruzhnaya-kanalizaciya') {
    return section === 'Инструмент и крепеж' ? 'truby-i-fitingi' : 'kanalizaciya-i-vodootvedenie';
  }
  if (product.categorySlug === 'zota') {
    return zotaHeatingSections.has(section) ? 'otoplenie-i-kotelnaya' : 'prochee-oborudovanie';
  }
  if (directSourceMap[product.categorySlug]) return directSourceMap[product.categorySlug];
  if (product.categorySlug === 'valtec') return valtecTopSectionMap[section] ?? 'otoplenie-i-kotelnaya';
  return 'prochee-oborudovanie';
}

function supplierSlug(product) {
  const value = key(product.supplier || product.brand || product.brandName);
  if (value === 'гидроконтракт') return 'gidrokontrakt';
  if (value === 'акватек') return 'aquatec';
  return value;
}

function productArticles(product) {
  return [product.sku, product.vendorCode, product.specs?.['Артикул'], product.specs?.article]
    .map(key)
    .filter(Boolean);
}

const currentBySupplierArticle = new Map();
for (const product of current.products ?? []) {
  const destination = `/catalog/${purposeCategory(product)}/${product.slug}`;
  for (const article of productArticles(product)) {
    const indexKey = `${supplierSlug(product)}:${article}`;
    if (!currentBySupplierArticle.has(indexKey)) currentBySupplierArticle.set(indexKey, destination);
  }
}

function destinationForItem(brandSlug, item) {
  return currentBySupplierArticle.get(`${key(brandSlug)}:${key(item.article)}`);
}

function mostCommonCategory(destinations, fallback = 'prochee-oborudovanie') {
  const counts = new Map();
  for (const destination of destinations.filter(Boolean)) {
    const category = destination.split('/')[2];
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? fallback;
}

const routes = {};
const articles = {};
let legacyItems = 0;
let matchedItems = 0;
let missingItems = 0;
let duplicateArticleRoutes = 0;

for (const brand of legacy.catalog ?? []) {
  const brandSlug = key(brand.slug || brand.id);
  routes[`/catalog/${brandSlug}`] = `/catalog/proizvoditeli#${brandSlug}`;

  for (const subcategory of brand.subcategories ?? []) {
    const subcategorySlug = key(subcategory.slug || subcategory.id);
    const subcategoryDestinations = [];

    for (const group of subcategory.productGroups ?? []) {
      const groupSlug = key(group.slug || group.id);
      const groupDestinations = [];

      for (const item of group.items ?? []) {
        legacyItems += 1;
        const destination = destinationForItem(brandSlug, item);
        if (destination) {
          matchedItems += 1;
          groupDestinations.push(destination);
          subcategoryDestinations.push(destination);
        } else {
          missingItems += 1;
        }

        const articleKey = key(item.article);
        if (!articleKey) continue;
        const fallbackCategory = mostCommonCategory(groupDestinations.length ? groupDestinations : subcategoryDestinations);
        const articleDestination = destination ?? `/catalog/${fallbackCategory}`;
        if (articles[articleKey] && articles[articleKey] !== articleDestination) duplicateArticleRoutes += 1;
        else if (!articles[articleKey]) articles[articleKey] = articleDestination;
      }

      const uniqueDestinations = [...new Set(groupDestinations)];
      routes[`/catalog/${brandSlug}/${subcategorySlug}/${groupSlug}`] = uniqueDestinations.length === 1
        ? uniqueDestinations[0]
        : `/catalog/${mostCommonCategory(groupDestinations)}`;
    }

    routes[`/catalog/${brandSlug}/${subcategorySlug}`] = `/catalog/${mostCommonCategory(subcategoryDestinations)}`;
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  sourceGeneratedAt: legacy.generatedAt,
  sourceSha256,
  stats: {
    legacyItems,
    matchedItems,
    missingItems,
    catalogRoutes: Object.keys(routes).length,
    articleRoutes: Object.keys(articles).length,
    duplicateArticleRoutes,
  },
  routes: Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b))),
  articles: Object.fromEntries(Object.entries(articles).sort(([a], [b]) => a.localeCompare(b))),
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.stats));
