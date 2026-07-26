import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) result.set(value.slice(2), 'true');
    else {
      result.set(value.slice(2), next);
      index += 1;
    }
  }
  return result;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else if (character !== '\r') value += character;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`);
}

function safeName(value) {
  return String(value ?? 'image')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'image';
}

function publicFile(publicRoot, publicPath) {
  if (!publicPath?.startsWith('/') || publicPath.includes('..')) return undefined;
  return path.join(publicRoot, publicPath.slice(1));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function absoluteUrl(value, base) {
  try {
    return new URL(decodeHtml(value), base).toString();
  } catch {
    return undefined;
  }
}

function keyProducts(catalog) {
  const result = new Map();
  for (const product of catalog.products ?? []) {
    const keys = [`${product.categorySlug}/${product.slug}`];
    const supplier = product.supplier && product.supplier !== 'generic' ? product.supplier : undefined;
    if (supplier) keys.push(`${supplier}/${product.slug}`);
    for (const key of keys) if (!result.has(key)) result.set(key, product);
  }
  return result;
}

function representativeProducts(row, productsByKey) {
  const seen = new Set();
  const products = [];
  for (const key of String(row.keys ?? '').split(';').map((item) => item.trim()).filter(Boolean)) {
    const product = productsByKey.get(key);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    products.push(product);
  }
  return products;
}

function manifestEntriesForSource(manifest, source) {
  const entries = [];
  for (const [key, entry] of Object.entries(manifest.products ?? {})) {
    if (entry.image?.detail === source || entry.image?.card === source) entries.push({ key, entry });
  }
  return entries;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; 477477-image-source-recovery/1.0; +https://477477.ru)',
          accept: options.accept ?? 'text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
          'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
          ...(options.headers ?? {}),
        },
      });
      if (!response.ok) throw new Error(`http-${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(650 * (attempt + 1));
    }
  }
  throw lastError;
}

