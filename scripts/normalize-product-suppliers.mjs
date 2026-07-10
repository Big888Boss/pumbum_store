#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const catalogPath = path.resolve(process.argv[2] || 'content/generated/legacy-catalog.json');
const reportDir = path.resolve('.asset-store/reports');

const supplierMeta = {
  valtec: { name: 'VALTEC', logo: '/brand-logos/valtec.svg' },
  aquario: { name: 'AQUARIO', logo: '/brand-logos/aquario.svg' },
  zota: { name: 'ZOTA', logo: '/brand-logos/zota.svg' },
  vivaldo: { name: 'VIVALDO', logo: '/brand-logos/vivaldo.png' },
  sinikon: { name: 'SINIKON', logo: '/images/brands/sinikon.svg' },
  aquatec: { name: 'АКВАТЕК', logo: '/brand-logos/aquatec.svg' },
  gidrokontrakt: { name: 'Гидроконтракт', logo: '/brand-logos/gidrokontrakt.svg' },
  tim: { name: 'TIM', logo: undefined },
  generic: { name: 'Поставщик уточняется', logo: undefined },
};

const sourceSupplierMap = new Map([
  ['valtec/catalog.json', 'valtec'],
  ['aquario/catalog.json', 'aquario'],
  ['zota/catalog.json', 'zota'],
  ['vivaldo/catalog.json', 'vivaldo'],
  ['aquatec/catalog.json', 'aquatec'],
  ['gidrokontrakt/catalog.json', 'gidrokontrakt'],
  ['tim/catalog.json', 'tim'],
  ['catalog/latunnye-aksialnye-fitingi.json', 'sinikon'],
  ['catalog/naruzhnaya-kanalizaciya.json', 'sinikon'],
  ['catalog/truby-pe-x-pe-rt.json', 'sinikon'],
  ['catalog/vnutrennie-vodostoki.json', 'sinikon'],
  ['catalog/vnutrennyaya-kanalizaciya.json', 'sinikon'],
]);

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function inferSupplier(product) {
  const refs = product.sourceRefs ?? [];
  for (const ref of refs) {
    const byLabel = sourceSupplierMap.get(ref.label ?? '');
    if (byLabel) return { id: byLabel, confidence: 'source-label' };
  }

  const text = [
    product.supplier,
    product.supplierName,
    product.brandName,
    product.brand,
    product.name,
    product.description,
    product.shortDescription,
    product.specs?.['Бренд'],
    product.specs?.['Поставщик'],
    product.specs?.['Раздел'],
    product.specs?.['Подраздел'],
    product.specs?.['Группа'],
    ...refs.flatMap((ref) => [ref.label, ref.url]),
  ].map(clean).join(' ').toLowerCase();

  if (hasAny(text, ['sinikon', 'синикон'])) return { id: 'sinikon', confidence: 'text' };
  if (hasAny(text, ['valtec', 'валтек', 'вальтек'])) return { id: 'valtec', confidence: 'text' };
  if (hasAny(text, ['aquario', 'акварио', 'аквариус'])) return { id: 'aquario', confidence: 'text' };
  if (hasAny(text, ['aquatec', 'aq-plastic', 'акватек'])) return { id: 'aquatec', confidence: 'text' };
  if (hasAny(text, ['gidrokontrakt', 'гидроконтракт'])) return { id: 'gidrokontrakt', confidence: 'text' };
  if (hasAny(text, ['vivaldo', 'вивальдо', 'вивалдо'])) return { id: 'vivaldo', confidence: 'text' };
  if (hasAny(text, ['zota', 'зота'])) return { id: 'zota', confidence: 'text' };
  if (/\btim\b/i.test(text) || hasAny(text, [' тим ', 'тим '])) return { id: 'tim', confidence: 'text' };

  return { id: 'generic', confidence: 'unresolved' };
}

