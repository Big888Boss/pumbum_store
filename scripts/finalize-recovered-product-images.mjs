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
    .slice(0, 80) || 'image';
}

function outputPublicPath(publicRoot, filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`;
}

function alphaAndHaloStats(data, channels) {
  let transparent = 0;
  let opaque = 0;
  let partial = 0;
  let lightPartial = 0;
  const pixels = data.length / channels;
  for (let offset = 0; offset < data.length; offset += channels) {
    const alpha = data[offset + 3];
    if (alpha <= 8) transparent += 1;
    else if (alpha >= 247) opaque += 1;
    else {
      partial += 1;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (Math.min(r, g, b) >= 215 && Math.max(r, g, b) - Math.min(r, g, b) <= 45) lightPartial += 1;
    }
  }
  return {
    transparentRatio: transparent / pixels,
    subjectRatio: (opaque + partial) / pixels,
    partialRatio: partial / pixels,
    lightPartialRatio: lightPartial / pixels,
  };
}

function removeWhiteMatte(data, channels) {
  const output = Buffer.from(data);
  let adjustedPixels = 0;
  for (let offset = 0; offset < output.length; offset += channels) {
    const alpha = output[offset + 3];
    if (alpha <= 8 || alpha >= 247) continue;
    const normalized = Math.max(alpha / 255, 0.04);
    const original = [output[offset], output[offset + 1], output[offset + 2]];
    const unmatted = original.map((value) => Math.max(0, Math.min(255, Math.round((value - 255 * (1 - normalized)) / normalized))));
    if (Math.max(...original) >= 210 || Math.max(...original) - Math.min(...original) <= 55) {
      output[offset] = unmatted[0];
      output[offset + 1] = unmatted[1];
      output[offset + 2] = unmatted[2];
      adjustedPixels += 1;
    }
  }
  return { output, adjustedPixels };
}

async function normalizedSubjectBuffer(filePath) {
  const decoded = await sharp(filePath, { limitInputPixels: false })
    .rotate()
    .resize({ width: 1800, height: 1350, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const before = alphaAndHaloStats(decoded.data, decoded.info.channels);
  if (before.subjectRatio < 0.015 || before.subjectRatio > 0.94) throw new Error(`unsafe-subject-ratio:${before.subjectRatio.toFixed(4)}`);
  const cleaned = removeWhiteMatte(decoded.data, decoded.info.channels);
  const trimmed = await sharp(cleaned.output, { raw: decoded.info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .png()
    .toBuffer({ resolveWithObject: true });
  if (!trimmed.info.width || !trimmed.info.height) throw new Error('empty-after-trim');
  return { buffer: trimmed.data, width: trimmed.info.width, height: trimmed.info.height, before, adjustedPixels: cleaned.adjustedPixels };
}

async function writePair(subject, outputBase, publicRoot) {
  const background = { r: 255, g: 255, b: 255, alpha: 0 };
  const detailPath = `${outputBase}-detail.webp`;
  const cardPath = `${outputBase}-card.webp`;
  const detailInner = { width: 990, height: 718 };
  const cardInner = { width: 430, height: 314 };
  const input = sharp(subject.buffer, { limitInputPixels: false });
  const detailSubject = await input.clone().resize({ ...detailInner, fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const detailMeta = await sharp(detailSubject).metadata();
  const detailLeft = Math.max(0, Math.floor((1100 - (detailMeta.width ?? 0)) / 2) - 18);
  const detailTop = Math.max(0, Math.floor((825 - (detailMeta.height ?? 0)) / 2) + 10);
  await sharp({ create: { width: 1100, height: 825, channels: 4, background } })
    .composite([{ input: detailSubject, left: detailLeft, top: detailTop }])
    .webp({ quality: 88, effort: 4, alphaQuality: 100 })
    .toFile(detailPath);
  const cardSubject = await input.resize({ ...cardInner, fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const cardMeta = await sharp(cardSubject).metadata();
  const cardLeft = Math.max(0, Math.floor((480 - (cardMeta.width ?? 0)) / 2) - 8);
  const cardTop = Math.max(0, Math.floor((360 - (cardMeta.height ?? 0)) / 2) + 4);
  await sharp({ create: { width: 480, height: 360, channels: 4, background } })
    .composite([{ input: cardSubject, left: cardLeft, top: cardTop }])
    .webp({ quality: 86, effort: 4, alphaQuality: 100 })
    .toFile(cardPath);
  const validation = await sharp(detailPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const stats = alphaAndHaloStats(validation.data, validation.info.channels);
  if (stats.subjectRatio < 0.02 || stats.subjectRatio > 0.82) throw new Error(`unsafe-final-subject-ratio:${stats.subjectRatio.toFixed(4)}`);
  return {
    detail: outputPublicPath(publicRoot, detailPath),
    card: outputPublicPath(publicRoot, cardPath),
    detailPath,
    cardPath,
    stats,
  };
}

async function createContactSheet(accepted, outputPath) {
  const selected = accepted.slice(0, 40);
  if (!selected.length) return;
  const tileWidth = 300;
  const tileHeight = 235;
  const columns = 4;
  const rows = Math.ceil(selected.length / columns);
  const background = { r: 9, g: 18, b: 34, alpha: 1 };
  const composites = [];
  for (let index = 0; index < selected.length; index += 1) {
    const tile = await sharp(selected[index].detailPath)
      .resize({ width: tileWidth - 12, height: tileHeight - 12, fit: 'contain', background })
      .png()
      .toBuffer();
    composites.push({ input: tile, left: (index % columns) * tileWidth + 6, top: Math.floor(index / columns) * tileHeight + 6 });
  }
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 4, background } })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

const args = parseArgs(process.argv.slice(2));
const publicRoot = path.resolve(args.get('public-root') ?? 'public');
const outputRoot = path.resolve(args.get('output-root') ?? path.join(publicRoot, 'images/products/_transparent-v2'));
const sourceManifestPath = path.resolve(args.get('source-manifest') ?? '.asset-store/reports-source-recovery-v2/source-recovery-manifest.json');
const visionReportPath = path.resolve(args.get('vision-report') ?? '.asset-store/vision-v2/vision-report.json');
const visionRoot = path.resolve(args.get('vision-root') ?? path.dirname(visionReportPath));
const manifestPath = path.resolve(args.get('manifest') ?? 'content/generated/product-image-manifest.json');
const overridesPath = path.resolve(args.get('overrides') ?? 'content/generated/product-transparent-image-overrides.json');
const reportDir = path.resolve(args.get('report-dir') ?? '.asset-store/reports-transparent-v2');
const reviewDecisionsPath = args.get('white-edge-decisions') ? path.resolve(args.get('white-edge-decisions')) : '';
if (!outputRoot.startsWith(publicRoot)) throw new Error('output-root must resolve inside public-root');
fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });
const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const visionReport = JSON.parse(fs.readFileSync(visionReportPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const currentOverrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
const reviewDecisions = reviewDecisionsPath && fs.existsSync(reviewDecisionsPath)
  ? JSON.parse(fs.readFileSync(reviewDecisionsPath, 'utf8'))
  : { default: 'review', rejected: [] };
const rejectedWhiteEdges = new Set(reviewDecisions.rejected ?? []);
const sourceRows = new Map(sourceManifest.rows.map((row) => [row.source, row]));
const visionRows = new Map(visionReport.rows.map((row) => [row.source, row]));
const sourceCards = new Map();
for (const entry of Object.values(manifest.products ?? {})) {
  if (!entry.image?.detail) continue;
  if (!sourceCards.has(entry.image.detail)) sourceCards.set(entry.image.detail, new Set());
  if (entry.image.card) sourceCards.get(entry.image.detail).add(entry.image.card);
}
const overrides = { ...currentOverrides };
const results = [];
for (const sourceRow of sourceManifest.rows) {
  const source = sourceRow.source;
  const vision = visionRows.get(source);
  const result = {
    source,
    status: 'rejected',
    qualityFlag: Boolean(sourceRow.qualityFlag),
    reviewFlag: Boolean(sourceRow.reviewFlag),
    supplier: sourceRow.supplier,
    productName: sourceRow.productName,
    skuCandidates: sourceRow.skuCandidates,
    recoveryKind: sourceRow.recoveryKind,
    confidence: sourceRow.confidence,
    originalWidth: sourceRow.width,
    originalHeight: sourceRow.height,
    outputDetail: '',
    outputCard: '',
    subjectRatio: '',
    lightPartialRatio: '',
    adjustedPixels: 0,
    error: '',
  };
  try {
    if (sourceRow.status !== 'recovered') throw new Error(sourceRow.error || 'source-not-recovered');
    if (sourceRow.qualityFlag && sourceRow.confidence === 'fallback-only') throw new Error('quality-source-not-improved');
    const reportedVisionPath = vision?.outputPath ?? '';
    const colocatedVisionPath = reportedVisionPath ? path.join(path.dirname(visionReportPath), path.basename(reportedVisionPath)) : '';
    const rootedVisionPath = reportedVisionPath ? path.join(visionRoot, path.basename(reportedVisionPath)) : '';
    const visionPath = fs.existsSync(reportedVisionPath)
      ? reportedVisionPath
      : fs.existsSync(rootedVisionPath)
        ? rootedVisionPath
        : colocatedVisionPath;
    const canUseVision = vision?.status === 'processed' && visionPath && fs.existsSync(visionPath);
    const canUseTransparentVector = sourceRow.filePath && /\.svg$/i.test(sourceRow.filePath) && fs.existsSync(sourceRow.filePath);
    if (!canUseVision && !canUseTransparentVector) throw new Error(vision?.error || 'vision-output-missing');
    const subject = await normalizedSubjectBuffer(canUseVision ? visionPath : sourceRow.filePath);
    const hash = crypto.createHash('sha1').update(source).update(sourceRow.sha256 ?? '').digest('hex').slice(0, 16);
    const base = path.join(outputRoot, `${safeName(sourceRow.skuCandidates?.[0] ?? path.basename(source))}-${hash}`);
    const generated = await writePair(subject, base, publicRoot);
    result.outputDetail = generated.detail;
    result.outputCard = generated.card;
    result.subjectRatio = generated.stats.subjectRatio.toFixed(6);
    result.lightPartialRatio = generated.stats.lightPartialRatio.toFixed(6);
    result.adjustedPixels = subject.adjustedPixels;
    result.detailPath = generated.detailPath;
    result.cardPath = generated.cardPath;
    const needsWhiteEdgeReview = generated.stats.lightPartialRatio > 0.004;
    const visuallyAccepted = needsWhiteEdgeReview
      && reviewDecisions.default === 'accept'
      && !rejectedWhiteEdges.has(source);
    if (needsWhiteEdgeReview && !visuallyAccepted) {
      result.status = 'review-white-edge';
      result.error = `white-edge-risk:${generated.stats.lightPartialRatio.toFixed(6)}`;
    } else {
      result.status = 'accepted';
      overrides[source] = { detail: generated.detail, card: generated.card };
      for (const cardSource of sourceCards.get(source) ?? []) overrides[cardSource] = { detail: generated.detail, card: generated.card };
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  results.push(result);
}
const backupPath = path.join(reportDir, `product-transparent-image-overrides.before-${Date.now()}.json`);
fs.writeFileSync(backupPath, `${JSON.stringify(currentOverrides, null, 2)}\n`);
fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
const accepted = results.filter((row) => row.status === 'accepted');
const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  accepted: accepted.length,
  rejected: results.length - accepted.length,
  overridesBefore: Object.keys(currentOverrides).length,
  overridesAfter: Object.keys(overrides).length,
  backupPath,
  rows: results,
};
fs.writeFileSync(path.join(reportDir, 'finalization-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const columns = ['source', 'status', 'qualityFlag', 'reviewFlag', 'supplier', 'skuCandidates', 'productName', 'recoveryKind', 'confidence', 'originalWidth', 'originalHeight', 'outputDetail', 'outputCard', 'subjectRatio', 'lightPartialRatio', 'adjustedPixels', 'error'];
writeCsv(path.join(reportDir, 'finalization-report.csv'), [columns, ...results.map((row) => columns.map((column) => column === 'skuCandidates' ? row.skuCandidates?.join('; ') : row[column]))]);
await createContactSheet(accepted, path.join(reportDir, 'accepted-contact-sheet.png'));
const whiteEdgeReview = results.filter((row) => row.status === 'review-white-edge');
await createContactSheet(whiteEdgeReview.slice(0, 40), path.join(reportDir, 'white-edge-review-contact-sheet-1.png'));
await createContactSheet(whiteEdgeReview.slice(40, 80), path.join(reportDir, 'white-edge-review-contact-sheet-2.png'));
fs.writeFileSync(path.join(reportDir, 'white-edge-review-items.json'), `${JSON.stringify(whiteEdgeReview.map((row, index) => ({ index: index + 1, source: row.source, productName: row.productName, detailPath: row.detailPath, lightPartialRatio: row.lightPartialRatio })), null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, 'sample-files.json'), `${JSON.stringify(accepted.slice(0, 5).map((row) => ({ source: row.source, productName: row.productName, detailPath: row.detailPath, cardPath: row.cardPath })), null, 2)}\n`);
console.log(JSON.stringify({ ...report, rows: undefined, reportDir, outputRoot }, null, 2));
