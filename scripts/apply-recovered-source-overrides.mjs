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

function safeName(value) {
  return String(value ?? 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
}

async function download(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; 477477-image-source-recovery/1.0; +https://477477.ru)',
      accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
  if (!metadata.width || !metadata.height) throw new Error('invalid-image');
  return { buffer, metadata, resolvedUrl: response.url };
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(args.get('manifest'));
const overridesPath = path.resolve(args.get('overrides'));
const sourceRoot = path.resolve(args.get('source-root'));
const backupDir = path.resolve(args.get('backup-dir') ?? path.dirname(manifestPath));
if (!manifestPath || !overridesPath || !sourceRoot) throw new Error('Required: --manifest --overrides --source-root');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
fs.mkdirSync(sourceRoot, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `source-recovery-manifest.before-overrides-${Date.now()}.json`);
fs.copyFileSync(manifestPath, backupPath);
const results = [];
for (const override of overrides) {
  const rowIndex = manifest.rows.findIndex((row) => row.source === override.source);
  if (rowIndex < 0) {
    results.push({ source: override.source, status: 'failed', error: 'source-row-missing' });
    continue;
  }
  try {
    const downloaded = await download(override.imageUrl);
    const extension = downloaded.metadata.format === 'jpeg' ? '.jpg' : `.${downloaded.metadata.format}`;
    const destination = path.join(sourceRoot, `${String(rowIndex + 1).padStart(3, '0')}-${safeName(override.sku ?? manifest.rows[rowIndex].skuCandidates?.[0])}-override${extension}`);
    fs.writeFileSync(destination, downloaded.buffer);
    Object.assign(manifest.rows[rowIndex], {
      status: 'recovered',
      recoveryKind: override.provider,
      confidence: 'exact-article',
      filePath: destination,
      sourcePage: override.sourcePage,
      recoveredImageUrl: downloaded.resolvedUrl,
      width: downloaded.metadata.width,
      height: downloaded.metadata.height,
      format: downloaded.metadata.format,
      bytes: downloaded.buffer.length,
      sha256: crypto.createHash('sha256').update(downloaded.buffer).digest('hex'),
      error: '',
    });
    results.push({ source: override.source, status: 'applied', filePath: destination, width: downloaded.metadata.width, height: downloaded.metadata.height });
  } catch (error) {
    results.push({ source: override.source, status: 'failed', error: error instanceof Error ? error.message : String(error) });
  }
}
manifest.recovered = manifest.rows.filter((row) => row.status === 'recovered').length;
manifest.failed = manifest.rows.length - manifest.recovered;
manifest.highConfidence = manifest.rows.filter((row) => row.status === 'recovered' && row.confidence !== 'fallback-only').length;
manifest.fallbackOnly = manifest.rows.filter((row) => row.confidence === 'fallback-only').length;
manifest.sourceOverridesAppliedAt = new Date().toISOString();
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ backupPath, applied: results.filter((row) => row.status === 'applied').length, failed: results.filter((row) => row.status !== 'applied').length, results }, null, 2));