async function findTimSource(sku) {
  const searchUrl = `https://tim-com.ru/catalog?search=${encodeURIComponent(sku)}`;
  const html = await (await fetchWithRetry(searchUrl)).text();
  const normalizedSku = sku.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, '');
  const blocks = html.match(/<div class=["']product-item js-catalog-item["']>[\s\S]*?<\/form>/gi) ?? [];
  const exactBlock = blocks.find((block) => {
    const article = block.match(/артикул:\s*([^<]+)/i)?.[1]?.trim() ?? '';
    return article.toLowerCase().replace(/[^a-z0-9а-яё]+/giu, '') === normalizedSku;
  });
  if (exactBlock) {
    const productUrl = absoluteUrl(exactBlock.match(/data-product-url=["']([^"']+)["']/i)?.[1], searchUrl);
    if (productUrl) {
      const productHtml = await (await fetchWithRetry(productUrl)).text();
      const imageMatch = productHtml.match(/<link[^>]+itemprop=["']image["'][^>]+href=["']([^"']+)["']/i)
        ?? productHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const imageUrl = absoluteUrl(imageMatch?.[1], productUrl);
      if (imageUrl) return { imageUrl, sourcePage: productUrl, provider: 'tim-official', confidence: 'exact-article' };
    }
  }
  return undefined;
}

async function findSinikonSource(sku) {
  const compactSku = sku.replaceAll('.', '').replaceAll('-', '').toLowerCase();
  const searchUrl = `https://www.vodoparad.ru/searchs/?art=${encodeURIComponent(sku)}`;
  try {
    const response = await fetchWithRetry(searchUrl);
    const html = await response.text();
    const normalized = html.toLowerCase().replaceAll('.', '').replaceAll('-', '');
    if (normalized.includes(compactSku)) {
      const candidates = [
        ...html.matchAll(/(?:href|src)=["']([^"']*\/upload\/iblock\/[^"']+\.(?:png|jpe?g|webp))[^"']*["']/gi),
      ].map((match) => absoluteUrl(match[1], response.url)).filter(Boolean);
      const original = candidates.find((candidate) => !candidate.includes('/resize_cache/')) ?? candidates[0];
      if (original) return { imageUrl: original, sourcePage: response.url, provider: 'vodoparad-exact-article', confidence: 'exact-article' };
    }
  } catch {
    // Continue to the next exact-article provider.
  }
  const inrusUrl = `https://inrusstrade.ru/ru/search?q=${encodeURIComponent(sku)}`;
  try {
    const html = await (await fetchWithRetry(inrusUrl)).text();
    const blocks = html.match(/<tr class=["']product[^"']*["'][^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    const exactBlock = blocks.find((block) => block.toLowerCase().replaceAll('.', '').replaceAll('-', '').includes(compactSku));
    const photoUrl = absoluteUrl(exactBlock?.match(/<a[^>]+class=["']photo active["'][^>]+href=["']([^"']+)["']/i)?.[1], inrusUrl)
      ?? absoluteUrl(exactBlock?.match(/<a[^>]+class=["']gallery-item["'][^>]+href=["']([^"']+)["']/i)?.[1], inrusUrl);
    if (photoUrl) return { imageUrl: photoUrl, sourcePage: inrusUrl, provider: 'inrusstrade-sinikon', confidence: 'exact-article' };
  } catch {
    // No exact supplier source was available.
  }
  return undefined;
}

async function downloadImage(url, destinationBase) {
  const response = await fetchWithRetry(url, { accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8' });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/') && !/\.(?:avif|webp|png|jpe?g)(?:\?|$)/i.test(response.url)) {
    throw new Error(`not-an-image:${contentType || 'unknown'}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1_500) throw new Error('image-too-small');
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
  if (!metadata.width || !metadata.height) throw new Error('image-metadata-missing');
  const extension = metadata.format === 'jpeg' ? '.jpg' : `.${metadata.format || 'img'}`;
  const filePath = `${destinationBase}${extension}`;
  fs.writeFileSync(filePath, buffer);
  return {
    filePath,
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    resolvedUrl: response.url,
  };
}

async function inspectLocal(filePath) {
  const buffer = fs.readFileSync(filePath);
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
  return {
    filePath,
    bytes: buffer.length,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? '',
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function candidateOriginal(entries) {
  return entries.map(({ entry }) => ({
    originalImage: entry.originalImage,
    sourcePage: entry.sourceUrl,
    sourceKind: entry.sourceKind,
    supplier: entry.supplier,
  })).find((item) => item.originalImage);
}

const args = parseArgs(process.argv.slice(2));
const qualityReport = path.resolve(args.get('quality-report') ?? 'reports/product-image-quality-problems.csv');
const reviewReport = path.resolve(args.get('review-report') ?? 'reports/product-image-transparency-review.csv');
const publicRoot = path.resolve(args.get('public-root') ?? 'public');
const catalogPath = path.resolve(args.get('catalog') ?? 'content/generated/legacy-catalog.json');
const manifestPath = path.resolve(args.get('manifest') ?? 'content/generated/product-image-manifest.json');
const sourceRoot = path.resolve(args.get('source-root') ?? '.asset-store/catalog-source-recovery-v2');
const reportDir = path.resolve(args.get('report-dir') ?? '.asset-store/reports-source-recovery-v2');
const limit = Number(args.get('limit') ?? 0);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const productsByKey = keyProducts(catalog);
const qualityRows = parseCsv(fs.readFileSync(qualityReport, 'utf8')).map((row) => ({ ...row, qualityFlag: true, reviewFlag: false }));
const reviewRows = parseCsv(fs.readFileSync(reviewReport, 'utf8')).map((row) => ({ ...row, qualityFlag: false, reviewFlag: true }));
const combined = new Map();
for (const row of [...qualityRows, ...reviewRows]) {
  const existing = combined.get(row.source);
  combined.set(row.source, existing ? { ...existing, qualityFlag: existing.qualityFlag || row.qualityFlag, reviewFlag: existing.reviewFlag || row.reviewFlag } : row);
}
const rows = [...combined.values()].slice(0, limit > 0 ? limit : undefined);
fs.mkdirSync(sourceRoot, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const results = new Array(rows.length);
const concurrency = Math.max(1, Math.min(4, Number(args.get('concurrency') ?? 3)));
async function recoverRow(row, index) {
  const products = representativeProducts(row, productsByKey);
  const entries = manifestEntriesForSource(manifest, row.source);
  const original = candidateOriginal(entries);
  const representative = products[0];
  const skuCandidates = [...new Set(products.map((product) => product.sku ?? product.vendorCode).filter(Boolean))].slice(0, 4);
  const supplier = String(original?.supplier ?? representative?.supplier ?? representative?.brand ?? '').toLowerCase();
  const identifier = `${String(index + 1).padStart(3, '0')}-${safeName(skuCandidates[0] ?? path.basename(row.source))}`;
  const destinationBase = path.join(sourceRoot, identifier);
  const result = {
    source: row.source,
    qualityFlag: row.qualityFlag,
    reviewFlag: row.reviewFlag,
    products: Number(row.products || products.length || 1),
    keys: row.keys,
    supplier,
    skuCandidates,
    productName: representative?.name ?? '',
    originalImage: original?.originalImage ?? '',
    sourcePage: original?.sourcePage ?? '',
    status: 'failed',
    recoveryKind: '',
    confidence: '',
    error: '',
  };
  try {
    let recovered;
    let provenance;
    if (original?.originalImage?.startsWith('/')) {
      const sourceFile = publicFile(publicRoot, original.originalImage);
      if (sourceFile && fs.existsSync(sourceFile)) {
        const extension = path.extname(sourceFile) || '.img';
        const target = `${destinationBase}${extension}`;
        fs.copyFileSync(sourceFile, target);
        recovered = await inspectLocal(target);
        provenance = { imageUrl: original.originalImage, sourcePage: original.sourcePage, provider: 'manifest-local-original', confidence: 'manifest-exact' };
      }
    } else if (original?.originalImage && /^https?:\/\//i.test(original.originalImage)) {
      recovered = await downloadImage(original.originalImage, destinationBase);
      provenance = { imageUrl: original.originalImage, sourcePage: original.sourcePage, provider: 'manifest-external-original', confidence: 'manifest-exact' };
    }
    if (!recovered && (supplier === 'tim' || row.source.includes('/tim/'))) {
      for (const sku of skuCandidates) {
        provenance = await findTimSource(sku);
        if (!provenance) continue;
        recovered = await downloadImage(provenance.imageUrl, destinationBase);
        break;
      }
    }
    if (!recovered && (supplier === 'sinikon' || row.source.includes('/sinikon/'))) {
      for (const sku of skuCandidates) {
        provenance = await findSinikonSource(sku);
        if (!provenance) continue;
        recovered = await downloadImage(provenance.imageUrl, destinationBase);
        break;
      }
    }
    if (!recovered) {
      const currentFile = publicFile(publicRoot, row.source);
      if (!currentFile || !fs.existsSync(currentFile)) throw new Error('no-recoverable-source');
      const extension = path.extname(currentFile) || '.img';
      const target = `${destinationBase}${extension}`;
      fs.copyFileSync(currentFile, target);
      recovered = await inspectLocal(target);
      provenance = { imageUrl: row.source, sourcePage: '', provider: 'current-local-fallback', confidence: 'fallback-only' };
    }
    Object.assign(result, recovered, {
      status: 'recovered',
      recoveryKind: provenance.provider,
      confidence: provenance.confidence,
      recoveredImageUrl: provenance.imageUrl,
      sourcePage: provenance.sourcePage || result.sourcePage,
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  await wait(180);
  return result;
}
for (let start = 0; start < rows.length; start += concurrency) {
  const batch = rows.slice(start, start + concurrency);
  const batchResults = await Promise.all(batch.map((row, offset) => recoverRow(row, start + offset)));
  for (let offset = 0; offset < batchResults.length; offset += 1) results[start + offset] = batchResults[offset];
  const completed = Math.min(rows.length, start + batch.length);
  if (completed % 10 < concurrency || completed === rows.length) console.log(`recovered ${completed}/${rows.length}`);
}

const manifestOutput = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  recovered: results.filter((row) => row.status === 'recovered').length,
  failed: results.filter((row) => row.status !== 'recovered').length,
  highConfidence: results.filter((row) => row.confidence !== 'fallback-only' && row.status === 'recovered').length,
  fallbackOnly: results.filter((row) => row.confidence === 'fallback-only').length,
  rows: results,
};
fs.writeFileSync(path.join(reportDir, 'source-recovery-manifest.json'), `${JSON.stringify(manifestOutput, null, 2)}\n`);
const columns = ['source', 'qualityFlag', 'reviewFlag', 'products', 'supplier', 'skuCandidates', 'productName', 'status', 'recoveryKind', 'confidence', 'width', 'height', 'bytes', 'filePath', 'sourcePage', 'recoveredImageUrl', 'sha256', 'error'];
writeCsv(path.join(reportDir, 'source-recovery-manifest.csv'), [
  columns,
  ...results.map((row) => columns.map((column) => column === 'skuCandidates' ? row.skuCandidates.join('; ') : row[column])),
]);
console.log(JSON.stringify({ ...manifestOutput, rows: undefined, sourceRoot, reportDir }, null, 2));
