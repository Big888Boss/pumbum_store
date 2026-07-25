import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = process.env.LEGACY_CATALOG_SOURCE ?? join(root, '..', 'legacy-source-data', 'legacy_src_data');
const outputPath = process.env.LEGACY_CATALOG_OUTPUT ?? join(root, 'content', 'generated', 'legacy-catalog.json');
const generatedAt = process.env.LEGACY_CATALOG_GENERATED_AT ?? new Date().toISOString();
const placeholderImage = '/images/generated-placeholders/catalog-product.svg';
const skippedFiles = new Set([
  'products.json',
  'valtec/catalog_desc.json',
  'valtec/catalog_image_overrides.json',
  'valtec/documents.json',
]);
const remoteImageHosts = [
  'https://aquario.ru/',
  'https://gidrokontrakt.ru/',
  'https://valtec.ru/',
  'https://zota.ru/',
];

const translit = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/<[^>]*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasSentenceEnd(text) {
  return /[.!?]$/.test(text);
}

function ensureSentenceEnd(value) {
  const text = value.replace(/[.…\s]+$/g, '').trim();
  if (!text) return '';
  return hasSentenceEnd(text) ? text : `${text}.`;
}

function truncateAtSentence(value, maxLength, options = {}) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return ensureSentenceEnd(text);

  const overflow = Number(options.allowOverflow ?? 0);
  const sentenceSearchSlice = text.slice(0, maxLength + Math.max(0, overflow));
  const minUsefulBoundary = Math.min(240, Math.floor(maxLength * 0.35));
  const sentenceEnds = [...sentenceSearchSlice.matchAll(/[.!?](?=\s|$|["')»\]])/g)]
    .filter((match) => (match.index ?? 0) >= minUsefulBoundary);
  const lastSentenceEnd = sentenceEnds.at(-1);
  if (lastSentenceEnd?.index !== undefined) {
    return ensureSentenceEnd(sentenceSearchSlice.slice(0, lastSentenceEnd.index + 1));
  }

  const slice = text.slice(0, maxLength);
  const wordSafeSlice = slice.replace(/\s+\S*$/u, '').trim();
  return ensureSentenceEnd(wordSafeSlice || slice);
}

function slugify(value, fallback = 'item') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => translit[char] ?? char)
    .join('')
    .replace(/&/g, ' i ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return normalized || fallback;
}

function asPrimitiveText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(asPrimitiveText).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value);
}

function addSpec(specs, key, value) {
  const text = asPrimitiveText(value);
  if (!text) return;
  specs[key] = text;
}

function collectPublicSpecs(...objects) {
  const skip = new Set([
    'categorySlug',
    'description_full',
    'description_short',
    'filter_po_tipu',
    'groupId',
    'groupSlug',
    'group_name',
    'image_url',
    'image_urls',
    'items',
    'link',
    'name',
    'oldPrice',
    'price',
    'productGroups',
    'seo_meta_description',
    'seo_slug',
    'seo_title',
    'source_url',
    'sourceUrl',
    'specs',
    'subcategorySlug',
    'vendor',
  ]);
  const specs = {};
  for (const object of objects) {
    if (!object || typeof object !== 'object') continue;
    for (const [key, value] of Object.entries(object)) {
      if (skip.has(key)) continue;
      addSpec(specs, key, value);
    }
  }
  return specs;
}

function safeImage(value) {
  const src = asPrimitiveText(value);
  if (!src) return placeholderImage;
  if (src === '/placeholder.svg') return placeholderImage;
  if (src.startsWith('/images/generated-v2/')) return src;
  if (src.startsWith('/images/products/')) return src;
  if (remoteImageHosts.some((host) => src.startsWith(host))) return src;
  return placeholderImage;
}

function firstSafeImage(...values) {
  for (const value of values) {
    const image = safeImage(value);
    if (image !== placeholderImage) return image;
  }
  return placeholderImage;
}

