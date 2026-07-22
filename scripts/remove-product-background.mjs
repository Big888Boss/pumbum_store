import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Expected --key value, received: ${argv.slice(index).join(' ')}`);
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function numericArg(args, key, fallback) {
  const raw = args.get(key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a number`);
  return value;
}

function booleanArg(args, key, fallback = false) {
  const raw = args.get(key);
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`--${key} must be true or false`);
}

function isLightNeutral(data, offset, minLuma, maxChroma) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  if (alpha <= 24) return true;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  return luma >= minLuma && maximum - minimum <= maxChroma;
}

function colorDistance(data, firstOffset, secondOffset) {
  const red = data[firstOffset] - data[secondOffset];
  const green = data[firstOffset + 1] - data[secondOffset + 1];
  const blue = data[firstOffset + 2] - data[secondOffset + 2];
  return Math.sqrt(red * red + green * green + blue * blue);
}

function clearBorderBackground(data, width, height, minLuma, maxChroma, maxStepDistance) {
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (pixelIndex, fromPixelIndex) => {
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * 4;
    if (!isLightNeutral(data, offset, minLuma, maxChroma)) return;
    if (fromPixelIndex !== undefined) {
      const fromOffset = fromPixelIndex * 4;
      const fromIsTransparent = data[fromOffset + 3] <= 24;
      if (!fromIsTransparent && colorDistance(data, offset, fromOffset) > maxStepDistance) return;
    }
    visited[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    data[pixelIndex * 4 + 3] = 0;
    if (x > 0) enqueue(pixelIndex - 1, pixelIndex);
    if (x + 1 < width) enqueue(pixelIndex + 1, pixelIndex);
    if (y > 0) enqueue(pixelIndex - width, pixelIndex);
    if (y + 1 < height) enqueue(pixelIndex + width, pixelIndex);
  }
}

function removeSmallIslands(data, width, height, minimumPixels) {
  if (minimumPixels <= 0) return;
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  const component = [];

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= 24) continue;
    let queueStart = 0;
    let queueEnd = 0;
    queue[queueEnd] = start;
    queueEnd += 1;
    visited[start] = 1;
    component.length = 0;

    while (queueStart < queueEnd) {
      const pixelIndex = queue[queueStart];
      queueStart += 1;
      component.push(pixelIndex);
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      const neighbours = [];
      if (x > 0) neighbours.push(pixelIndex - 1);
      if (x + 1 < width) neighbours.push(pixelIndex + 1);
      if (y > 0) neighbours.push(pixelIndex - width);
      if (y + 1 < height) neighbours.push(pixelIndex + width);
      for (const neighbour of neighbours) {
        if (visited[neighbour] || data[neighbour * 4 + 3] <= 24) continue;
        visited[neighbour] = 1;
        queue[queueEnd] = neighbour;
        queueEnd += 1;
      }
    }

    if (component.length >= minimumPixels) continue;
    for (const pixelIndex of component) data[pixelIndex * 4 + 3] = 0;
  }
}

function clearLightNeutralFringe(data, minimumLuma, maximumChroma) {
  if (minimumLuma > 255) return;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    if (luma >= minimumLuma && maximum - minimum <= maximumChroma) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
}

function clipLowAlpha(data, cutoff) {
  if (cutoff <= 0) return;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] <= cutoff) {
      data[offset - 3] = 0;
      data[offset - 2] = 0;
      data[offset - 1] = 0;
      data[offset] = 0;
    }
  }
}

function encodeForOutput(pipeline, output) {
  if (path.extname(output).toLowerCase() === '.png') {
    return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  }
  return pipeline.webp({ lossless: true, effort: 6 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.get('input');
  const detailOutput = args.get('detail-output');
  const cardOutput = args.get('card-output');
  if (!input || !detailOutput || !cardOutput) {
    throw new Error('Required: --input, --detail-output and --card-output');
  }

  const minLuma = numericArg(args, 'min-luma', 170);
  const maxChroma = numericArg(args, 'max-chroma', 42);
  const maxStepDistance = numericArg(args, 'max-step-distance', 18);
  const minimumPixels = numericArg(args, 'minimum-island-pixels', 1200);
  const useExistingAlpha = booleanArg(args, 'use-existing-alpha');
  const neutralFringeMinLuma = numericArg(args, 'neutral-fringe-min-luma', 256);
  const neutralFringeMaxChroma = numericArg(args, 'neutral-fringe-max-chroma', 32);
  const alphaCutoff = numericArg(args, 'alpha-cutoff', 4);
  const source = sharp(input, { failOn: 'error' }).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`Expected RGBA input, received ${info.channels} channels`);

  if (!useExistingAlpha) {
    clearBorderBackground(data, info.width, info.height, minLuma, maxChroma, maxStepDistance);
  }
  clearLightNeutralFringe(data, neutralFringeMinLuma, neutralFringeMaxChroma);
  clipLowAlpha(data, alphaCutoff);
  removeSmallIslands(data, info.width, info.height, minimumPixels);

  await fs.mkdir(path.dirname(detailOutput), { recursive: true });
  await fs.mkdir(path.dirname(cardOutput), { recursive: true });

  const cleaned = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  await encodeForOutput(cleaned.clone(), detailOutput).toFile(detailOutput);
  await encodeForOutput(
    cleaned.clone().resize(480, 360, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    }),
    cardOutput,
  ).toFile(cardOutput);

  const detailMetadata = await sharp(detailOutput).metadata();
  const cardMetadata = await sharp(cardOutput).metadata();
  if (!detailMetadata.hasAlpha || !cardMetadata.hasAlpha) throw new Error('Transparency was not preserved');

  process.stdout.write(JSON.stringify({
    input,
    detailOutput,
    cardOutput,
    detail: { width: detailMetadata.width, height: detailMetadata.height, hasAlpha: detailMetadata.hasAlpha },
    card: { width: cardMetadata.width, height: cardMetadata.height, hasAlpha: cardMetadata.hasAlpha },
    minLuma,
    maxChroma,
    maxStepDistance,
    minimumPixels,
    useExistingAlpha,
    neutralFringeMinLuma,
    neutralFringeMaxChroma,
    alphaCutoff,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
