import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) result.set(item.slice(2), 'true');
    else {
      result.set(item.slice(2), next);
      index += 1;
    }
  }
  return result;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`);
}

function fileForPublicPath(publicRoot, publicPath) {
  if (!publicPath?.startsWith('/') || publicPath.includes('..')) return undefined;
  return path.join(publicRoot, publicPath.slice(1));
}

function outputPublicPath(publicRoot, filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`;
}

function safeName(value) {
  return String(value ?? 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'image';
}

function borderProfile(data, width, height, channels) {
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 180));
  const push = (x, y) => {
    const offset = (y * width + x) * channels;
    samples.push([data[offset], data[offset + 1], data[offset + 2]]);
  };
  for (let x = 0; x < width; x += step) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = step; y < height - step; y += step) {
    push(0, y);
    push(width - 1, y);
  }
  const sorted = [0, 1, 2].map((channel) => samples.map((sample) => sample[channel]).sort((a, b) => a - b));
  const median = sorted.map((values) => values[Math.floor(values.length / 2)]);
  const distances = samples.map(([r, g, b]) => Math.hypot(r - median[0], g - median[1], b - median[2]));
  const meanDistance = distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length);
  const brightness = (median[0] + median[1] + median[2]) / 3;
  const chroma = Math.max(...median) - Math.min(...median);
  return { median, meanDistance, brightness, chroma };
}

function countAlpha(data, channels) {
  if (channels < 4) return { transparentRatio: 0, partialRatio: 0, lightPartialRatio: 0 };
  let transparent = 0;
  let partial = 0;
  let lightPartial = 0;
  const pixels = data.length / channels;
  for (let offset = 3; offset < data.length; offset += channels) {
    const alpha = data[offset];
    if (alpha < 8) transparent += 1;
    else if (alpha < 247) {
      partial += 1;
      const colorOffset = offset - 3;
      const r = data[colorOffset];
      const g = data[colorOffset + 1];
      const b = data[colorOffset + 2];
      if (Math.min(r, g, b) >= 220 && Math.max(r, g, b) - Math.min(r, g, b) <= 30) lightPartial += 1;
    }
  }
  return { transparentRatio: transparent / pixels, partialRatio: partial / pixels, lightPartialRatio: lightPartial / pixels };
}

function dehaloTransparentEdges(input, width, height, channels) {
  const output = Buffer.from(input);
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  let originalOpaquePixels = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const alpha = output[pixel * channels + 3];
    if (alpha >= 247) originalOpaquePixels += 1;
    if (alpha < 8) {
      visited[pixel] = 1;
      queue[tail++] = pixel;
    }
  }
  const visit = (pixel) => {
    if (visited[pixel]) return;
    const offset = pixel * channels;
    const r = output[offset];
    const g = output[offset + 1];
    const b = output[offset + 2];
    const alpha = output[offset + 3];
    const lightNeutral = Math.min(r, g, b) >= 185 && Math.max(r, g, b) - Math.min(r, g, b) <= 80;
    if (alpha >= 247 && !lightNeutral) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) visit(pixel - 1);
    if (x + 1 < width) visit(pixel + 1);
    if (y > 0) visit(pixel - width);
    if (y + 1 < height) visit(pixel + width);
  }
  let adjustedPixels = 0;
  let removedOpaquePixels = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (!visited[pixel]) continue;
    const offset = pixel * channels;
    const r = output[offset];
    const g = output[offset + 1];
    const b = output[offset + 2];
    const lightNeutral = Math.min(r, g, b) >= 185 && Math.max(r, g, b) - Math.min(r, g, b) <= 80;
    if (!lightNeutral) continue;
    if (output[offset + 3] >= 247) removedOpaquePixels += 1;
    output[offset + 3] = 0;
    adjustedPixels += 1;
  }
  const removedOpaqueRatio = removedOpaquePixels / Math.max(1, originalOpaquePixels);
  if (removedOpaqueRatio > 0.08) return { output: Buffer.from(input), adjustedPixels: 0, skippedUnsafeDehalo: true };
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * channels;
    const alpha = output[offset + 3];
    if (alpha <= 8 || alpha >= 247) continue;
    const normalizedAlpha = Math.max(alpha / 255, 0.05);
    output[offset] = Math.max(0, Math.min(255, Math.round((output[offset] - 255 * (1 - normalizedAlpha)) / normalizedAlpha)));
    output[offset + 1] = Math.max(0, Math.min(255, Math.round((output[offset + 1] - 255 * (1 - normalizedAlpha)) / normalizedAlpha)));
    output[offset + 2] = Math.max(0, Math.min(255, Math.round((output[offset + 2] - 255 * (1 - normalizedAlpha)) / normalizedAlpha)));
  }
  const labels = new Int32Array(pixels);
  const componentSizes = [0];
  const componentLightPixels = [0];
  let component = 0;
  for (let seed = 0; seed < pixels; seed += 1) {
    if (labels[seed] || output[seed * channels + 3] <= 8) continue;
    component += 1;
    let componentHead = 0;
    let componentTail = 0;
    queue[componentTail++] = seed;
    labels[seed] = component;
    let size = 0;
    let light = 0;
    while (componentHead < componentTail) {
      const pixel = queue[componentHead++];
      size += 1;
      const offset = pixel * channels;
      const r = output[offset];
      const g = output[offset + 1];
      const b = output[offset + 2];
      if (Math.min(r, g, b) >= 185 && Math.max(r, g, b) - Math.min(r, g, b) <= 80) light += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const add = (neighbor) => {
        if (labels[neighbor] || output[neighbor * channels + 3] <= 8) return;
        labels[neighbor] = component;
        queue[componentTail++] = neighbor;
      };
      if (x > 0) add(pixel - 1);
      if (x + 1 < width) add(pixel + 1);
      if (y > 0) add(pixel - width);
      if (y + 1 < height) add(pixel + width);
    }
    componentSizes[component] = size;
    componentLightPixels[component] = light;
  }
  let largestComponent = 0;
  for (const size of componentSizes) largestComponent = Math.max(largestComponent, size);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const label = labels[pixel];
    if (!label || componentSizes[label] >= largestComponent * 0.05) continue;
    if (componentLightPixels[label] / Math.max(1, componentSizes[label]) < 0.9) continue;
    output[pixel * channels + 3] = 0;
    adjustedPixels += 1;
  }
  return { output, adjustedPixels, skippedUnsafeDehalo: false };
}