function brandId(brandName) {
  const normalized = String(brandName ?? '').toLowerCase();
  if (normalized.includes('valtec')) return 'valtec';
  if (normalized.includes('aquario')) return 'aquario';
  if (normalized.includes('zota')) return 'zota';
  if (normalized.includes('vivaldo')) return 'vivaldo';
  if (normalized.includes('sinikon') || normalized.includes('синикон')) return 'sinikon';
  if (normalized.includes('aquatec') || normalized.includes('акватек') || normalized.includes('aq-plastic')) return 'aquatec';
  if (normalized.includes('gidrokontrakt') || normalized.includes('гидроконтракт')) return 'gidrokontrakt';
  if (/\btim\b/.test(normalized) || normalized.includes('тим')) return 'tim';
  return 'generic';
}

function brandLogo(brandName) {
  const id = brandId(brandName);
  if (id === 'valtec') return '/brand-logos/valtec.svg';
  if (id === 'aquario') return '/brand-logos/aquario.svg';
  if (id === 'zota') return '/brand-logos/zota.svg';
  if (id === 'vivaldo') return '/brand-logos/vivaldo.png';
  if (id === 'sinikon') return '/images/brands/sinikon.svg';
  if (id === 'aquatec') return '/brand-logos/aquatec.svg';
  if (id === 'gidrokontrakt') return '/brand-logos/gidrokontrakt.svg';
  return undefined;
}

