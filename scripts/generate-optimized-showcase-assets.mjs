import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const directories = [
  'public/images/category-showcase',
  'public/images/carousel-products',
];

async function existingPngs(directory) {
  try {
    return (await readdir(path.join(root, directory)))
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .map((name) => path.join(directory, name));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

const inputs = [
  ...(await Promise.all(directories.map(existingPngs))).flat(),
];

const results = [];
for (const input of [...new Set(inputs)].sort()) {
  const source = path.join(root, input);
  const output = source.replace(/\.png$/i, '.webp');
  const before = (await stat(source)).size;
  await sharp(source)
    .webp({ quality: 84, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  const after = (await stat(output)).size;
  results.push({
    input,
    output: path.relative(root, output),
    width: metadata.width,
    height: metadata.height,
    alpha: metadata.hasAlpha,
    before,
    after,
    savedPercent: Number(((1 - after / before) * 100).toFixed(1)),
  });
}

console.log(JSON.stringify({ converted: results.length, results }, null, 2));