function shouldUseSupplierAsBrand(product, supplierId) {
  const supplierName = supplierMeta[supplierId]?.name;
  if (!supplierName || supplierId === 'generic') return false;
  const current = clean(product.brandName);
  const brandSpec = clean(product.specs?.['Бренд']);
  const genericNames = new Set([
    '',
    clean(product.specs?.['Раздел']),
    clean(product.specs?.['Подраздел']),
    clean(product.specs?.['Группа']),
    'Каталог',
    'Системы внутренней канализации',
    'Системы наружной канализации',
    'Системы для внутренних водостоков',
    'Трубы PE-X и PE-RT',
    'Латунные аксиальные фитинги',
  ]);

  return product.brand === 'generic'
    || genericNames.has(current)
    || genericNames.has(brandSpec)
    || supplierId === 'sinikon'
    || supplierId === 'aquatec';
}

function normalizeProduct(product) {
  const inferred = inferSupplier(product);
  const meta = supplierMeta[inferred.id] ?? supplierMeta.generic;
  const useSupplierBrand = shouldUseSupplierAsBrand(product, inferred.id);
  const logo = product.logo || meta.logo;
  const nextSpecs = {
    ...(product.specs ?? {}),
    'Поставщик': meta.name,
  };
  if (useSupplierBrand) nextSpecs['Бренд'] = meta.name;

  const next = {
    ...product,
    supplier: inferred.id,
    supplierName: meta.name,
    brand: useSupplierBrand ? inferred.id : product.brand,
    brandName: useSupplierBrand ? meta.name : product.brandName,
    logo,
    hideBrandLogo: logo ? false : product.hideBrandLogo,
    specs: nextSpecs,
    dataQuality: {
      ...product.dataQuality,
      notes: Array.from(new Set([
        ...(product.dataQuality?.notes ?? []),
        inferred.confidence === 'unresolved' ? 'supplier-unresolved' : `supplier-normalized:${inferred.confidence}`,
      ])),
    },
  };

  return { product: next, inferred };
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(reportDir, { recursive: true });
const backupPath = path.join(reportDir, `legacy-catalog-before-supplier-normalize-${timestamp}.json`);
fs.copyFileSync(catalogPath, backupPath);

const rows = [];
const stats = {};
let changed = 0;

catalog.products = (catalog.products ?? []).map((product) => {
  const previous = {
    supplier: product.supplier,
    supplierName: product.supplierName,
    brand: product.brand,
    brandName: product.brandName,
    logo: product.logo,
    hideBrandLogo: product.hideBrandLogo,
  };
  const result = normalizeProduct(product);
  const next = result.product;
  stats[next.supplier] = (stats[next.supplier] ?? 0) + 1;
  if (JSON.stringify(previous) !== JSON.stringify({
    supplier: next.supplier,
    supplierName: next.supplierName,
    brand: next.brand,
    brandName: next.brandName,
    logo: next.logo,
    hideBrandLogo: next.hideBrandLogo,
  })) changed += 1;
  rows.push({
    sku: next.sku ?? next.vendorCode ?? '',
    name: next.name,
    supplier: next.supplier,
    supplierName: next.supplierName,
    brand: next.brand,
    brandName: next.brandName,
    confidence: result.inferred.confidence,
    source: (next.sourceRefs ?? []).map((ref) => ref.label).join('|'),
  });
  return next;
});

catalog.supplierStats = stats;
catalog.generatedAt = catalog.generatedAt ?? new Date().toISOString();

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`);

const csvPath = path.join(reportDir, `supplier-normalize-${timestamp}.csv`);
const reportPath = path.join(reportDir, `supplier-normalize-${timestamp}.json`);
const csv = [
  ['sku', 'name', 'supplier', 'supplierName', 'brand', 'brandName', 'confidence', 'source'],
  ...rows.map((row) => [row.sku, row.name, row.supplier, row.supplierName, row.brand, row.brandName, row.confidence, row.source]),
].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(csvPath, `${csv}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  catalog: path.relative(rootDir, catalogPath),
  backup: path.relative(rootDir, backupPath),
  changedProducts: changed,
  stats,
  unresolved: rows.filter((row) => row.supplier === 'generic').length,
  csv: path.relative(rootDir, csvPath),
}, null, 2)}\n`);

console.log(JSON.stringify({
  changedProducts: changed,
  stats,
  unresolved: rows.filter((row) => row.supplier === 'generic').length,
  report: path.relative(rootDir, reportPath),
  csv: path.relative(rootDir, csvPath),
}, null, 2));
