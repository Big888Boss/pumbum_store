import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const workspaceRoot = join(root, '..');
const legacyRoot = join(workspaceRoot, 'legacy_src');
const baselinePath = join(root, 'docs/evidence/task-130-legacy-src-baseline.json');
const forbiddenRepoPaths = [
  'admin',
  'amazon',
  'deploy/wireguard',
  'legacy_src',
  'server',
];

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const sourceFiles = walkFiles(join(root, 'src'));
const badImports = sourceFiles.filter((file) => /from ['"]\.\.\/\.\.\/legacy_src|from ['"]legacy_src|require\(['"]legacy_src/.test(readFileSync(file, 'utf8')));
if (badImports.length) {
  console.error(`V2 imports legacy source directly:\n${badImports.map((file) => `- ${relative(root, file)}`).join('\n')}`);
  process.exit(1);
}

const forbiddenPresent = forbiddenRepoPaths.filter((item) => existsSync(join(root, item)));
if (forbiddenPresent.length) {
  console.error(`Forbidden legacy/runtime paths are present in the V2 repo:\n${forbiddenPresent.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

if (!existsSync(legacyRoot)) {
  console.log('Isolation check passed: no sibling legacy_src tree found, and V2 repo has no direct legacy imports or forbidden legacy/runtime paths.');
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.warn('Sibling legacy_src tree exists, but no legacy baseline file is present. Skipping external legacy diff and keeping the repo-bound isolation checks authoritative.');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const currentFiles = walkFiles(legacyRoot).map((file) => {
  const st = statSync(file);
  return {
    path: relative(workspaceRoot, file).replaceAll('\\', '/'),
    size: st.size,
    sha256: sha256(file),
  };
}).sort((a, b) => a.path.localeCompare(b.path));

const currentByPath = new Map(currentFiles.map((item) => [item.path, item]));
const baselineByPath = new Map((baseline.files ?? []).map((item) => [item.path, item]));
const issues = [];
for (const item of baseline.files ?? []) {
  const current = currentByPath.get(item.path);
  if (!current) issues.push(`deleted:${item.path}`);
  else if (current.size !== item.size || current.sha256 !== item.sha256) issues.push(`content-changed:${item.path}`);
}
for (const item of currentFiles) {
  if (!baselineByPath.has(item.path)) issues.push(`added:${item.path}`);
}

if (issues.length) {
  console.error(`Sibling legacy_src changed from the recorded baseline:\n${issues.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log('Isolation check passed: V2 repo is isolated and sibling legacy_src matches the recorded baseline.');
