#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const args = new Map();

for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) {
    args.set(key, 'true');
  } else {
    args.set(key, next);
    i += 1;
  }
}

const auditPath = path.resolve(args.get('audit') || '.asset-store/reports/valtec-source-image-audit-fallback.json');
const manifestPath = path.resolve(args.get('manifest') || 'content/generated/product-image-manifest.json');
const publicRoot = path.resolve(args.get('public-root') || '../public');
const outputRoot = path.resolve(args.get('output-root') || path.join(publicRoot, 'images/products/_normalized-v2'));
const reportDir = path.resolve(args.get('report-dir') || '.asset-store/reports');
const timeoutMs = Number(args.get('timeout-ms') || 15000);
const dryRun = args.has('dry-run');

function publicPath(filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`;
}

function safeFilePart(value) {
  return String(value || 'valtec')
    .replace(/[^a-zA-Z0-9а-яА-Я._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'valtec';
}

function imageKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const series = parts.at(-2) || parts.at(-1) || 'valtec';
    return safeFilePart(series);
  } catch {
    return 'valtec';
  }
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

function isImagePayload(result) {
  if (!result.ok || result.buffer.length < 512) return false;
  if (/^image\//i.test(result.contentType)) return true;
  const b = result.buffer;
  return (
    (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
    (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
    b.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

async function fetchImage(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
        referer,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 pumbum-store-v2-valtec-images/1.0',
      },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      finalUrl: response.url,
      buffer,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const eligibleRows = (audit.rows || []).filter((row) => (
  (row.bestStatus === 'family' || row.bestStatus === 'exact') &&
  row.bestImageUrl &&
  manifest.products?.[row.key]
));
const uniqueImages = new Map();
for (const row of eligibleRows) {
  if (!uniqueImages.has(row.bestImageUrl)) uniqueImages.set(row.bestImageUrl, []);
  uniqueImages.get(row.bestImageUrl).push(row);
}

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.join(outputRoot, 'valtec'), { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(reportDir, `product-image-manifest-before-valtec-source-${timestamp}.json`);
if (!dryRun) fs.copyFileSync(manifestPath, backupPath);

const imageResults = new Map();
for (const [imageUrl, rows] of uniqueImages) {
  const first = rows[0];
  try {
    const fetched = await fetchImage(imageUrl, first.sourceUrl || 'https://valtec.ru/');
    if (!isImagePayload(fetched)) {
      imageResults.set(imageUrl, { ok: false, error: `not-image-${fetched.status}`, contentType: fetched.contentType, bytes: fetched.buffer.length });
      continue;
    }

    const hash = crypto.createHash('sha1').update(fetched.buffer).digest('hex').slice(0, 16);
    const baseName = `${imageKeyFromUrl(imageUrl)}-${hash}`;
    const outputBasePath = path.join(outputRoot, 'valtec', baseName);
    if (!dryRun) {
      const normalized = await normalizeBuffer(fetched.buffer, outputBasePath);
      const detailStat = fs.statSync(normalized.detailPath);
      const cardStat = fs.statSync(normalized.cardPath);
      imageResults.set(imageUrl, {
        ok: true,
        sourceImageUrl: imageUrl,
        sourceKind: 'valtec-source-page',
        originalBytes: fetched.buffer.length,
        contentType: fetched.contentType,
        finalUrl: fetched.finalUrl,
        background: normalized.background,
        image: {
          detail: publicPath(normalized.detailPath),
          card: publicPath(normalized.cardPath),
          width: 1100,
          height: 825,
          cardWidth: 480,
          cardHeight: 360,
          detailBytes: detailStat.size,
          cardBytes: cardStat.size,
        },
      });
    } else {
      imageResults.set(imageUrl, { ok: true, sourceImageUrl: imageUrl, originalBytes: fetched.buffer.length, contentType: fetched.contentType, dryRun: true });
    }
  } catch (error) {
    imageResults.set(imageUrl, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const applied = [];
const skipped = [];
for (const row of eligibleRows) {
  const result = imageResults.get(row.bestImageUrl);
  if (!result?.ok) {
    skipped.push({ key: row.key, sku: row.sku, sourceImageUrl: row.bestImageUrl, error: result?.error || 'missing-result' });
    continue;
  }

  if (!dryRun) {
    const previous = manifest.products[row.key];
    manifest.products[row.key] = {
      ...previous,
      status: row.bestStatus === 'exact' ? 'ready' : 'family-image',
      supplier: 'valtec',
      originalImage: previous?.originalImage || row.currentImage,
      sourceKind: result.sourceKind,
      sourceUrl: row.sourceUrl,
      sourceImageUrl: result.sourceImageUrl,
      duplicateCount: uniqueImages.get(row.bestImageUrl)?.length || 1,
      background: result.background,
      image: result.image,
      originalBytes: result.originalBytes,
      notes: [
        ...(previous?.notes || []).filter((note) => note !== 'fallback'),
        row.bestStatus === 'exact' ? 'valtec-source-exact-image' : 'valtec-source-family-image',
      ],
    };
  }
  applied.push({ key: row.key, sku: row.sku, status: row.bestStatus === 'exact' ? 'ready' : 'family-image', sourceImageUrl: row.bestImageUrl });
}

if (!dryRun) {
  const statuses = Object.values(manifest.products || {}).reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});
  manifest.generatedAt = new Date().toISOString();
  manifest.stats = {
    ...(manifest.stats || {}),
    valtecSourceImageBatch: {
      appliedAt: new Date().toISOString(),
      audit: path.relative(rootDir, auditPath),
      appliedProducts: applied.length,
      skippedProducts: skipped.length,
      uniqueImages: uniqueImages.size,
    },
    readyProducts: statuses.ready || 0,
    familyImageProducts: statuses['family-image'] || 0,
    missingProducts: (statuses.missing || 0) + (statuses.fallback || 0),
    errorProducts: statuses['source-error'] || 0,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const report = {
  checkedAt: new Date().toISOString(),
  dryRun,
  audit: path.relative(rootDir, auditPath),
  manifest: path.relative(rootDir, manifestPath),
  backup: dryRun ? null : path.relative(rootDir, backupPath),
  totals: {
    eligibleProducts: eligibleRows.length,
    uniqueImages: uniqueImages.size,
    downloadedImages: [...imageResults.values()].filter((result) => result.ok).length,
    failedImages: [...imageResults.values()].filter((result) => !result.ok).length,
    appliedProducts: applied.length,
    skippedProducts: skipped.length,
    exactProducts: applied.filter((row) => row.status === 'ready').length,
    familyProducts: applied.filter((row) => row.status === 'family-image').length,
  },
  imageResults: Object.fromEntries(imageResults),
  skipped,
};
const reportPath = path.join(reportDir, `valtec-source-image-apply-${timestamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, ...report.totals }, null, 2));
