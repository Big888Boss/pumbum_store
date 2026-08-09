import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args.set(token.slice(2), 'true');
    else {
      args.set(token.slice(2), next);
      index += 1;
    }
  }
  return args;
}

function colorDistanceFromWhite(data, offset) {
  const dr = 255 - data[offset];
  const dg = 255 - data[offset + 1];
  const db = 255 - data[offset + 2];
  return Math.hypot(dr, dg, db);
}

function isExactWhite(data, offset) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return data[offset + 3] >= 245 && Math.min(r, g, b) >= 248 && Math.max(r, g, b) - Math.min(r, g, b) <= 14;
}

function exactWhiteComponents(data, width, height, channels) {
  const pixels = width * height;
  const selected = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (isExactWhite(data, pixel * channels)) selected[pixel] = 1;
  }
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  const components = [];
  for (let seed = 0; seed < pixels; seed += 1) {
    if (!selected[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    const members = [];
    queue[tail++] = seed;
    visited[seed] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      members.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x === 0 || y === 0 || x + 1 === width || y + 1 === height) touchesEdge = true;
      if (x > 0 && selected[pixel - 1] && !visited[pixel - 1]) {
        visited[pixel - 1] = 1;
        queue[tail++] = pixel - 1;
      }
      if (x + 1 < width && selected[pixel + 1] && !visited[pixel + 1]) {
        visited[pixel + 1] = 1;
        queue[tail++] = pixel + 1;
      }
      if (y > 0 && selected[pixel - width] && !visited[pixel - width]) {
        visited[pixel - width] = 1;
        queue[tail++] = pixel - width;
      }
      if (y + 1 < height && selected[pixel + width] && !visited[pixel + width]) {
        visited[pixel + width] = 1;
        queue[tail++] = pixel + width;
      }
    }
    components.push({ members, touchesEdge });
  }
  return components.sort((a, b) => b.members.length - a.members.length);
}

function growAndClear(data, width, height, channels, seeds, options = {}) {
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  for (const seed of seeds) {
    if (visited[seed]) continue;
    visited[seed] = 1;
    queue[tail++] = seed;
  }
  const hardDistance = options.hardDistance ?? 18;
  const softDistance = options.softDistance ?? 70;
  let cleared = 0;
  let softened = 0;
  while (head < tail) {
    const pixel = queue[head++];
    const offset = pixel * channels;
    const originalAlpha = data[offset + 3];
    const distance = colorDistanceFromWhite(data, offset);
    if (distance > softDistance || originalAlpha <= 4) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const neighbors = [];
    if (x > 0) neighbors.push(pixel - 1);
    if (x + 1 < width) neighbors.push(pixel + 1);
    if (y > 0) neighbors.push(pixel - width);
    if (y + 1 < height) neighbors.push(pixel + width);
    for (const neighbor of neighbors) {
      if (visited[neighbor]) continue;
      const neighborOffset = neighbor * channels;
      if (data[neighborOffset + 3] > 4 && colorDistanceFromWhite(data, neighborOffset) <= softDistance) {
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    const alphaFactor = distance <= hardDistance ? 0 : Math.min(1, (distance - hardDistance) / (softDistance - hardDistance));
    const nextAlpha = Math.round(originalAlpha * alphaFactor);
    if (nextAlpha <= 4) {
      data[offset + 3] = 0;
      cleared += 1;
    } else if (nextAlpha < originalAlpha) {
      data[offset + 3] = nextAlpha;
      const normalized = Math.max(nextAlpha / 255, 0.04);
      data[offset] = Math.max(0, Math.min(255, Math.round((data[offset] - 255 * (1 - normalized)) / normalized)));
      data[offset + 1] = Math.max(0, Math.min(255, Math.round((data[offset + 1] - 255 * (1 - normalized)) / normalized)));
      data[offset + 2] = Math.max(0, Math.min(255, Math.round((data[offset + 2] - 255 * (1 - normalized)) / normalized)));
      softened += 1;
    }
  }
  return { cleared, softened };
}

function edgeSeeds(width, height) {
  const seeds = [];
  for (let x = 0; x < width; x += 1) {
    seeds.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y + 1 < height; y += 1) {
    seeds.push(y * width, y * width + width - 1);
  }
  return seeds;
}

function coordinateSeeds(spec, width, height) {
  if (!spec) throw new Error('Expected --seeds for seed mode');
  return spec.split(';').map((pair) => {
    const [rawX, rawY] = pair.split(',').map(Number);
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
      throw new Error(`Invalid seed coordinate: ${pair}`);
    }
    const x = rawX >= 0 && rawX <= 1 ? Math.round(rawX * (width - 1)) : Math.round(rawX);
    const y = rawY >= 0 && rawY <= 1 ? Math.round(rawY * (height - 1)) : Math.round(rawY);
    if (x < 0 || x >= width || y < 0 || y >= height) {
      throw new Error(`Seed outside image: ${pair} -> ${x},${y} for ${width}x${height}`);
    }
    return y * width + x;
  });
}

const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args.get('input') ?? '');
const outputPath = path.resolve(args.get('output') ?? '');
const mode = args.get('mode') ?? 'enclosed-largest';
const count = Number(args.get('count') ?? '1');
if (!fs.existsSync(inputPath) || !outputPath) throw new Error('Expected --input and --output');

const decoded = await sharp(inputPath, { limitInputPixels: false }).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = decoded;
let seeds = [];
let components = [];
if (mode === 'edge') {
  seeds = edgeSeeds(info.width, info.height);
} else if (mode === 'enclosed-largest') {
  components = exactWhiteComponents(data, info.width, info.height, info.channels)
    .filter((component) => !component.touchesEdge && component.members.length >= Math.max(64, info.width * info.height * 0.001))
    .slice(0, count);
  seeds = components.flatMap((component) => component.members);
  if (!seeds.length) throw new Error(`No enclosed white component found in ${inputPath}`);
} else if (mode === 'seed') {
  seeds = coordinateSeeds(args.get('seeds'), info.width, info.height);
} else {
  throw new Error(`Unsupported mode: ${mode}`);
}

const result = growAndClear(data, info.width, info.height, info.channels, seeds, {
  hardDistance: Number(args.get('hard-distance') ?? '18'),
  softDistance: Number(args.get('soft-distance') ?? '70'),
});
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
await sharp(data, { raw: info })
  .webp({ lossless: true, effort: 6, alphaQuality: 100 })
  .toFile(outputPath);
const metadata = await sharp(outputPath).metadata();
console.log(JSON.stringify({
  inputPath,
  outputPath,
  mode,
  width: metadata.width,
  height: metadata.height,
  selectedComponents: components.map((component) => component.members.length),
  ...result,
}, null, 2));