function sourceSlug(rel, data) {
  if (rel.startsWith('catalog/')) return slugify(rel.replace(/^catalog\//, '').replace(/\.json$/, ''), 'catalog-section');
  if (rel === 'valtec/catalog.json') return 'valtec';
  if (!Array.isArray(data) && data?.slug) return slugify(data.slug);
  return slugify(rel.split('/')[0], 'legacy-section');
}

function sourceName(rel, data) {
  if (rel.startsWith('catalog/') && !Array.isArray(data) && data?.name) return data.name;
  if (!Array.isArray(data) && data?.name) return data.name;
  if (!Array.isArray(data) && data?.id) return data.id;
  if (rel === 'valtec/catalog.json') return 'VALTEC';
  return rel.replace(/\.json$/, '');
}

function makeCategory(slug, name, rel, index) {
  return {
    slug,
    name,
    h1: `${name}: товары и комплектующие`,
    title: `${name} — каталог товаров`,
    description: `Каталог ${name}: товары, артикулы и характеристики для подбора инженерной сантехники.`,
    intro: `В разделе ${name} собраны позиции для комплектации инженерных систем. Для заказа проверяем совместимость, актуальную цену и наличие перед выставлением предложения.`,
    seoText: `${name}: товарные позиции с артикулами, характеристиками и заявкой на подбор. Цена и наличие уточняются перед заказом.`,
    buyingGuide: 'Для точного подбора нужны артикул, размер, серия, условия монтажа и требуемое количество. Перед заказом менеджер подтверждает цену и наличие.',
    faq: [
      {
        question: 'Можно ли заказать позицию сразу с сайта?',
        answer: 'Заявка отправляется на уточнение: цена и наличие должны быть подтверждены перед заказом.',
      },
      {
        question: 'Почему цена не показана как наличие?',
        answer: 'Цена и наличие подтверждаются менеджером перед оформлением, чтобы предложение было актуальным.',
      },
    ],
    priority: Math.max(38, 70 - index),
    sourceRefs: [{ type: 'legacy', label: rel }],
    updatedAt: generatedAt.slice(0, 10),
  };
}

function makeProduct({
  categorySlug,
  categoryName,
  rel,
  item,
  commonSpecs,
  groupName,
  subcategoryName,
  sourceUrl,
  imageUrl,
  name,
  sku,
  brandName,
  description,
  shortDescription,
  slugScope,
  addProduct,
}) {
  if (!asPrimitiveText(sku)) return;

  const specs = {};
  addSpec(specs, 'Артикул', sku);
  addSpec(specs, 'Бренд', brandName);
  addSpec(specs, 'Раздел', categoryName);
  addSpec(specs, 'Подраздел', subcategoryName);
  addSpec(specs, 'Группа', groupName);
  Object.assign(specs, collectPublicSpecs(commonSpecs, item?.specs, item));

  const image = firstSafeImage(imageUrl, item?.image_url, item?.specs?.image_url, commonSpecs?.image_url);
  const sourceRefs = [{ type: 'legacy', label: rel }];
  if (sourceUrl) sourceRefs.push({ type: 'supplier', label: `${brandName} source`, url: sourceUrl });

  const rawPrice = item?.price ?? item?.specs?.price;
  const notes = [
    'Перед публикацией цены и наличия нужна актуальная проверка.',
  ];
  if (rawPrice) notes.push(`В исходных данных есть цена (${rawPrice}), но для сайта ее нужно подтвердить вручную.`);

  const highlights = [
    sku ? `Артикул ${sku}` : '',
    groupName,
    ...Object.entries(specs).filter(([key]) => !['Артикул', 'Бренд', 'Раздел', 'Подраздел', 'Группа'].includes(key)).slice(0, 2).map(([key, value]) => `${key}: ${value}`),
  ].filter(Boolean).slice(0, 4);

  const product = {
    id: `legacy-${categorySlug}-${slugify(`${brandName}-${sku || name}`)}`,
    slug: slugScope(`${brandName}-${sku || name}`),
    categorySlug,
    brand: brandId(brandName),
    brandName,
    name,
    sku,
    vendorCode: sku,
    shortDescription: truncateAtSentence(shortDescription || description || `${name} из раздела ${categoryName}.`, 210, { allowOverflow: 60 }),
    description: truncateAtSentence(description || `${name} из раздела ${categoryName}. Перед заказом проверяем совместимость, актуальную цену и наличие.`, 900),
    purpose: truncateAtSentence(`Позиция для комплектации инженерной системы из раздела ${categoryName}.`, 220),
    image,
    logo: brandLogo(brandName),
    hideBrandLogo: !brandLogo(brandName),
    highlights,
    sellingPoints: ['точный артикул для быстрого заказа', 'проверяем совместимость перед заказом', 'подтверждаем цену и наличие перед предложением'],
    specs,
    crossSell: [categoryName, subcategoryName, groupName].filter(Boolean).slice(0, 3),
    availability: 'unknown',
    sourceRefs,
    dataQuality: {
      score: Math.min(90, 74 + (image !== placeholderImage ? 6 : 0) + (Object.keys(specs).length >= 4 ? 5 : 0) + (sourceUrl ? 5 : 0)),
      hasRealImage: image !== placeholderImage,
      hasVerifiedSpecs: Object.keys(specs).length >= 3,
      hasSourceRefs: true,
      hasPrice: false,
      hasAvailability: false,
      publishInSitemap: Boolean(name && sku),
      notes,
    },
    updatedAt: generatedAt.slice(0, 10),
  };

  addProduct(product);
}

function importProductGroupTree({ data, rel, categorySlug, categoryName, addProduct }) {
  function scopedSlug() {
    const used = new Set();
    return (value) => {
      const base = slugify(value, 'product').slice(0, 96);
      let slug = base;
      let index = 2;
      while (used.has(slug)) {
        slug = `${base}-${index}`;
        index += 1;
      }
      used.add(slug);
      return slug;
    };
  }

  const slugScope = scopedSlug();

  // Fallback names must distinguish family-image variants. For example, SINIKON
  // tee products can share one photo but differ by diameters and angle.
  function buildFallbackName(groupName, sku, item) {
    const src = { ...(item?.specs ?? {}), ...item };
    const parts = [];
    if (asPrimitiveText(src.diameters_mm)) parts.push(`Ø${src.diameters_mm}`);
    if (asPrimitiveText(src.angle_deg)) parts.push(`${src.angle_deg}°`);
    if (asPrimitiveText(src.length_mm)) parts.push(`L=${src.length_mm} мм`);
    if (asPrimitiveText(src.size)) parts.push(String(src.size));
    const type = asPrimitiveText(src.type);
    const head = type && parts.length
      ? [type, parts.join(' ')].join(' ')
      : [groupName, parts.join(' ')].filter(Boolean).join(' ');
    return [head, sku].filter(Boolean).join(' — ');
  }

  function visit(node, ctx = {}) {
    if (Array.isArray(node)) {
      for (const child of node) visit(child, ctx);
      return;
    }
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.productGroups)) {
      for (const group of node.productGroups) {
        const groupName = group.groupName ?? group.name ?? group.group_name ?? group.groupSlug ?? ctx.groupName;
        const commonSpecs = group.commonSpecs ?? {};
        for (const item of group.items ?? []) {
          const sku = asPrimitiveText(item.article ?? item.code ?? item.sku ?? item.vendorCode ?? item.megapolis_article);
          const brandName = asPrimitiveText(item.vendor ?? item.specs?.vendor ?? commonSpecs.vendor ?? ctx.brandName ?? 'СИНИКОН');
          const name = asPrimitiveText(item.name ?? item.specs?.name) || buildFallbackName(groupName, sku, item);
          makeProduct({
            categorySlug,
            categoryName,
            rel,
            item,
            commonSpecs,
            groupName,
            subcategoryName: ctx.subcategoryName,
            sourceUrl: asPrimitiveText(item.source_url ?? item.specs?.source_url ?? data.sourceUrl),
            imageUrl: item.image_url ?? item.specs?.image_url ?? commonSpecs.image_url,
            name,
            sku,
            brandName,
            shortDescription: group.description_short ?? item.specs?.description_short,
            description: group.description_full ?? item.specs?.description_full ?? group.description_short,
            slugScope,
            addProduct,
          });
        }
      }
    }

    if (Array.isArray(node.subcategories)) {
      for (const subcategory of node.subcategories) {
        visit(subcategory, {
          ...ctx,
          subcategoryName: subcategory.name ?? ctx.subcategoryName,
          brandName: data.name ?? ctx.brandName,
        });
      }
    }
  }

  visit(data, { brandName: data?.name });
}

