#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
const legacyCatalog = JSON.parse(fs.readFileSync('content/generated/legacy-catalog.json', 'utf8'));
const args = new Map();

for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) {
    args.set(key, 'true');
  } else {
    args.set(key, next);
    i += 1;
  }
}

const manifestPath = path.resolve(args.get('manifest') || 'content/generated/product-image-manifest.json');
const publicRoot = path.resolve(args.get('public-root') || 'public');
const outputRoot = path.resolve(args.get('output-root') || path.join(publicRoot, 'images/products/_normalized-v2'));
const reportDir = path.resolve(args.get('report-dir') || '.asset-store/reports');
const timeoutMs = Number(args.get('timeout-ms') || 15000);
const dryRun = args.has('dry-run');
const skuFilter = new Set((args.get('sku') || '').split(',').map((item) => normalizeSku(item)).filter(Boolean));
const defaultSeedUrls = [
  'http://www.aq-plastic.ru/catalog/baki-dlya-vody/',
  'http://www.aq-plastic.ru/catalog/kanalizatsiya/',
  'http://www.aq-plastic.ru/catalog/dushevye-i-tualetnye-kabiny/',
  'http://www.aq-plastic.ru/catalog/complect/',
  'http://www.aq-plastic.ru/catalog/kesson/kesson_46.html',
];
const seedUrls = (args.get('seed-url') || defaultSeedUrls.join(','))
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const maxProducts = Number(args.get('max-products') || 0);

if (!outputRoot.startsWith(publicRoot)) {
  throw new Error(`output-root must be inside public-root. publicRoot=${publicRoot} outputRoot=${outputRoot}`);
}

function normalizeSku(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[А]/g, 'A')
    .replace(/[Т]/g, 'T')
    .replace(/[В]/g, 'V')
    .replace(/[Н]/g, 'H')
    .replace(/[Р]/g, 'P')
    .replace(/\s+/g, ' ');
}

const translitMap = new Map(Object.entries({
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'ZH', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'CH', Ш: 'SH',
  Щ: 'SCH', Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'YU', Я: 'YA',
}));

