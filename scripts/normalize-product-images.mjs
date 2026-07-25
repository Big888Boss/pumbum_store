import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sharp = (await import('sharp')).default;
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
  fs.writeFileSync(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n');
}

function safeFilePart(value) {
  return String(value ?? 'item')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё._-]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
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

function publicPath(publicRoot, filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`;
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

function sampleBorderIsWhite(raw, width, height, channels) {
  let total = 0;
  let white = 0;
  const stepX = Math.max(1, Math.floor(width / 220));
  const stepY = Math.max(1, Math.floor(height / 220));
  const check = (x, y) => {
    const offset = (y * width + x) * channels;
    const r = raw[offset];
    const g = raw[offset + 1];
    const b = raw[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    total += 1;
    if (min >= 238 && max - min <= 24) white += 1;
  };

  for (let x = 0; x < width; x += stepX) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    check(0, y);
    check(width - 1, y);
  }

  return total > 0 && white / total >= 0.86;
}

function removeWhiteBackground(raw, width, height, channels) {
  if (!sampleBorderIsWhite(raw, width, height, channels)) {
    return { buffer: raw, background: 'original' };
  }

  const output = Buffer.from(raw);
  for (let i = 0; i < output.length; i += channels) {
    const r = output[i];
    const g = output[i + 1];
    const b = output[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 248 && max - min <= 18) {
      output[i + 3] = 0;
    } else if (min >= 241 && max - min <= 16) {
      output[i + 3] = Math.min(output[i + 3], 64);
    }
  }

  return { buffer: output, background: 'transparent-white-border' };
}

async function normalizeBuffer(buffer, outputBasePath) {
  const resized = await sharp(buffer, { limitInputPixels: false })
    .rotate()
    .resize({ width: 1400, height: 1050, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = resized.info;
  const removed = removeWhiteBackground(resized.data, width, height, channels);
  const source = sharp(removed.buffer, { raw: { width, height, channels } });
  const transparent = { r: 255, g: 255, b: 255, alpha: 0 };
  const detailPath = `${outputBasePath}-detail.webp`;
  const cardPath = `${outputBasePath}-card.webp`;

  await source
    .clone()
    .resize({ width: 1100, height: 825, fit: 'contain', background: transparent })
    .webp({ quality: 84, effort: 4 })
    .toFile(detailPath);

  await source
    .resize({ width: 480, height: 360, fit: 'contain', background: transparent })
    .webp({ quality: 82, effort: 4 })
    .toFile(cardPath);

  return { detailPath, cardPath, background: removed.background };
}

async function readImageBuffer(publicRoot, product, kind) {
  if (kind === 'local') {
    const filePath = localImagePath(publicRoot, product.image);
    if (!filePath || !fs.existsSync(filePath)) throw new Error('local-image-missing');
    return { buffer: fs.readFileSync(filePath), sourceKind: 'current-local', sourcePath: filePath };
  }

  if (kind === 'external') {
    const response = await fetch(product.image, {
      headers: {
        'user-agent': 'Mozilla/5.0 compatible; 477477-v2-image-normalizer/1.0',
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`external-fetch-${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), sourceKind: 'current-external', sourcePath: product.image };
  }

  throw new Error(`unsupported-image-kind-${kind}`);
}

const args = parseArgs(process.argv.slice(2));
const publicRoot = path.resolve(args.get('public-root') ?? 'public');
const outputRoot = path.resolve(args.get('output-root') ?? path.join(publicRoot, 'images/products/_normalized-v2'));
const manifestPath = path.resolve(args.get('manifest') ?? 'content/generated/product-image-manifest.json');
const reportDir = path.resolve(args.get('report-dir') ?? '.asset-store/reports');
const limit = Number(args.get('limit') ?? 0);
const reportOnly = args.has('report-only');
const selectedSuppliers = new Set((args.get('suppliers') ?? '').split(',').map((item) => item.trim()).filter(Boolean));