function removeConnectedBackground(input, width, height, channels, background) {
  const output = Buffer.from(input);
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const [backgroundR, backgroundG, backgroundB] = background;
  const distanceAt = (pixel) => {
    const offset = pixel * channels;
    return Math.hypot(output[offset] - backgroundR, output[offset + 1] - backgroundG, output[offset + 2] - backgroundB);
  };
  const enqueue = (pixel) => {
    if (visited[pixel] || distanceAt(pixel) > 58) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }
  let removed = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (!visited[pixel]) continue;
    const offset = pixel * channels;
    const distance = distanceAt(pixel);
    const alpha = distance <= 12 ? 0 : Math.round(Math.min(1, (distance - 12) / 34) * 255);
    output[offset + 3] = Math.min(output[offset + 3], alpha);
    if (alpha < 8) removed += 1;
    if (alpha > 0 && alpha < 255) {
      const normalizedAlpha = alpha / 255;
      output[offset] = Math.max(0, Math.min(255, Math.round((output[offset] - backgroundR * (1 - normalizedAlpha)) / normalizedAlpha)));
      output[offset + 1] = Math.max(0, Math.min(255, Math.round((output[offset + 1] - backgroundG * (1 - normalizedAlpha)) / normalizedAlpha)));
      output[offset + 2] = Math.max(0, Math.min(255, Math.round((output[offset + 2] - backgroundB * (1 - normalizedAlpha)) / normalizedAlpha)));
    }
  }
  return { output, removedRatio: removed / pixels };
}