function searchable(value) {
  return normalizeSku(value)
    .split('')
    .map((char) => translitMap.get(char) ?? char)
    .join('')
    .replace(/[^A-Z0-9]+/g, '');
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function modelSearchKeys(product) {
  const sku = normalizeSku(product.sku || product.vendorCode);
  const values = [{ value: sku, exact: true, strictEnd: false }];

  const atMatch = sku.match(/\b(ATV|ATVU|ATQ|ATH|ATP)\s*(\d+)/);
  if (atMatch) values.push({ value: `${atMatch[1]} ${atMatch[2]}`, exact: false, strictEnd: false });
  if (sku.startsWith('ATVU')) values.push({ value: sku.replace(/^ATVU\s*(\d+)/, 'ATV $1 U'), exact: false, strictEnd: false });

  const combiMatch = sku.match(/\bCOMBI(?:\s+OPTIMA)?\s*(\d+)/);
  if (combiMatch) {
    values.push({ value: `COMBI ${combiMatch[1]}`, exact: false, strictEnd: false });
    values.push({ value: `COMBI W ${combiMatch[1]}`, exact: false, strictEnd: false });
  }

  const quadroMatch = sku.match(/\bQUADRO(?:\s+PREMIUM)?\s*(\d+)/);
  if (quadroMatch) {
    if (sku.includes('PREMIUM')) values.push({ value: `QUADRO PREMIUM ${quadroMatch[1]}`, exact: false, strictEnd: false });
    values.push({ value: `QUADRO ${quadroMatch[1]}`, exact: false, strictEnd: false });
    values.push({ value: `QUADRO W ${quadroMatch[1]}`, exact: false, strictEnd: false });
  }

  const aquaStoreMatch = sku.match(/\bAQUASTORE-?\s*(\d+)/);
  if (aquaStoreMatch) values.push({ value: `AQUASTORE ${aquaStoreMatch[1]}`, exact: false, strictEnd: false });

  const showerMatch = sku.match(/БAК.*ДУШA.*?(\d+)/);
  if (showerMatch) {
    if (sku.includes('ПОДОГPЕV')) {
      values.push({ value: `Бак для душа ${showerMatch[1]} с подогревом`, exact: false, strictEnd: false });
    } else {
      values.push({ value: `Бак для душа ${showerMatch[1]}`, exact: false, strictEnd: false });
    }
  }

  const kessonMatch = sku.match(/КЕССОН\s*(\d+(?:[,.]\d+)?)\s*М3/);
  if (kessonMatch) values.push({ value: `Кессон ${kessonMatch[1]} м3`, exact: false, strictEnd: true });

  const septicMatch = sku.match(/ЕМКОСTЬ(?:\s+ПОД\s+СЕПTИК)?\s*(\d+(?:[,.]\d+)?)\s*М/);
  if (septicMatch) values.push({ value: `Емкость ${septicMatch[1]} м`, exact: false, strictEnd: true });

  if (/^(\d+[A-ZА-Я]?)$/.test(sku) && /локальн/i.test(product.name || '')) {
    values.push({ value: `Локальное Очистное Сооружение ${sku}`, exact: false, strictEnd: true });
  }

  if (sku.includes('ЕМКОСTЬ ПОД СЕПTИК')) {
    values.push({ value: 'Емкость под септик', exact: false, strictEnd: false });
  }

  const seen = new Map();
  for (const item of values) {
    const key = searchable(item.value);
    if (key.length < 4 || /^\d+$/.test(key)) continue;
    if (!seen.has(key)) seen.set(key, { exact: item.exact, strictEnd: item.strictEnd });
  }
  return [...seen.entries()]
    .map(([key, options]) => ({ key, ...options }))
    .sort((a, b) => b.key.length - a.key.length);
}

function cardMatchesKey(cardKey, key, strictEnd = false) {
  let index = cardKey.indexOf(key);
  while (index !== -1) {
    const next = cardKey[index + key.length] || '';
    if (strictEnd ? !/[A-Z0-9]/.test(next) : !/\d/.test(next)) return true;
    index = cardKey.indexOf(key, index + 1);
  }
  return false;
}

function findMatchingCard(product, cards) {
  const keys = modelSearchKeys(product);
  for (const candidate of cards) {
    const cardKey = searchable(candidate.title);
    const match = keys.find(({ key, strictEnd }) => cardMatchesKey(cardKey, key, strictEnd));
    if (match) return { card: candidate, status: match.exact ? 'ready' : 'family-image', matchKey: match.key };
  }
  return null;
}

function aquatecOfficialFamilyFallback(product) {
  const sku = normalizeSku(product.sku || product.vendorCode);
  const text = searchable([
    product.name,
    product.description,
    product.shortDescription,
    product.specs?.['Группа'],
    product.specs?.group,
    product.specs?.type,
  ].join(' '));

  if (/\bATH\s*3000\b/.test(sku) || /\bATН\s*3000\b/.test(sku)) {
    return {
      status: 'family-image',
      matchKey: 'ATHFAMILY',
      card: {
        title: 'Емкость ATH 1500',
        pageUrl: 'http://www.aq-plastic.ru/catalog/baki-dlya-vody/ath/ath_10.html',
        imageUrl: 'http://www.aq-plastic.ru/netcat_files/400/379/0_16_2241_pict_1.jpg',
      },
    };
  }

  if (sku.includes('QUADRO PREMIUM')) {
    return {
      status: 'family-image',
      matchKey: 'QUADROFAMILY',
      card: {
        title: 'Емкость Quadro W 1000',
        pageUrl: 'http://www.aq-plastic.ru/catalog/baki-dlya-vody/atp/atp_16.html',
        imageUrl: 'http://www.aq-plastic.ru/netcat_files/401/380/0_16_2252_pic_1.jpg',
      },
    };
  }

  if (sku.includes('КЕССОН') || sku.includes('КЕССОH')) {
    return {
      status: 'family-image',
      matchKey: 'KESSONFAMILY',
      card: {
        title: 'Пластиковый кессон АКВАТЕК',
        pageUrl: 'http://www.aq-plastic.ru/catalog/kesson/kesson_46.html',
        imageUrl: 'http://www.aq-plastic.ru/netcat_files/405/395/tovar.png',
      },
    };
  }

  if (/ЕМКОСTЬ\s+(1[.,]5|3)\s*М/.test(sku) || /ЕМКОСТЬ\s+(1[.,]5|3)\s*М/.test(sku)) {
    return {
      status: 'family-image',
      matchKey: 'SEPTICFAMILY',
      card: {
        title: 'Емкость под септик без перегородок',
        pageUrl: 'http://www.aq-plastic.ru/catalog/kanalizatsiya/septiki/septiki_52.html',
        imageUrl: 'http://www.aq-plastic.ru/netcat_files/408/385/tovar.png',
      },
    };
  }

  if (sku.includes('ДУШA') && sku.includes('ПОДОГPЕV')) {
    return {
      status: 'family-image',
      matchKey: 'SHOWERHEATEDFAMILY',
      card: {
        title: 'Бак для душа 240 с подогревом',
        pageUrl: 'http://www.aq-plastic.ru/catalog/baki-dlya-vody/baki-dlya-dusha/baki-dlya-dusha_5.html',
        imageUrl: 'http://www.aq-plastic.ru/netcat_files/399/378/ATD240T1100_2.png',
      },
    };
  }

  return null;
}

function safeFilePart(value) {
  return String(value || 'aquatec')
    .replace(/[^a-zA-Z0-9а-яА-Я._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'aquatec';
}

function publicPath(filePath) {
  return `/${path.relative(publicRoot, filePath).split(path.sep).join('/')}`;
}

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAquatecProduct(product) {
  const refs = product.sourceRefs ?? [];
  const text = [
    product.brandName,
    product.brand,
    product.name,
    product.description,
    product.shortDescription,
    product.specs?.['Бренд'],
    product.specs?.['Раздел'],
    product.specs?.['Подраздел'],
    product.specs?.['Группа'],
    ...refs.map((ref) => `${ref.label || ''} ${ref.url || ''}`),
  ].join(' ').toLowerCase();
  return text.includes('акватек') || text.includes('aquatec') || text.includes('aq-plastic');
}

function getProductKey(product) {
  return `${product.categorySlug}/${product.slug}`;
}

function getManifestKeysForProduct(product, manifest) {
  const keys = new Set([getProductKey(product)]);
  for (const key of Object.keys(manifest.products || {})) {
    if (key.endsWith(`/${product.slug}`)) keys.add(key);
  }
  return [...keys];
}

function shouldUpdateProduct(product, manifest) {
  if (skuFilter.size > 0 && !skuFilter.has(normalizeSku(product.sku || product.vendorCode))) return false;
  if (!isAquatecProduct(product)) return false;
  const keys = getManifestKeysForProduct(product, manifest);
  return keys.some((key) => {
    const entry = manifest.products?.[key];
    if (!entry) return true;
    const notes = (entry.notes || []).join(' ').toLowerCase();
    const originalImage = String(entry.originalImage || product.image || '').toLowerCase();
    return entry.supplier === 'unknown'
      || entry.status !== 'ready'
      || entry.sourceKind !== 'aquatec-source-card'
      || originalImage.includes('/aquatec/')
      || notes.includes('fallback')
      || notes.includes('source-error');
  });
}

function normalizeUrl(url, base) {
  try {
    const parsed = new URL(url, base);
    if (parsed.hostname !== 'www.aq-plastic.ru' && parsed.hostname !== 'aq-plastic.ru') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 477477-v2-aquatec-image-connector/1.0',
      },
    });
    if (!response.ok) throw new Error(`html-fetch-${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchImage(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'accept-language': 'ru-RU,ru;q=0.9,en;q=0.7',
        referer,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 477477-v2-aquatec-image-connector/1.0',
      },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      finalUrl: response.url,
      buffer,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractProductCards(html, seedUrl) {
  const cards = [];
  const cardRe = /<div class="column one-fourth column_opening_hours">([\s\S]*?)<\/a>\s*<\/div>/gi;
  let match;
  while ((match = cardRe.exec(html))) {
    const block = match[1];
    const href = block.match(/<a\s+href=["']([^"']+)["']/i)?.[1];
    const title = stripTags(block.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '');
    const imagePath = block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    const pageUrl = href ? normalizeUrl(href, seedUrl) : null;
    const imageUrl = imagePath ? normalizeUrl(imagePath, seedUrl) : null;
    if (!pageUrl || !imageUrl || !title) continue;
    cards.push({ pageUrl, title, imageUrl });
  }
  return cards;
}

function sampleBorderIsWhite(raw, width, height, channels) {
  let total = 0;
  let white = 0;
  const stepX = Math.max(1, Math.floor(width / 220));
  const stepY = Math.max(1, Math.floor(height / 220));
  const check = (x, y) => {
    const offset = (y * width + x) * channels;
    const r = raw[offset];
    const g = raw[offset + 1];
    const b = raw[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    total += 1;
    if (min >= 238 && max - min <= 24) white += 1;
  };

  for (let x = 0; x < width; x += stepX) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 0; y < height; y += stepY) {
    check(0, y);
    check(width - 1, y);
  }

  return total > 0 && white / total >= 0.86;
}

function removeWhiteBackground(raw, width, height, channels) {
  if (!sampleBorderIsWhite(raw, width, height, channels)) {
    return { buffer: raw, background: 'original' };
  }

  const output = Buffer.from(raw);
  for (let i = 0; i < output.length; i += channels) {
    const r = output[i];
    const g = output[i + 1];
    const b = output[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min >= 248 && max - min <= 18) {
      output[i + 3] = 0;
    } else if (min >= 241 && max - min <= 16) {
      output[i + 3] = Math.min(output[i + 3], 64);
    }
  }

  return { buffer: output, background: 'transparent-white-border' };
}

async function normalizeBuffer(buffer, outputBasePath) {
  const resized = await sharp(buffer, { limitInputPixels: false })
    .rotate()
    .resize({ width: 1400, height: 1050, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = resized.info;
  const removed = removeWhiteBackground(resized.data, width, height, channels);
  const source = sharp(removed.buffer, { raw: { width, height, channels } });
  const transparent = { r: 255, g: 255, b: 255, alpha: 0 };
  const detailPath = `${outputBasePath}-detail.webp`;
  const cardPath = `${outputBasePath}-card.webp`;

  await source
    .clone()
    .resize({ width: 1100, height: 825, fit: 'contain', background: transparent })
    .webp({ quality: 84, effort: 4 })
    .toFile(detailPath);

  await source
    .resize({ width: 480, height: 360, fit: 'contain', background: transparent })
    .webp({ quality: 82, effort: 4 })
    .toFile(cardPath);

  return { detailPath, cardPath, background: removed.background };
}

const products = (legacyCatalog.products || []).filter(isAquatecProduct);
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { products: {} };

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.join(outputRoot, 'aquatec'), { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(reportDir, `product-image-manifest-before-aquatec-source-${timestamp}.json`);
if (!dryRun) fs.copyFileSync(manifestPath, backupPath);

const cards = [];
for (const seedUrl of seedUrls) {
  try {
    const html = await fetchText(seedUrl);
    cards.push(...extractProductCards(html, seedUrl));
  } catch (error) {
    console.warn(`seed failed ${seedUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const usedImages = new Map();
const applied = [];
const skipped = [];
let productCount = 0;

for (const product of products) {
  if (maxProducts > 0 && productCount >= maxProducts) break;
  if (!shouldUpdateProduct(product, manifest)) continue;
  const sku = normalizeSku(product.sku || product.vendorCode);
  const match = findMatchingCard(product, cards) || aquatecOfficialFamilyFallback(product);
  if (!match) {
    skipped.push({ key: getProductKey(product), sku, error: 'no-matching-aquatec-card' });
    continue;
  }
  const { card } = match;

  try {
    let result = usedImages.get(card.imageUrl);
    if (!result) {
      const fetched = await fetchImage(card.imageUrl, card.pageUrl);
      if (!fetched.ok || fetched.buffer.length < 1024 || !/^image\//i.test(fetched.contentType)) {
        throw new Error(`not-image-${fetched.status}`);
      }
      const metadata = await sharp(fetched.buffer, { limitInputPixels: false }).metadata();
      result = {
        fetched,
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
      usedImages.set(card.imageUrl, result);
    }

    let normalized;
    let image;
    if (!dryRun) {
      const hash = crypto.createHash('sha1').update(result.fetched.buffer).digest('hex').slice(0, 16);
      const outputBasePath = path.join(outputRoot, 'aquatec', `${safeFilePart(sku)}-${hash}`);
      normalized = await normalizeBuffer(result.fetched.buffer, outputBasePath);
      const detailStat = fs.statSync(normalized.detailPath);
      const cardStat = fs.statSync(normalized.cardPath);
      image = {
        detail: publicPath(normalized.detailPath),
        card: publicPath(normalized.cardPath),
        width: 1100,
        height: 825,
        cardWidth: 480,
        cardHeight: 360,
        detailBytes: detailStat.size,
        cardBytes: cardStat.size,
      };

      for (const key of getManifestKeysForProduct(product, manifest)) {
        const previous = manifest.products?.[key] || {};
        manifest.products[key] = {
          ...previous,
          status: match.status,
          supplier: 'aquatec',
          originalImage: previous.originalImage || product.image,
          sourceKind: 'aquatec-source-card',
          sourceUrl: card.pageUrl,
          sourceImageUrl: card.imageUrl,
          duplicateCount: 1,
          background: normalized.background,
          image,
          originalBytes: result.fetched.buffer.length,
          notes: [
            ...(previous.notes || []).filter((note) => ![
              'fallback',
              'local-image-missing',
              'source-error',
              'same-source-image-used-by-multiple-products',
              'aquatec-source-exact-image',
              'aquatec-source-family-image',
            ].includes(note)),
            match.status === 'ready' ? 'aquatec-source-exact-image' : 'aquatec-source-family-image',
          ],
        };
      }
    }

    applied.push({
      key: getProductKey(product),
      manifestKeys: getManifestKeysForProduct(product, manifest),
      sku,
      title: card.title,
      sourceUrl: card.pageUrl,
      sourceImageUrl: card.imageUrl,
      status: match.status,
      matchKey: match.matchKey,
      originalBytes: result.fetched.buffer.length,
      width: result.width,
      height: result.height,
      background: normalized?.background,
    });
    productCount += 1;
  } catch (error) {
    skipped.push({ key: getProductKey(product), sku, error: error instanceof Error ? error.message : String(error), sourceImageUrl: card.imageUrl });
  }
}

if (!dryRun) {
  const statuses = Object.values(manifest.products || {}).reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});
  manifest.generatedAt = new Date().toISOString();
  manifest.stats = {
    ...(manifest.stats || {}),
    aquatecSourceImageBatch: {
      appliedAt: new Date().toISOString(),
      appliedProducts: applied.length,
      skippedProducts: skipped.length,
      sourceCards: cards.length,
    },
    readyProducts: statuses.ready || 0,
    familyImageProducts: statuses['family-image'] || 0,
    missingProducts: (statuses.missing || 0) + (statuses.fallback || 0),
    errorProducts: statuses['source-error'] || 0,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const report = {
  checkedAt: new Date().toISOString(),
  dryRun,
  manifest: path.relative(rootDir, manifestPath),
  backup: dryRun ? null : path.relative(rootDir, backupPath),
  totals: {
    sourceCards: cards.length,
    appliedProducts: applied.length,
    skippedProducts: skipped.length,
  },
  applied,
  skipped,
};
const reportPath = path.join(reportDir, `aquatec-source-image-apply-${timestamp}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, ...report.totals }, null, 2));
