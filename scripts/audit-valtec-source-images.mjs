#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

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

const catalogPath = path.join(rootDir, 'content/generated/legacy-catalog.json');
const manifestPath = args.get('manifest') || path.join(rootDir, 'content/generated/product-image-manifest.json');
const outputDir = args.get('output-dir') || path.join(rootDir, '.asset-store/reports');
const limit = Number(args.get('limit') || 0);
const delayMs = Number(args.get('delay-ms') || 200);
const timeoutMs = Number(args.get('timeout-ms') || 15000);
const statusFilter = args.get('status') || 'fallback';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function supplierSlug(product) {
  const sourceText = [
    product.brandName,
    product.brand,
    ...(product.sourceRefs || []).flatMap((ref) => [ref.label, ref.url]),
  ].join(' ').toLowerCase();
  return sourceText.includes('valtec') ? 'valtec' : 'other';
}

function manifestKeys(product) {
  return [`${product.categorySlug}/${product.slug}`, `${supplierSlug(product)}/${product.slug}`];
}

function manifestEntry(manifest, product) {
  for (const key of manifestKeys(product)) {
    const entry = manifest.products?.[key];
    if (entry) return { key, entry };
  }
  return { key: manifestKeys(product)[0], entry: null };
}

function sourceUrl(product) {
  return (product.sourceRefs || []).find((ref) => ref.type === 'supplier')?.url || '';
}

