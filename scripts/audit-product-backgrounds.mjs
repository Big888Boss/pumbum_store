import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

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

function publicFile(publicRoot, publicPath) {
  if (!publicPath?.startsWith('/') || publicPath.includes('..')) return null;
  return path.join(publicRoot, publicPath.slice(1));
}

function analyzeWhiteComponents(data, width, height, channels, threshold) {
  const pixels = width * height;
  const selected = new Uint8Array(pixels);
  let selectedPixels = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = channels >= 4 ? data[offset + 3] : 255;
    if (alpha >= 245 && Math.min(r, g, b) >= threshold && Math.max(r, g, b) - Math.min(r, g, b) <= 12) {
      selected[pixel] = 1;
      selectedPixels += 1;
    }
  }

  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  const components = [];
  for (let seed = 0; seed < pixels; seed += 1) {
    if (!selected[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    visited[seed] = 1;
    let size = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let touchesImageEdge = false;
    let touchesTransparency = false;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      size += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x === 0 || y === 0 || x + 1 === width || y + 1 === height) touchesImageEdge = true;
      const neighbors = [];
      if (x > 0) neighbors.push(pixel - 1);
      if (x + 1 < width) neighbors.push(pixel + 1);
      if (y > 0) neighbors.push(pixel - width);
      if (y + 1 < height) neighbors.push(pixel + width);
      for (const neighbor of neighbors) {
        const alpha = channels >= 4 ? data[neighbor * channels + 3] : 255;
        if (alpha <= 12) touchesTransparency = true;
        if (!selected[neighbor] || visited[neighbor]) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    const boxArea = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
    components.push({
      size,
      ratio: size / pixels,
      minX,
      minY,
      maxX,
      maxY,
      rectangularity: size / boxArea,
      touchesImageEdge,
      touchesTransparency,
    });
  }
  components.sort((a, b) => b.size - a.size);
  return { ratio: selectedPixels / pixels, components: components.slice(0, 12) };
}

async function inspectImage(filePath) {
  const image = sharp(filePath, { limitInputPixels: false }).rotate();
  const metadata = await image.metadata();
  const sampled = await image
    .resize({ width: 520, height: 390, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = sampled;
  let transparent = 0;
  let partial = 0;
  for (let offset = 3; offset < data.length; offset += info.channels) {
    const alpha = data[offset];
    if (alpha <= 12) transparent += 1;
    else if (alpha < 245) partial += 1;
  }
  const pixels = info.width * info.height;
  const exact = analyzeWhiteComponents(data, info.width, info.height, info.channels, 250);
  const near = analyzeWhiteComponents(data, info.width, info.height, info.channels, 238);
  const largestExact = exact.components[0] ?? null;
  const largestNear = near.components[0] ?? null;
  const transparentRatio = transparent / pixels;
  const partialRatio = partial / pixels;
  const reasons = [];
  if (transparentRatio < 0.005 && near.ratio > 0.12) reasons.push('opaque-light-background');
  if (transparentRatio >= 0.005 && largestExact?.ratio >= 0.006 && !largestExact.touchesImageEdge) {
    reasons.push('enclosed-exact-white-region');
  }
  if (transparentRatio >= 0.005 && largestNear?.ratio >= 0.012 && !largestNear.touchesImageEdge && largestNear.rectangularity >= 0.6) {
    reasons.push('enclosed-near-white-region');
  }
  if (largestNear?.ratio >= 0.08 && largestNear.rectangularity >= 0.75) reasons.push('large-white-rectangle');
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? '',
    hasAlpha: Boolean(metadata.hasAlpha),
    transparentRatio,
    partialRatio,
    exactWhiteRatio: exact.ratio,
    nearWhiteRatio: near.ratio,
    largestExact,
    largestNear,
    reasons: [...new Set(reasons)],
  };
}

async function collectCarousels(baseUrl) {
  if (!baseUrl) return [];
  const categories = [
    'vodosnabzhenie', 'kanalizaciya', 'filtraciya', 'nasosy', 'smesiteli-i-sifony',
    'otoplenie-i-kotelnaya', 'krepezh-dlya-montazha', 'truby-i-fitingi',
    'armatura-i-komplektuyuschie', 'prochee-oborudovanie',
  ];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 1280, height: 847 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0 Safari/537.36',
  });
  const page = await context.newPage();
  const results = [];
  try {
    for (const category of categories) {
      await page.goto(`${baseUrl.replace(/\/$/, '')}/catalog/${category}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const carousel = page.locator('.category-product-carousel');
      await carousel.waitFor({ state: 'visible' });
      await carousel.hover();
      const dots = carousel.locator('.category-carousel-dot');
      const count = await dots.count();
      for (let index = 0; index < count; index += 1) {
        await dots.nth(index).click();
        await page.waitForTimeout(120);
        const record = await carousel.evaluate((element) => ({
          category: element.getAttribute('data-category') ?? '',
          title: element.querySelector('.category-carousel-copy h2')?.textContent?.trim() ?? '',
          image: element.querySelector('.product-photo')?.getAttribute('src') ?? '',
        }));
        results.push({ ...record, slide: index + 1 });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.get('root') ?? process.cwd());
const publicRoot = path.join(root, 'public');
const outputPath = path.resolve(args.get('output') ?? path.join(root, '.asset-store/product-background-audit.json'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/legacy-catalog.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/product-image-manifest.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/product-transparent-image-overrides.json'), 'utf8'));
const labels = new Map();
const add = (publicPath, label) => {
  if (!publicPath?.startsWith('/')) return;
  const bucket = labels.get(publicPath) ?? [];
  bucket.push(label);
  labels.set(publicPath, bucket);
};

const presentationOverrides = {
  '/images/products/_normalized-v2/valtec/vti.900.304.1208-83e0e2cec79f7608-detail.webp': '/images/category-showcase/valtec-stainless-pipe-detail.webp',
  '/images/products/_normalized-v2/valtec/vti.900.304.1208-83e0e2cec79f7608-card.webp': '/images/category-showcase/valtec-stainless-pipe-card.webp',
  '/images/products/_normalized-v2/sinikon/km038.r-f50943302c94da60-detail.webp': '/images/category-showcase/sinikon-clamp-km038-detail.webp',
  '/images/products/_normalized-v2/sinikon/km038.r-f50943302c94da60-card.webp': '/images/category-showcase/sinikon-clamp-km038-card.webp',
  '/images/products/_normalized-v2/sinikon/km100d.r-0a8f9cacaaf7bc21-detail.webp': '/images/category-showcase/sinikon-clamp-km100d-detail.webp',
  '/images/products/_normalized-v2/sinikon/km100d.r-0a8f9cacaaf7bc21-card.webp': '/images/category-showcase/sinikon-clamp-km100d-card.webp',
  '/images/products/_normalized-v2/sinikon/20005-f1697def6bf3c71a-detail.webp': '/images/category-showcase/sinikon-sewer-pipe-detail.webp',
  '/images/products/_normalized-v2/sinikon/20005-f1697def6bf3c71a-card.webp': '/images/category-showcase/sinikon-sewer-pipe-card.webp',
};
const sinikonSources = new Set([
  'catalog/latunnye-aksialnye-fitingi.json', 'catalog/naruzhnaya-kanalizaciya.json',
  'catalog/truby-pe-x-pe-rt.json', 'catalog/vnutrennie-vodostoki.json',
  'catalog/vnutrennyaya-kanalizaciya.json',
]);

function supplierSlug(product) {
  if (product.supplier && product.supplier !== 'generic') return product.supplier;
  const refs = product.sourceRefs ?? [];
  const text = [
    ...refs.flatMap((ref) => [ref.url, ref.label]), product.brandName, product.brand,
    product.supplierName, product.supplier, product.name, product.description,
    product.shortDescription, product.specs?.['Бренд'], product.specs?.['Раздел'],
    product.specs?.['Подраздел'], product.specs?.['Группа'],
  ].join(' ').toLowerCase();
  if (text.includes('valtec')) return 'valtec';
  if (text.includes('aquario')) return 'aquario';
  if (text.includes('gidrokontrakt')) return 'gidrokontrakt';
  if (text.includes('vivaldo')) return 'vivaldo';
  if (text.includes('aq-plastic') || text.includes('aquatec') || text.includes('акватек')) return 'aquatec';
  if (text.includes('zota')) return 'zota';
  if (/\btim\b/.test(text) || text.includes('тим')) return 'tim';
  if (/\bespa\b/.test(text)) return 'espa';
  if (text.includes('sinikon') || text.includes('синикон') || refs.some((ref) => sinikonSources.has(ref.label ?? ''))) return 'sinikon';
  return 'unknown';
}

function imageKeys(product) {
  const keys = [`${product.categorySlug}/${product.slug}`];
  for (const ref of product.sourceRefs ?? []) {
    const match = (ref.label ?? '').match(/^catalog\/([^/]+)\.json$/);
    if (match?.[1] && match[1] !== product.categorySlug) keys.push(`${match[1]}/${product.slug}`);
  }
  keys.push(`${supplierSlug(product)}/${product.slug}`);
  return [...new Set(keys)];
}

function activeImage(product, variant) {
  const entry = imageKeys(product)
    .map((key) => manifest.products?.[key])
    .find((candidate) => ['ready', 'family-image'].includes(candidate?.status));
  const selected = entry?.image?.[variant] || entry?.image?.detail || entry?.image?.card || product.image;
  const presented = presentationOverrides[selected] ?? selected;
  return overrides[presented]?.[variant] ?? presented;
}

for (const product of catalog.products ?? []) {
  for (const variant of ['detail', 'card']) {
    const selected = activeImage(product, variant);
    if (selected?.startsWith('/')) add(selected, { kind: `active-${variant}`, slug: product.slug, name: product.name });
  }
}

const carousels = await collectCarousels(args.get('base-url') ?? '');
for (const item of carousels) add(item.image, { kind: 'carousel', ...item });

const records = [];
let index = 0;
for (const [publicPath, imageLabels] of labels) {
  index += 1;
  const filePath = publicFile(publicRoot, publicPath);
  const record = { publicPath, labels: imageLabels, status: 'missing' };
  if (filePath && fs.existsSync(filePath)) {
    try {
      Object.assign(record, await inspectImage(filePath), { status: 'inspected' });
    } catch (error) {
      record.status = 'error';
      record.error = error instanceof Error ? error.message : String(error);
    }
  }
  records.push(record);
  if (global.gc && index % 50 === 0) global.gc();
  if (index % 200 === 0) process.stderr.write(`inspected ${index}/${labels.size}\n`);
}

records.sort((a, b) => {
  const aCarousel = a.labels?.some((item) => item.kind === 'carousel') ? 1 : 0;
  const bCarousel = b.labels?.some((item) => item.kind === 'carousel') ? 1 : 0;
  return (b.reasons?.length ?? 0) - (a.reasons?.length ?? 0)
    || bCarousel - aCarousel
    || (b.largestNear?.ratio ?? 0) - (a.largestNear?.ratio ?? 0);
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: args.get('base-url') ?? '',
  totals: {
    paths: records.length,
    inspected: records.filter((item) => item.status === 'inspected').length,
    missing: records.filter((item) => item.status === 'missing').length,
    candidates: records.filter((item) => item.reasons?.length).length,
    carouselSlides: carousels.length,
    carouselCandidates: records.filter((item) => item.reasons?.length && item.labels?.some((label) => label.kind === 'carousel')).length,
  },
  carousels,
  candidates: records.filter((item) => item.reasons?.length),
  records,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...report.totals }, null, 2));
