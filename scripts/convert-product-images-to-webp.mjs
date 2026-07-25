#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

const dryRun = args.get('dry-run') === 'true';
const pruneOriginals = args.get('prune-originals') === 'true';
const publicRoot = path.resolve(args.get('public-root') || '../public');
const catalogPath = path.resolve(args.get('catalog') || 'content/generated/legacy-catalog.json');
const manifestPath = path.resolve(args.get('manifest') || 'content/generated/product-image-manifest.json');
const reportDir = path.resolve(args.get('report-dir') || '.asset-store/reports');
const minSavingBytes = Number(args.get('min-saving-bytes') || 1024);
const limit = Number(args.get('limit') || 0);
const effort = Math.max(0, Math.min(6, Number(args.get('effort') || 3)));
const maxSourceBytes = Number(args.get('max-source-bytes') || 0);
const onlyRefs = new Set(String(args.get('only') || '').split(',').map((item) => item.trim()).filter(Boolean));
const productPrefix = '/images/products/';
const convertibleExts = new Set(['.png', '.jpg', '.jpeg']);

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch (error) {
    const nodePath = process.env.NODE_PATH;
    if (!nodePath) throw error;
    const candidates = nodePath.split(path.delimiter).filter(Boolean);
    for (const dir of candidates) {
      try {
        const mod = await import(pathToFileURL(path.join(dir, 'sharp', 'lib', 'index.js')).href);
        return mod.default;
      } catch {
        // try next NODE_PATH entry
      }
    }
    throw error;
  }
}

function isLocalProductImage(value) {
  if (typeof value !== 'string') return false;
  if (!value.startsWith(productPrefix)) return false;
  return convertibleExts.has(path.extname(value).toLowerCase());
}

