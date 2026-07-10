import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = process.env.LEGACY_CATALOG_SOURCE ?? join(root, '..', 'legacy-source-data', 'legacy_src_data');
const outputPath = process.env.LEGACY_CATALOG_REPORT ?? join(root, 'reports', 'seo', 'legacy-catalog-inventory.json');
const skippedFiles = new Set([
  'products.json',
  'valtec/catalog_desc.json',
  'valtec/catalog_image_overrides.json',
  'valtec/documents.json',
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function countItems(node) {
  if (!node || typeof node !== 'object') return 0;
  let total = 0;
  if (Array.isArray(node)) {
    for (const child of node) total += countItems(child);
    return total;
  }
  if (Array.isArray(node.items)) total += node.items.length;
  if (Array.isArray(node.items) && node.items.length > 0) {
    const leafItems = node.items.filter((item) => item && typeof item === 'object' && !Array.isArray(item.items) && !Array.isArray(item.productGroups) && Boolean(item.code || item.article || item.size || item.price));
    if (leafItems.length === node.items.length) return leafItems.length;
    total = 0;
    for (const child of node.items) total += countItems(child);
  }
  if (Array.isArray(node.productGroups)) {
    for (const group of node.productGroups) total += countItems(group);
  }
  if (Array.isArray(node.subcategories)) {
    for (const category of node.subcategories) total += countItems(category);
  }
  return total;
}

function summarizeFile(file) {
  const raw = readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const rel = relative(sourceRoot, file);
  const topLevelName = Array.isArray(data) ? rel.replace(/\.json$/, '') : data.name ?? data.id ?? rel;
  return {
    file: rel,
    topLevelName,
    bytes: Buffer.byteLength(raw),
    estimatedItems: countItems(data),
    topLevelKeys: Array.isArray(data) ? ['array'] : Object.keys(data).slice(0, 12),
  };
}

if (!existsSync(sourceRoot)) {
  throw new Error(`Legacy catalog source not found: ${sourceRoot}`);
}

const files = walk(sourceRoot)
  .filter((file) => file.endsWith('.json'))
  .filter((file) => !file.includes('/admin/'))
  .filter((file) => !skippedFiles.has(relative(sourceRoot, file).replaceAll('\\', '/')));

const sources = files.map(summarizeFile);
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  excluded: ['admin runtime data', 'non-json files', 'images/uploads'],
  totalFiles: sources.length,
  totalEstimatedItems: sources.reduce((sum, source) => sum + source.estimatedItems, 0),
  sources,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Legacy catalog inventory written: ${outputPath}`);
console.log(`Files: ${report.totalFiles}`);
console.log(`Estimated item rows: ${report.totalEstimatedItems}`);
