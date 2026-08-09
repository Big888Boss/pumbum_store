import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) throw new Error('Usage: node create-dark-contact-sheet.mjs output input...');
const tileWidth = 520;
const tileHeight = 390;
const columns = 2;
const rows = Math.ceil(inputs.length / columns);
const background = { r: 8, g: 18, b: 36, alpha: 1 };
const composites = [];
for (let index = 0; index < inputs.length; index += 1) {
  const file = inputs[index];
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const buffer = await sharp(file, { limitInputPixels: false })
    .rotate()
    .resize({ width: tileWidth - 36, height: tileHeight - 36, fit: 'contain', withoutEnlargement: true })
    .png()
    .toBuffer();
  composites.push({
    input: buffer,
    left: (index % columns) * tileWidth + 18,
    top: Math.floor(index / columns) * tileHeight + 18,
  });
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
await sharp({
  create: { width: columns * tileWidth, height: rows * tileHeight, channels: 4, background },
})
  .composite(composites)
  .png()
  .toFile(output);
console.log(path.resolve(output));
