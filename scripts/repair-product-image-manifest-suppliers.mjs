#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const manifestPath = path.resolve(process.argv[2] || 'content/generated/product-image-manifest.json');
const catalogPath = path.resolve('content/generated/legacy-catalog.json');
const reportDir = path.resolve('.asset-store/reports');

const supplierSources = {
  sinikon: new Set([
    'catalog/latunnye-aksialnye-fitingi.json',
    'catalog/naruzhnaya-kanalizaciya.json',
    'catalog/truby-pe-x-pe-rt.json',
    'catalog/vnutrennie-vodostoki.json',
    'catalog/vnutrennyaya-kanalizaciya.json',
  ]),
  valtec: new Set(['valtec/catalog.json']),
  gidrokontrakt: new Set(['gidrokontrakt/catalog.json']),
  aquario: new Set(['aquario/catalog.json']),
  vivaldo: new Set(['vivaldo/catalog.json']),
  aquatec: new Set(['aquatec/catalog.json']),
  zota: new Set(['zota/catalog.json']),
};

function inferSupplier(product) {
  const refs = product.sourceRefs || [];
  const labels = refs.map((ref) => ref.label || '');
  for (const [supplier, sources] of Object.entries(supplierSources)) {
    if (labels.some((label) => sources.has(label))) return supplier;
  }

  const text = [
    product.brandName,
    product.brand,
    product.name,
    product.description,
    product.shortDescription,
    product.specs?.['Бренд'],
    product.specs?.['Раздел'],
    product.specs?.['Подраздел'],
    product.specs?.['Группа'],
    ...refs.map((ref) => `${ref.label || ''} ${ref.url || ''}`),
  ].join(' ').toLowerCase();

  if (text.includes('valtec')) return 'valtec';
  if (text.includes('aquario')) return 'aquario';
  if (text.includes('gidrokontrakt') || text.includes('гидроконтракт')) return 'gidrokontrakt';
  if (text.includes('vivaldo')) return 'vivaldo';
  if (text.includes('aq-plastic') || text.includes('aquatec') || text.includes('акватек')) return 'aquatec';
  if (text.includes('zota')) return 'zota';
  if (text.includes('sinikon') || text.includes('синикон')) return 'sinikon';

  return undefined;
}

function productKeys(product, manifest) {
  const keys = new Set([`${product.categorySlug}/${product.slug}`]);
  for (const key of Object.keys(manifest.products || {})) {
    if (key.endsWith(`/${product.slug}`)) keys.add(key);
  }
  return [...keys];
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const changes = [];

for (const product of catalog.products || []) {
  const supplier = inferSupplier(product);
  if (!supplier) continue;

  for (const key of productKeys(product, manifest)) {
    const entry = manifest.products?.[key];
    if (!entry || entry.supplier === supplier) continue;

    const previousSupplier = entry.supplier || 'unknown';
    entry.supplier = supplier;
    entry.notes = [
      ...(entry.notes || []).filter((note) => note !== 'supplier-inferred-from-source'),
      'supplier-inferred-from-source',
    ];

    changes.push({
      key,
      sku: product.sku || product.vendorCode,
      name: product.name,
      from: previousSupplier,
      to: supplier,
      sourceKind: entry.sourceKind,
      image: entry.image?.card || entry.image?.detail || null,
    });
  }
}

if (changes.length > 0) {
  fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(reportDir, `product-image-manifest-before-supplier-repair-${timestamp}.json`);
  const reportPath = path.join(reportDir, `product-image-manifest-supplier-repair-${timestamp}.json`);
  fs.copyFileSync(manifestPath, backupPath);
  manifest.generatedAt = new Date().toISOString();
  manifest.stats = {
    ...(manifest.stats || {}),
    supplierRepairBatch: {
      appliedAt: new Date().toISOString(),
      changedProducts: changes.length,
    },
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify({
    checkedAt: new Date().toISOString(),
    manifest: path.relative(rootDir, manifestPath),
    backup: path.relative(rootDir, backupPath),
    changedProducts: changes.length,
    changes,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ changedProducts: changes.length, reportPath }, null, 2));
} else {
  console.log(JSON.stringify({ changedProducts: 0 }, null, 2));
}
