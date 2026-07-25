import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'content', 'sources', 'espa', 'catalog.json');
const catalogPath = path.join(root, 'content', 'generated', 'legacy-catalog.json');

function fail(message) {
  throw new Error(`ESPA import failed: ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function cleanName(product) {
  return product.name.replace(/^Espa\b/, 'ESPA').trim();
}

function getStatus(availability) {
  return availability === 'in_stock'
    ? {
        label: 'В наличии',
        sentence: 'Позиция есть в наличии; актуальное количество уточнит менеджер.',
      }
    : {
        label: 'Под заказ',
        sentence: 'Позиция поставляется под заказ; срок поставки уточнит менеджер.',
      };
}

function buildProduct(source, imageManifest, sortOrder) {
  const status = getStatus(source.availability);
  const name = cleanName(source);
  const imageFile = imageManifest[source.article];
  if (!imageFile) fail(`no image for article ${source.article}`);

  const sourceRefs = [
    {
      type: 'supplier',
      label: 'espa/catalog.json',
      url: 'https://espa.ru/export/',
    },
  ];
  if (source.availability === 'in_stock') {
    sourceRefs.push({
      type: 'manual',
      label: 'Telegram: Наша Гамма Espa, message 483',
    });
  }
  if (source.article === '216971') {
    sourceRefs.push({
      type: 'supplier',
      label: 'ESPA price list 2026 v3, page 12',
      url: 'https://espa.ru/dokumentatsiya/',
    });
  }

  const descriptionParts = [
    source.purpose,
    source.applications ? `Сферы применения: ${source.applications}` : '',
    source.design ? `Конструктивное исполнение: ${source.design}` : '',
    ...source.benefits,
    status.sentence,
    'Цена не указана и подтверждается менеджером перед оформлением.',
  ].filter(Boolean);

  return {
    id: `legacy-espa-${source.article}`,
    slug: `espa-${source.article}`,
    categorySlug: 'espa',
    brand: 'espa',
    brandName: 'ESPA',
    supplier: 'espa',
    supplierName: 'ESPA',
    name,
    sku: source.article,
    vendorCode: source.article,
    shortDescription: `${name}. ${status.sentence}`,
    description: descriptionParts.join(' '),
    purpose: source.purpose || 'Насосное оборудование ESPA для инженерных систем.',
    image: `/images/products/espa/${imageFile}`,
    logo: '/brand-logos/espa.png',
    hideBrandLogo: false,
    highlights: [`Артикул ${source.article}`, `Серия ${source.series}`, status.label],
    sellingPoints: [
      'характеристики из официального экспорта ESPA',
      'точный артикул для быстрого заказа',
      status.sentence,
    ],
    specs: {
      ...source.specs,
      Артикул: source.article,
      Бренд: 'ESPA',
      Производитель: 'ESPA',
      Поставщик: 'ESPA',
      Раздел: 'ESPA',
      Подраздел: source.series,
      Группа: source.series,
      'Статус поставки': status.label,
    },
    crossSell: [
      'ESPA',
      source.series,
      source.availability === 'preorder' ? 'Канализация и водоотведение' : 'Насосы и водоснабжение',
    ],
    availability: source.availability,
    sourceRefs,
    dataQuality: {
      score: source.article === '216971' ? 93 : 96,
      hasRealImage: true,
      hasVerifiedSpecs: true,
      hasSourceRefs: true,
      hasPrice: false,
      hasAvailability: true,
      publishInSitemap: true,
      notes: [
        status.sentence,
        'Цена намеренно не импортирована.',
        source.article === '216971'
          ? 'Карточка и изображение подтверждены актуальным прайс-листом ESPA 2026 v3.'
          : 'Карточка и изображение подтверждены официальным экспортом ESPA.',
      ],
    },
    updatedAt: '2026-07-10',
    sortOrder,
  };
}

const source = readJson(sourcePath);
const catalog = readJson(catalogPath);
const stockProducts = source.stockProducts ?? [];
const orderProducts = source.orderProducts ?? [];
const sourceProducts = [...stockProducts, ...orderProducts];

if (stockProducts.length !== 32) fail(`expected 32 stock products, got ${stockProducts.length}`);
if (orderProducts.length !== 36) fail(`expected 36 order products, got ${orderProducts.length}`);

const sourceArticles = new Set();
for (const product of sourceProducts) {
  if (!/^\d+$/.test(product.article)) fail(`invalid article ${product.article}`);
  if (sourceArticles.has(product.article)) fail(`duplicate source article ${product.article}`);
  sourceArticles.add(product.article);
}

const baseProducts = (catalog.products ?? []).filter(
  (product) => product.supplier !== 'espa' && product.brand !== 'espa',
);
const existingArticles = new Map();
for (const product of baseProducts) {
  const productArticle = String(product.sku || product.vendorCode || product.specs?.['Артикул'] || '');
  if (productArticle) existingArticles.set(productArticle, product);
}
for (const sourceArticle of sourceArticles) {
  const collision = existingArticles.get(sourceArticle);
  if (collision) fail(`article ${sourceArticle} already belongs to ${collision.id}`);
}

const maxSortOrder = baseProducts.reduce(
  (maximum, product) => Math.max(maximum, Number(product.sortOrder) || 0),
  0,
);
const importedProducts = sourceProducts.map((product, index) =>
  buildProduct(product, source.imageManifest ?? {}, maxSortOrder + index + 1),
);
catalog.products = [...baseProducts, ...importedProducts];
catalog.generatedAt = '2026-07-10T00:00:00.000Z';
catalog.stats = {
  ...(catalog.stats ?? {}),
  sourceFiles: Math.max(Number(catalog.stats?.sourceFiles) || 0, 13),
  products: catalog.products.length,
};

const supplierStats = {};
for (const product of catalog.products) {
  const supplier = product.supplier || product.brand || 'generic';
  supplierStats[supplier] = (supplierStats[supplier] ?? 0) + 1;
}
catalog.supplierStats = supplierStats;

const usedIds = new Set();
for (const product of catalog.products) {
  const originalId = product.id;
  if (!usedIds.has(originalId)) {
    usedIds.add(originalId);
    continue;
  }

  let suffix = 2;
  while (usedIds.has(`${originalId}-${suffix}`)) suffix += 1;
  product.id = `${originalId}-${suffix}`;
  usedIds.add(product.id);
  product.dataQuality = {
    ...product.dataQuality,
    notes: [
      ...(product.dataQuality?.notes ?? []),
      `Duplicate internal product id normalized from ${originalId}.`,
    ],
  };
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({
  baseProducts: baseProducts.length,
  importedStock: stockProducts.length,
  importedOrder: orderProducts.length,
  totalProducts: catalog.products.length,
}, null, 2));