function nextWebpPath(value) {
  return value.replace(/\.(png|jpe?g)([?#].*)?$/i, '.webp$2');
}

function collectRuntimeRefs(catalog, manifest) {
  const refs = new Set();

  for (const product of catalog.products ?? []) {
    if (isLocalProductImage(product.image)) refs.add(product.image);
  }

  for (const entry of Object.values(manifest.products ?? {})) {
    if (isLocalProductImage(entry?.image?.card)) refs.add(entry.image.card);
    if (isLocalProductImage(entry?.image?.detail)) refs.add(entry.image.detail);
  }

  return Array.from(refs).sort();
}

function rewriteRuntimeRefs(catalog, manifest, replacements) {
  let updated = 0;

  for (const product of catalog.products ?? []) {
    const replacement = replacements.get(product.image);
    if (replacement) {
      product.image = replacement;
      updated += 1;
    }
  }

  for (const entry of Object.values(manifest.products ?? {})) {
    if (!entry?.image) continue;
    const cardReplacement = replacements.get(entry.image.card);
    const detailReplacement = replacements.get(entry.image.detail);
    if (cardReplacement) {
      entry.image.card = cardReplacement;
      updated += 1;
    }
    if (detailReplacement) {
      entry.image.detail = detailReplacement;
      updated += 1;
    }
  }

  return updated;
}

async function fileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return undefined;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data)}\n`);
}

const sharp = dryRun ? undefined : await loadSharp();
const [catalogRaw, manifestRaw] = await Promise.all([
  fs.readFile(catalogPath, 'utf8'),
  fs.readFile(manifestPath, 'utf8'),
]);
const catalog = JSON.parse(catalogRaw);
const manifest = JSON.parse(manifestRaw);
const refs = collectRuntimeRefs(catalog, manifest);
const filteredRefs = onlyRefs.size > 0 ? refs.filter((ref) => onlyRefs.has(ref)) : refs;
const selectedRefs = limit > 0 ? filteredRefs.slice(0, limit) : filteredRefs;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

await fs.mkdir(reportDir, { recursive: true });
if (!dryRun) {
  await fs.copyFile(catalogPath, path.join(reportDir, `legacy-catalog-before-webp-convert-${timestamp}.json`));
  await fs.copyFile(manifestPath, path.join(reportDir, `product-image-manifest-before-webp-convert-${timestamp}.json`));
}

const rows = [];
const replacements = new Map();

for (const publicPath of selectedRefs) {
  const sourcePath = path.join(publicRoot, publicPath.replace(/^\//, ''));
  const targetPublicPath = nextWebpPath(publicPath);
  const targetPath = path.join(publicRoot, targetPublicPath.replace(/^\//, ''));
  const sourceSize = await fileSize(sourcePath);

  if (!sourceSize) {
    rows.push({ publicPath, targetPublicPath, status: 'missing-source' });
    continue;
  }

  if (maxSourceBytes > 0 && sourceSize > maxSourceBytes) {
    rows.push({
      publicPath,
      targetPublicPath,
      status: 'skipped-too-large',
      sourceSize,
    });
    continue;
  }

  if (dryRun) {
    rows.push({
      publicPath,
      targetPublicPath,
      status: 'dry-run-candidate',
      sourceSize,
    });
    continue;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tempPath = `${targetPath}.tmp-${process.pid}`;

  try {
    const meta = await sharp(sourcePath, { failOn: 'none', limitInputPixels: false })
      .rotate()
      .webp({ lossless: true, effort })
      .toFile(tempPath);
    const targetSize = await fileSize(tempPath);
    const savingBytes = sourceSize - (targetSize ?? 0);

    if (!targetSize || savingBytes < minSavingBytes) {
      await fs.rm(tempPath, { force: true });
      rows.push({
        publicPath,
        targetPublicPath,
        status: 'skipped-not-smaller',
        sourceSize,
        targetSize,
        savingBytes,
        width: meta.width,
        height: meta.height,
      });
      continue;
    }

    await fs.rename(tempPath, targetPath);
    replacements.set(publicPath, targetPublicPath);
    rows.push({
      publicPath,
      targetPublicPath,
      status: 'converted',
      sourceSize,
      targetSize,
      savingBytes,
      width: meta.width,
      height: meta.height,
      hasAlpha: meta.channels === 4,
    });
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    rows.push({
      publicPath,
      targetPublicPath,
      status: 'error',
      sourceSize,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

let updatedRefs = 0;
if (!dryRun && replacements.size > 0) {
  updatedRefs = rewriteRuntimeRefs(catalog, manifest, replacements);
  await writeJson(catalogPath, catalog);
  await writeJson(manifestPath, manifest);
}

let prunedOriginals = 0;
let prunedBytes = 0;
if (!dryRun && pruneOriginals && replacements.size > 0) {
  for (const oldPublicPath of replacements.keys()) {
    const oldPath = path.join(publicRoot, oldPublicPath.replace(/^\//, ''));
    if (await exists(oldPath)) {
      const size = await fileSize(oldPath);
      await fs.rm(oldPath);
      prunedOriginals += 1;
      prunedBytes += size ?? 0;
    }
  }
}

const summary = {
  checkedAt: new Date().toISOString(),
  dryRun,
  pruneOriginals,
  effort,
  publicRoot: path.relative(rootDir, publicRoot),
  catalog: path.relative(rootDir, catalogPath),
  manifest: path.relative(rootDir, manifestPath),
  totalRuntimeRefs: refs.length,
  filteredRuntimeRefs: filteredRefs.length,
  selectedRefs: selectedRefs.length,
  converted: rows.filter((row) => row.status === 'converted').length,
  skippedNotSmaller: rows.filter((row) => row.status === 'skipped-not-smaller').length,
  missingSource: rows.filter((row) => row.status === 'missing-source').length,
  skippedTooLarge: rows.filter((row) => row.status === 'skipped-too-large').length,
  errors: rows.filter((row) => row.status === 'error').length,
  updatedRefs,
  prunedOriginals,
  sourceBytes: rows.reduce((sum, row) => sum + (row.sourceSize ?? 0), 0),
  targetBytes: rows.reduce((sum, row) => sum + (row.targetSize ?? 0), 0),
  savedTrafficBytes: rows.reduce((sum, row) => sum + Math.max(0, row.savingBytes ?? 0), 0),
  prunedBytes,
};

const reportPath = path.join(reportDir, `webp-convert-${timestamp}.json`);
const csvPath = path.join(reportDir, `webp-convert-${timestamp}.csv`);
await fs.writeFile(reportPath, `${JSON.stringify({ summary, rows }, null, 2)}\n`);
const csvRows = [
  ['status', 'publicPath', 'targetPublicPath', 'sourceSize', 'targetSize', 'savingBytes', 'width', 'height', 'hasAlpha', 'error'],
  ...rows.map((row) => [
    row.status,
    row.publicPath,
    row.targetPublicPath,
    row.sourceSize ?? '',
    row.targetSize ?? '',
    row.savingBytes ?? '',
    row.width ?? '',
    row.height ?? '',
    row.hasAlpha ?? '',
    row.error ?? '',
  ]),
];
await fs.writeFile(csvPath, `${csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')}\n`);

console.log(JSON.stringify({
  ...summary,
  report: path.relative(rootDir, reportPath),
  csv: path.relative(rootDir, csvPath),
}, null, 2));