function importValtec({ data, rel, descMap, imageOverrides, categorySlug, categoryName, addProduct }) {
  const used = new Set();
  const usedArticles = new Set();
  const cleanText = (value) => asPrimitiveText(value).trim();
  const slugScope = (value) => {
    const base = slugify(value, 'product').slice(0, 96);
    let slug = base;
    let index = 2;
    while (used.has(slug)) {
      slug = `${base}-${index}`;
      index += 1;
    }
    used.add(slug);
    return slug;
  };

  function uniqueArticle(article, fallback) {
    const base = cleanText(article) || fallback;
    let candidate = base;
    let index = 2;
    while (usedArticles.has(candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    usedArticles.add(candidate);
    return candidate;
  }

  const sections = Array.isArray(data) ? data : [];
  for (const [sectionIndex, section] of sections.entries()) {
    const sourceGroups = Array.isArray(section?.items) ? section.items : [];
    const sectionName = cleanText(section?.name) || `Раздел VALTEC ${sectionIndex + 1}`;

    for (const [groupIndex, sourceGroup] of sourceGroups.entries()) {
      const sourceProducts = Array.isArray(sourceGroup?.items) ? sourceGroup.items : [];
      const groupName = cleanText(sourceGroup?.name) || `Товарная группа ${groupIndex + 1}`;

      for (const [modelIndex, sourceProduct] of sourceProducts.entries()) {
        const series = cleanText(sourceProduct?.series);
        const desc = descMap[series] ?? descMap[sourceProduct?.code] ?? descMap[sourceProduct?.name] ?? {};
        const modelName = cleanText(sourceProduct?.name) || cleanText(desc.name) || `${groupName} ${modelIndex + 1}`;
        const vendor = cleanText(sourceProduct?.vendor) || cleanText(desc.vendor) || 'VALTEC';
        const description = stripHtml(desc.text ?? sourceProduct?.description ?? modelName);
        const sourceItems = Array.isArray(sourceProduct?.items) ? sourceProduct.items : [];
        const sourceLink = cleanText(sourceProduct?.link);

        for (const [itemIndex, sourceItem] of sourceItems.entries()) {
          const rawArticle = cleanText(sourceItem?.code);
          const size = cleanText(sourceItem?.size);
          const price = cleanText(sourceItem?.price);
          const isBlankRow = !rawArticle && !size && (!price || price === '0');
          if (isBlankRow) continue;

          const article = uniqueArticle(
            rawArticle,
            `${series || slugify(sectionName, 'valtec')}-${modelIndex + 1}-${itemIndex + 1}`,
          );
          const item = {
            ...sourceItem,
            article,
            code: rawArticle || article,
            series,
            vendor,
            price,
          };
          const name = [modelName, size].filter(Boolean).join(', ');

          makeProduct({
            categorySlug,
            categoryName,
            rel,
            item,
            commonSpecs: { category_path: [sectionName, groupName].filter(Boolean).join(' / '), vendor },
            groupName,
            subcategoryName: sectionName,
            sourceUrl: sourceLink,
            imageUrl: imageOverrides[sourceLink] ?? sourceProduct?.image_url ?? sourceProduct?.imageUrl,
            name,
            sku: article,
            brandName: vendor,
            shortDescription: description || name,
            description: description || `${name} из каталога VALTEC. Перед заказом проверяем совместимость, актуальную цену и наличие.`,
            slugScope,
            addProduct,
          });
        }
      }
    }
  }
}

if (!existsSync(sourceRoot)) {
  throw new Error(`Legacy catalog source not found: ${sourceRoot}`);
}

const files = walk(sourceRoot)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ file, rel: relative(sourceRoot, file).replaceAll('\\', '/') }))
  .filter(({ rel }) => !rel.includes('/admin/'));

