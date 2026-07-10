import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const legacyCatalog = JSON.parse(fs.readFileSync('content/generated/legacy-catalog.json', 'utf8'));

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args.set(key, 'true');
    else {
      args.set(key, next);
      i += 1;
    }
  }
  return args;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(filePath, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
  fs.writeFileSync(filePath, content);
}

function imageKind(image) {
  if (!image) return 'missing';
  if (/_fallback\.svg$/i.test(image) || image.includes('/generated-placeholders/')) return 'fallback';
  if (/^https?:\/\//i.test(image)) return 'external';
  if (image.startsWith('/images/products/')) return 'local';
  return 'other';
}

function localImagePath(publicRoot, image) {
  if (!image?.startsWith('/')) return undefined;
  return path.join(publicRoot, image.slice(1));
}

function getSupplier(product) {
  const refs = product.sourceRefs ?? [];
  const supplierUrl = refs.find((ref) => ref.type === 'supplier')?.url ?? '';
  const labels = refs.map((ref) => ref.label ?? '').join(' ');
  const text = `${supplierUrl} ${labels} ${product.brandName ?? ''} ${product.brand ?? ''}`.toLowerCase();
  if (text.includes('valtec')) return 'valtec';
  if (text.includes('aquario')) return 'aquario';
  if (text.includes('gidrokontrakt')) return 'gidrokontrakt';
  if (text.includes('vivaldo')) return 'vivaldo';
  if (text.includes('aq-plastic') || text.includes('aquatec') || text.includes('акватек')) return 'aquatec';
  if (text.includes('zota')) return 'zota';
  if (text.includes('sinikon') || text.includes('kanaliz') || text.includes('канализ')) return 'sinikon';
  return 'unknown';
}

const args = parseArgs(process.argv.slice(2));
const publicRoot = path.resolve(args.get('public-root') ?? 'public');
const outputDir = path.resolve(args.get('output-dir') ?? '.asset-store/reports');
fs.mkdirSync(outputDir, { recursive: true });

const products = legacyCatalog.products ?? [];
const imageCounts = new Map();
for (const product of products) {
  imageCounts.set(product.image, (imageCounts.get(product.image) ?? 0) + 1);
}

const rows = products.map((product) => {
  const kind = imageKind(product.image);
  const filePath = localImagePath(publicRoot, product.image);
  const exists = filePath ? fs.existsSync(filePath) : false;
  const stat = exists ? fs.statSync(filePath) : undefined;
  const sourceRefs = product.sourceRefs ?? [];
  const supplierSource = sourceRefs.find((ref) => ref.type === 'supplier')?.url ?? '';
  const duplicateCount = imageCounts.get(product.image) ?? 0;
  const status = kind === 'fallback'
    ? 'fallback'
    : kind === 'local' && !exists
      ? 'local-missing'
      : duplicateCount > 1
        ? 'family-image'
        : 'candidate';

  return {
    key: `${product.categorySlug}/${product.slug}`,
    id: product.id,
    supplier: getSupplier(product),
    brandName: product.brandName,
    sku: product.sku ?? product.vendorCode ?? '',
    name: product.name,
    currentImage: product.image,
    imageKind: kind,
    status,
    localExists: exists,
    bytes: stat?.size ?? null,
    duplicateCount,
    sourceUrl: supplierSource,
    sourceRefs,
  };
});

const stats = {
  generatedAt: new Date().toISOString(),
  publicRoot,
  totalProducts: products.length,
  byImageKind: {},
  byStatus: {},
  bySupplier: {},
  localBytes: 0,
  localFiles: 0,
  heavyLocalFilesOver1Mb: 0,
  duplicateImageReferences: 0,
  uniqueImageReferences: imageCounts.size,
};

for (const row of rows) {
  stats.byImageKind[row.imageKind] = (stats.byImageKind[row.imageKind] ?? 0) + 1;
  stats.byStatus[row.status] = (stats.byStatus[row.status] ?? 0) + 1;
  stats.bySupplier[row.supplier] = (stats.bySupplier[row.supplier] ?? 0) + 1;
  if (row.bytes) {
    stats.localBytes += row.bytes;
    stats.localFiles += 1;
    if (row.bytes > 1_000_000) stats.heavyLocalFilesOver1Mb += 1;
  }
  if (row.duplicateCount > 1) stats.duplicateImageReferences += 1;
}

const jsonReport = {
  ...stats,
  products: rows,
};

const jsonPath = path.join(outputDir, 'image-audit-before.json');
const csvPath = path.join(outputDir, 'image-audit-before.csv');
fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
writeCsv(csvPath, [
  ['key', 'supplier', 'brandName', 'sku', 'name', 'status', 'imageKind', 'localExists', 'bytes', 'duplicateCount', 'currentImage', 'sourceUrl'],
  ...rows.map((row) => [
    row.key,
    row.supplier,
    row.brandName,
    row.sku,
    row.name,
    row.status,
    row.imageKind,
    row.localExists,
    row.bytes ?? '',
    row.duplicateCount,
    row.currentImage,
    row.sourceUrl,
  ]),
]);

const checksum = crypto.createHash('sha256').update(JSON.stringify(stats)).digest('hex');
console.log(JSON.stringify({ jsonPath, csvPath, checksum, stats }, null, 2));