if (!outputRoot.startsWith(publicRoot)) {
  throw new Error(`output-root must be inside public-root. publicRoot=${publicRoot} outputRoot=${outputRoot}`);
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const previousManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { products: {} };

const products = legacyCatalog.products ?? [];
if (reportOnly) {
  const rows = [['key', 'supplier', 'brandName', 'sku', 'name', 'status', 'error', 'currentImage', 'sourceUrl']];
  for (const product of products) {
    const key = `${product.categorySlug}/${product.slug}`;
    const entry = previousManifest.products?.[key];
    if (!entry || ['ready', 'family-image'].includes(entry.status)) continue;
    rows.push([
      key,
      entry.supplier ?? getSupplier(product),
      product.brandName,
      product.sku ?? product.vendorCode ?? '',
      product.name,
      entry.status,
      (entry.notes ?? []).join('; '),
      entry.originalImage ?? product.image,
      entry.sourceUrl ?? (product.sourceRefs ?? []).find((ref) => ref.type === 'supplier')?.url ?? '',
    ]);
  }
  const missingCsvPath = path.join(reportDir, 'missing-product-images.csv');
  writeCsv(missingCsvPath, rows);
  console.log(JSON.stringify({ missingCsvPath, missingRows: rows.length - 1 }, null, 2));
  process.exit(0);
}

const duplicateCounts = new Map();
for (const product of products) {
  duplicateCounts.set(product.image, (duplicateCounts.get(product.image) ?? 0) + 1);
}

const uniqueByImage = new Map();
for (const product of products) {
  const supplier = getSupplier(product);
  if (selectedSuppliers.size > 0 && !selectedSuppliers.has(supplier)) continue;
  const key = product.image;
  if (!uniqueByImage.has(key)) uniqueByImage.set(key, { product, supplier });
}

const imageResults = new Map();
const uniqueJobs = [...uniqueByImage.entries()].slice(0, limit > 0 ? limit : undefined);
let processed = 0;

for (const [image, job] of uniqueJobs) {
  const kind = imageKind(image);
  const product = job.product;
  const duplicateCount = duplicateCounts.get(image) ?? 1;

  if (kind === 'fallback' || kind === 'missing' || kind === 'other' || /\.svg($|\?)/i.test(image)) {
    imageResults.set(image, {
      status: kind === 'fallback' ? 'fallback' : 'missing',
      error: kind,
      supplier: job.supplier,
    });
    continue;
  }

  try {
    const source = await readImageBuffer(publicRoot, product, kind);
    const hash = crypto.createHash('sha1').update(source.buffer).digest('hex').slice(0, 16);
    const supplierDir = path.join(outputRoot, safeFilePart(job.supplier));
    fs.mkdirSync(supplierDir, { recursive: true });
    const sku = safeFilePart(product.sku ?? product.vendorCode ?? product.slug);
    const outputBasePath = path.join(supplierDir, `${sku}-${hash}`);
    const normalized = await normalizeBuffer(source.buffer, outputBasePath);
    const detailStat = fs.statSync(normalized.detailPath);
    const cardStat = fs.statSync(normalized.cardPath);

    imageResults.set(image, {
      status: duplicateCount > 1 ? 'family-image' : 'ready',
      supplier: job.supplier,
      sourceKind: source.sourceKind,
      sourcePath: source.sourcePath,
      background: normalized.background,
      originalBytes: source.buffer.length,
      duplicateCount,
      image: {
        detail: publicPath(publicRoot, normalized.detailPath),
        card: publicPath(publicRoot, normalized.cardPath),
        width: 1100,
        height: 825,
        cardWidth: 480,
        cardHeight: 360,
        detailBytes: detailStat.size,
        cardBytes: cardStat.size,
      },
    });
  } catch (error) {
    imageResults.set(image, {
      status: 'source-error',
      supplier: job.supplier,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  processed += 1;
  if (processed % 100 === 0) {
    console.log(`processed ${processed}/${uniqueJobs.length} unique images`);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  schemaVersion: 1,
  publicRoot,
  outputRoot,
  stats: {
    totalProducts: products.length,
    selectedSuppliers: selectedSuppliers.size > 0 ? [...selectedSuppliers] : ['all'],
    uniqueImagesConsidered: uniqueJobs.length,
    readyProducts: 0,
    familyImageProducts: 0,
    missingProducts: 0,
    errorProducts: 0,
    unsupportedProducts: 0,
    totalOriginalBytes: 0,
    totalDetailBytes: 0,
    totalCardBytes: 0,
  },
  products: {},
};

const missingRows = [['key', 'supplier', 'brandName', 'sku', 'name', 'status', 'error', 'currentImage', 'sourceUrl']];

function addStats(entry) {
  if (entry.status === 'ready') manifest.stats.readyProducts += 1;
  else if (entry.status === 'family-image') manifest.stats.familyImageProducts += 1;
  else if (entry.status === 'source-error') manifest.stats.errorProducts += 1;
  else if (entry.status === 'unsupported') manifest.stats.unsupportedProducts += 1;
  else manifest.stats.missingProducts += 1;

  if (entry.originalBytes) manifest.stats.totalOriginalBytes += entry.originalBytes;
  if (entry.image?.detailBytes) manifest.stats.totalDetailBytes += entry.image.detailBytes;
  if (entry.image?.cardBytes) manifest.stats.totalCardBytes += entry.image.cardBytes;
}

function addMissingRow(product, key, supplier, entry, sourceUrl) {
  if (['ready', 'family-image'].includes(entry.status)) return;
  missingRows.push([
    key,
    supplier,
    product.brandName,
    product.sku ?? product.vendorCode ?? '',
    product.name,
    entry.status,
    (entry.notes ?? []).join('; '),
    entry.originalImage ?? product.image,
    sourceUrl,
  ]);
}

for (const product of products) {
  const key = `${product.categorySlug}/${product.slug}`;
  const supplier = getSupplier(product);
  const existing = imageResults.get(product.image);
  const sourceUrl = (product.sourceRefs ?? []).find((ref) => ref.type === 'supplier')?.url ?? '';
  const shouldProcessSupplier = selectedSuppliers.size === 0 || selectedSuppliers.has(supplier);

  if (!shouldProcessSupplier) {
    const previousEntry = previousManifest.products?.[key];
    if (previousEntry) {
      manifest.products[key] = previousEntry;
      addStats(previousEntry);
      addMissingRow(product, key, supplier, previousEntry, sourceUrl);
    } else {
      const entry = {
        status: 'unsupported',
        supplier,
        originalImage: product.image,
        sourceUrl,
        notes: ['not-processed-in-this-run'],
      };
      manifest.products[key] = entry;
      addStats(entry);
      addMissingRow(product, key, supplier, entry, sourceUrl);
    }
    continue;
  }

  if (!existing) {
    const entry = {
      status: 'unsupported',
      supplier,
      originalImage: product.image,
      sourceUrl,
      notes: ['not-processed-in-this-run'],
    };
    manifest.products[key] = entry;
    addStats(entry);
    addMissingRow(product, key, supplier, entry, sourceUrl);
    continue;
  }

  const entry = {
    status: existing.status,
    supplier,
    originalImage: product.image,
    sourceKind: existing.sourceKind,
    sourceUrl,
    duplicateCount: existing.duplicateCount ?? duplicateCounts.get(product.image) ?? 0,
    background: existing.background,
    image: existing.image,
    originalBytes: existing.originalBytes,
    notes: [],
  };

  if (existing.status === 'family-image') {
    entry.notes.push('same-source-image-used-by-multiple-products');
  }

  if (existing.error) entry.notes.push(existing.error);
  addStats(entry);

  addMissingRow(product, key, supplier, entry, sourceUrl);

  manifest.products[key] = entry;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
const missingCsvPath = path.join(reportDir, 'missing-product-images.csv');
writeCsv(missingCsvPath, missingRows);
console.log(JSON.stringify({ manifestPath, missingCsvPath, stats: manifest.stats }, null, 2));