const descMapPath = join(sourceRoot, 'valtec', 'catalog_desc.json');
const imageOverridesPath = join(sourceRoot, 'valtec', 'catalog_image_overrides.json');
const descMap = existsSync(descMapPath) ? readJson(descMapPath) : {};
const imageOverrides = existsSync(imageOverridesPath) ? readJson(imageOverridesPath) : {};
const products = [];
const categories = [];
const statsBySource = [];

for (const { file, rel } of files.sort((a, b) => a.rel.localeCompare(b.rel))) {
  if (skippedFiles.has(rel)) continue;
  const data = readJson(file);
  const categorySlug = sourceSlug(rel, data);
  const categoryName = sourceName(rel, data);
  const before = products.length;
  categories.push(makeCategory(categorySlug, categoryName, rel, categories.length));
  const addProduct = (product) => products.push(product);

  if (rel === 'valtec/catalog.json') {
    importValtec({ data, rel, descMap, imageOverrides, categorySlug, categoryName, addProduct });
  } else {
    importProductGroupTree({ data, rel, categorySlug, categoryName, addProduct });
  }

  statsBySource.push({
    file: rel,
    categorySlug,
    categoryName,
    products: products.length - before,
  });
}

const generated = {
  generatedAt,
  sourceRootLabel: 'legacy_src_data',
  skippedFiles: Array.from(skippedFiles),
  stats: {
    sourceFiles: statsBySource.length,
    categories: categories.length,
    products: products.length,
  },
  statsBySource,
  categories,
  products,
};

mkdirSync(dirname(outputPath), { recursive: true });
const serialized = process.env.LEGACY_CATALOG_PRETTY === '1' ? JSON.stringify(generated, null, 2) : JSON.stringify(generated);
writeFileSync(outputPath, `${serialized}\n`);
console.log(`Legacy catalog generated: ${outputPath}`);
console.log(`Categories: ${generated.stats.categories}`);
console.log(`Products: ${generated.stats.products}`);