async function inspectSource(filePath, includeSharpness) {
  const image = sharp(filePath, { limitInputPixels: false }).rotate();
  const metadata = await image.metadata();
  const stats = includeSharpness ? await image.clone().greyscale().stats() : undefined;
  const raw = await image.resize({ width: 1400, height: 1050, fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = countAlpha(raw.data, raw.info.channels);
  const border = borderProfile(raw.data, raw.info.width, raw.info.height, raw.info.channels);
  return { metadata, sharpness: stats?.sharpness ?? null, raw, alpha, border };
}

async function writeTransparentPair(sourcePath, outputRoot, publicRoot, sourcePublicPath, inspection, mode) {
  const hash = crypto.createHash('sha1').update(sourcePublicPath).update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 16);
  const base = path.join(outputRoot, `${safeName(path.basename(sourcePath, path.extname(sourcePath)))}-${hash}`);
  let sourceData = inspection.raw.data;
  let sourceInfo = inspection.raw.info;
  if (mode === 'flatten-background') {
    const flattened = await sharp(sourceData, { raw: sourceInfo })
      .flatten({ background: '#ffffff' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    sourceData = flattened.data;
    sourceInfo = flattened.info;
  }
  const transformed = mode === 'dehalo'
    ? dehaloTransparentEdges(sourceData, sourceInfo.width, sourceInfo.height, sourceInfo.channels)
    : removeConnectedBackground(sourceData, sourceInfo.width, sourceInfo.height, sourceInfo.channels, mode === 'flatten-background' ? [255, 255, 255] : inspection.border.median);
  if (mode !== 'dehalo' && (transformed.removedRatio < 0.04 || transformed.removedRatio > 0.93)) {
    throw new Error(`unsafe-subject-coverage:${transformed.removedRatio.toFixed(4)}`);
  }
  if (mode === 'flatten-background') {
    let originalSubjectPixels = 0;
    let removedSubjectPixels = 0;
    for (let pixel = 0; pixel < inspection.raw.info.width * inspection.raw.info.height; pixel += 1) {
      const originalAlpha = inspection.raw.data[pixel * inspection.raw.info.channels + 3];
      if (originalAlpha <= 8) continue;
      originalSubjectPixels += 1;
      if (transformed.output[pixel * sourceInfo.channels + 3] <= 8) removedSubjectPixels += 1;
    }
    const removedSubjectRatio = removedSubjectPixels / Math.max(1, originalSubjectPixels);
    if (removedSubjectRatio > 0.08) throw new Error(`unsafe-dehalo-subject-loss:${removedSubjectRatio.toFixed(4)}`);
  }
  const raw = sharp(transformed.output, { raw: sourceInfo });
  const background = { r: 255, g: 255, b: 255, alpha: 0 };
  const detailPath = `${base}-detail.webp`;
  const cardPath = `${base}-card.webp`;
  await raw.clone().resize({ width: 1100, height: 825, fit: 'contain', background }).webp({ quality: 86, effort: 4, alphaQuality: 100 }).toFile(detailPath);
  await raw.resize({ width: 480, height: 360, fit: 'contain', background }).webp({ quality: 84, effort: 4, alphaQuality: 100 }).toFile(cardPath);
  return {
    removedRatio: transformed.removedRatio ?? '',
    adjustedPixels: transformed.adjustedPixels ?? 0,
    detail: outputPublicPath(publicRoot, detailPath),
    card: outputPublicPath(publicRoot, cardPath),
  };
}

const args = parseArgs(process.argv.slice(2));
const processImages = args.has('process');
const publicRoot = path.resolve(args.get('public-root') ?? 'public');
const outputRoot = path.resolve(args.get('output-root') ?? path.join(publicRoot, 'images/products/_transparent-v1'));
const reportDir = path.resolve(args.get('report-dir') ?? '.asset-store/reports-transparent-v1');
const manifestPath = path.resolve(args.get('manifest') ?? 'content/generated/product-image-manifest.json');
const overridesPath = path.resolve(args.get('overrides') ?? 'content/generated/product-transparent-image-overrides.json');
const limit = Number(args.get('limit') ?? 0);
const match = args.get('match') ?? '';
if (!outputRoot.startsWith(publicRoot)) throw new Error('output-root must resolve inside public-root');
fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const currentOverrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {};
const sources = new Map();
for (const [key, entry] of Object.entries(manifest.products ?? {})) {
  if (!['ready', 'family-image'].includes(entry.status)) continue;
  const detail = entry.image?.detail ?? entry.image?.card;
  if (!detail || !detail.startsWith('/')) continue;
  const record = sources.get(detail) ?? { detail, card: entry.image?.card, keys: [], names: [], skus: [], brands: [] };
  record.keys.push(key);
  if (entry.originalImage) record.names.push(entry.originalImage);
  if (entry.supplier) record.brands.push(entry.supplier);
  sources.set(detail, record);
}

const rows = [];
const overrides = { ...currentOverrides };
let inspected = 0;
const selectedSources = [...sources.values()].filter((source) => !match || source.detail.includes(match));
for (const source of selectedSources.slice(0, limit > 0 ? limit : undefined)) {
  const filePath = fileForPublicPath(publicRoot, source.detail);
  const row = {
    source: source.detail,
    products: source.keys.length,
    keys: source.keys.join('; '),
    status: 'unknown',
    width: 0,
    height: 0,
    sharpness: '',
    transparentRatio: 0,
    lightPartialRatio: 0,
    borderBrightness: 0,
    borderVariation: 0,
    removedRatio: '',
    adjustedPixels: 0,
    issues: [],
  };
  try {
    if (!filePath || !fs.existsSync(filePath)) throw new Error('source-file-missing');
    const inspection = await inspectSource(filePath, !processImages);
    row.width = inspection.metadata.width ?? 0;
    row.height = inspection.metadata.height ?? 0;
    row.sharpness = inspection.sharpness === null ? '' : inspection.sharpness.toFixed(4);
    row.transparentRatio = Number(inspection.alpha.transparentRatio.toFixed(5));
    row.lightPartialRatio = Number(inspection.alpha.lightPartialRatio.toFixed(6));
    row.borderBrightness = Number(inspection.border.brightness.toFixed(2));
    row.borderVariation = Number(inspection.border.meanDistance.toFixed(2));
    if (row.width < 640 || row.height < 480) row.issues.push('low-resolution');
    if (inspection.sharpness !== null && inspection.sharpness < 1.2) row.issues.push('low-sharpness');
    if (inspection.alpha.transparentRatio > 0.01) {
      row.status = 'already-transparent';
      if (processImages && inspection.alpha.lightPartialRatio > 0.00005) {
        const generated = await writeTransparentPair(filePath, outputRoot, publicRoot, source.detail, inspection, 'flatten-background');
        row.status = 'processed-transparent';
        row.adjustedPixels = generated.adjustedPixels;
        overrides[source.detail] = { detail: generated.detail, card: generated.card };
        if (source.card) overrides[source.card] = { detail: generated.detail, card: generated.card };
      }
    } else {
      const safeBorder = inspection.border.brightness >= 205 && inspection.border.chroma <= 28 && inspection.border.meanDistance <= 26;
      row.status = safeBorder ? 'safe-light-background' : 'manual-review-background';
      if (safeBorder && processImages) {
        const generated = await writeTransparentPair(filePath, outputRoot, publicRoot, source.detail, inspection, 'background');
        row.status = 'processed-transparent';
        row.removedRatio = generated.removedRatio.toFixed(5);
        overrides[source.detail] = { detail: generated.detail, card: generated.card };
        if (source.card) overrides[source.card] = { detail: generated.detail, card: generated.card };
      } else if (!safeBorder) {
        row.issues.push('non-uniform-or-non-light-background');
      }
    }
  } catch (error) {
    row.status = 'failed';
    row.issues.push(error instanceof Error ? error.message : String(error));
  }
  rows.push(row);
  inspected += 1;
  if (inspected % 100 === 0) console.log(`inspected ${inspected}/${sources.size}`);
}

if (processImages) {
  const backupPath = path.join(reportDir, `product-transparent-image-overrides.before-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(currentOverrides, null, 2));
  fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
}
const problemRows = rows.filter((row) => row.issues.some((issue) => issue === 'low-resolution' || issue === 'low-sharpness'));
const reviewRows = rows.filter((row) => ['manual-review-background', 'failed'].includes(row.status));
const columns = ['source', 'products', 'keys', 'status', 'width', 'height', 'sharpness', 'transparentRatio', 'lightPartialRatio', 'borderBrightness', 'borderVariation', 'removedRatio', 'adjustedPixels', 'issues'];
const toCsvRow = (row) => columns.map((column) => column === 'issues' ? row.issues.join('; ') : row[column]);
writeCsv(path.join(reportDir, 'product-image-quality-problems.csv'), [columns, ...problemRows.map(toCsvRow)]);
writeCsv(path.join(reportDir, 'product-image-transparency-review.csv'), [columns, ...reviewRows.map(toCsvRow)]);
fs.writeFileSync(path.join(reportDir, 'product-image-transparency-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), processImages, totalUniqueSources: sources.size, inspected: rows.length, summary: Object.fromEntries([...new Set(rows.map((row) => row.status))].map((status) => [status, rows.filter((row) => row.status === status).length])), qualityProblems: problemRows.length, manualReview: reviewRows.length, rows }, null, 2));
console.log(JSON.stringify({ processImages, totalUniqueSources: sources.size, inspected: rows.length, summary: Object.fromEntries([...new Set(rows.map((row) => row.status))].map((status) => [status, rows.filter((row) => row.status === status).length])), qualityProblems: problemRows.length, manualReview: reviewRows.length, reportDir, overrides: processImages ? overridesPath : undefined }, null, 2));