function normalizeSeries(value) {
  return String(value || '')
    .trim()
    .replace(/_fallback\.svg$/i, '')
    .replace(/_0\.(jpe?g|png|webp|gif|svg)$/i, '')
    .replace(/^.*\//, '')
    .toLowerCase();
}

function seriesCandidates(product) {
  const values = new Set();
  for (const value of [
    product.specs?.series,
    product.specs?.code,
    product.specs?.article,
    product.sku,
    product.vendorCode,
    product.image,
  ]) {
    const normalized = normalizeSeries(value);
    if (!normalized) continue;
    values.add(normalized);
    const parts = normalized.split('.');
    if (parts.length > 2) values.add(parts.slice(0, -1).join('.'));
    if (parts.length > 3) values.add(parts.slice(0, -2).join('.'));
  }
  return [...values].filter((value) => value.length >= 4);
}

function isValtecImageUrl(value) {
  return /^https:\/\/(?:www\.)?valtec\.ru\/image\/goods\//i.test(String(value || ''));
}

function absoluteValtecUrl(value) {
  let url = String(value || '').replace(/&amp;/g, '&').trim();
  if (!url) return '';
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = `https://valtec.ru${url}`;
  return url;
}

function extractImageCandidates(html, product) {
  const candidates = [];
  const add = (value, reason) => {
    const url = absoluteValtecUrl(value);
    if (!isValtecImageUrl(url)) return;
    if (candidates.some((candidate) => candidate.url === url)) return;
    candidates.push({ url, reason });
  };

  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) {
    add(match[1], 'meta');
  }
  for (const match of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) {
    add(match[1], 'meta');
  }
  for (const match of html.matchAll(/(?:src|href|data-src|content)=["']([^"']*\/image\/goods\/[^"']+)["']/gi)) {
    add(match[1], 'html');
  }
  for (const match of html.matchAll(/https?:\/\/(?:www\.)?valtec\.ru\/image\/goods\/[^\s"'<>]+/gi)) {
    add(match[0], 'raw');
  }

  for (const series of seriesCandidates(product)) {
    const encoded = encodeURIComponent(series);
    for (const size of ['800x800', '600x600', '400x400', '250x250', 'original']) {
      add(`https://valtec.ru/image/goods/${size}/${encoded}/${encoded}_0.jpg`, 'constructed-series');
    }
  }

  return candidates.sort((a, b) => scoreCandidate(a, product) - scoreCandidate(b, product));
}

function scoreCandidate(candidate, product) {
  const url = candidate.url.toLowerCase();
  let score = 100;
  if (candidate.reason === 'meta') score -= 30;
  if (candidate.reason === 'html') score -= 20;
  if (url.includes('/800x800/')) score -= 15;
  if (url.includes('/600x600/')) score -= 12;
  if (url.includes('/400x400/')) score -= 10;
  if (/_0\./.test(url)) score -= 6;
  for (const series of seriesCandidates(product)) {
    if (url.includes(series)) {
      score -= 40;
      break;
    }
  }
  return score;
}

function isImagePayload(result) {
  if (!result.ok || result.bytes < 512) return false;
  if (/^image\//i.test(result.contentType)) return true;
  const b = result.buffer;
  return (
    (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
    (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
    b.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 pumbum-store-v2-image-audit/1.0',
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      ms: Math.round(performance.now() - started),
      html: response.ok ? await response.text() : '',
      error: '',
    };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, ms: Math.round(performance.now() - started), html: '', error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchImage(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
        referer,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 pumbum-store-v2-image-audit/1.0',
      },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      bytes: buffer.length,
      ms: Math.round(performance.now() - started),
      buffer,
      error: '',
    };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: '', bytes: 0, ms: Math.round(performance.now() - started), buffer: Buffer.alloc(0), error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyCandidate(candidate, product) {
  const url = candidate.url.toLowerCase();
  const sku = normalizeSeries(product.sku || product.vendorCode || product.specs?.article || product.specs?.code);
  if (sku && url.includes(sku)) return 'exact';
  for (const series of seriesCandidates(product)) {
    if (url.includes(series)) return 'family';
  }
  return candidate.reason === 'meta' || candidate.reason === 'html' ? 'page-image-unmatched' : 'unmatched';
}

async function checkProduct(product, manifest, pageCache) {
  const { key, entry } = manifestEntry(manifest, product);
  const url = sourceUrl(product);
  const row = {
    key,
    sku: product.sku || product.vendorCode || '',
    name: product.name,
    currentStatus: entry?.status || '',
    currentImage: product.image || '',
    sourceUrl: url,
    pageStatus: '',
    pageMs: '',
    candidates: 0,
    bestStatus: 'missing',
    bestImageUrl: '',
    bestImageBytes: '',
    bestContentType: '',
    bestReason: '',
    error: '',
  };
  if (!url) {
    row.error = 'missing-source-url';
    return row;
  }

  if (!pageCache.has(url)) {
    pageCache.set(url, await fetchText(url));
    if (delayMs > 0) await sleep(delayMs);
  }
  const page = pageCache.get(url);
  row.pageStatus = page.status;
  row.pageMs = page.ms;
  if (!page.ok) {
    row.error = page.error || `page-${page.status}`;
    row.bestStatus = 'blocked-page';
    return row;
  }

  const candidates = extractImageCandidates(page.html, product).slice(0, 10);
  row.candidates = candidates.length;
  for (const candidate of candidates) {
    const image = await fetchImage(candidate.url, url);
    if (delayMs > 0) await sleep(Math.min(delayMs, 150));
    if (!isImagePayload(image)) continue;
    row.bestImageUrl = candidate.url;
    row.bestImageBytes = image.bytes;
    row.bestContentType = image.contentType;
    row.bestReason = candidate.reason;
    row.bestStatus = classifyCandidate(candidate, product);
    return row;
  }

  row.error = candidates.length ? 'no-fetchable-image-candidate' : 'no-image-candidates';
  return row;
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const valtecProducts = (catalog.products || []).filter((product) => supplierSlug(product) === 'valtec');
const selected = valtecProducts.filter((product) => {
  const { entry } = manifestEntry(manifest, product);
  if (statusFilter === 'all') return true;
  return entry?.status === statusFilter;
});
const products = limit > 0 ? selected.slice(0, limit) : selected;
const pageCache = new Map();
const rows = [];

for (const [index, product] of products.entries()) {
  const row = await checkProduct(product, manifest, pageCache);
  rows.push(row);
  console.log(`[audit-valtec-source-images] ${index + 1}/${products.length} ${row.sku} ${row.bestStatus} ${row.bestImageUrl || row.error}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const suffix = statusFilter === 'all' ? 'all' : statusFilter;
const jsonPath = path.join(outputDir, `valtec-source-image-audit-${suffix}.json`);
const csvPath = path.join(outputDir, `valtec-source-image-audit-${suffix}.csv`);
const summary = {
  checkedAt: new Date().toISOString(),
  statusFilter,
  totalValtecProducts: valtecProducts.length,
  selectedProducts: selected.length,
  checkedProducts: rows.length,
  uniqueSourcePages: pageCache.size,
  byBestStatus: rows.reduce((acc, row) => {
    acc[row.bestStatus] = (acc[row.bestStatus] || 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, rows }, null, 2)}\n`);
fs.writeFileSync(
  csvPath,
  `${[
    'key',
    'sku',
    'name',
    'currentStatus',
    'currentImage',
    'sourceUrl',
    'pageStatus',
    'candidates',
    'bestStatus',
    'bestImageUrl',
    'bestImageBytes',
    'bestContentType',
    'bestReason',
    'error',
  ].join(',')}\n${rows
    .map((row) =>
      [
        row.key,
        row.sku,
        row.name,
        row.currentStatus,
        row.currentImage,
        row.sourceUrl,
        row.pageStatus,
        row.candidates,
        row.bestStatus,
        row.bestImageUrl,
        row.bestImageBytes,
        row.bestContentType,
        row.bestReason,
        row.error,
      ].map(csvCell).join(','),
    )
    .join('\n')}\n`,
);

console.log(JSON.stringify({ summary, jsonPath, csvPath }, null, 2));
