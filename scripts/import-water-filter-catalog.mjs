import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalogFile = path.join(root, 'content/generated/legacy-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const vrt = read('content/sources/vrt/price-2026-09-20.json');
const vrtPhotos = read('content/sources/vrt/photos.json');
const vrtDetails = read('content/sources/vrt/details.json');
const aqua = read('content/sources/aquabright/offer-2026-06-19.json');
const aquaPhotos = read('content/sources/aquabright/photos.json');

function assert(condition, message) {
  if (!condition) throw new Error(`Water filter import: ${message}`);
}

const translit = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value) {
  return [...value.toLowerCase()].map((char) => translit[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function shortText(value, max = 170) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max + 1).replace(/\s+\S*$/, '').trim()}…`;
}

function sourcePrice(amount) {
  if (amount === null) return undefined;
  assert(Number.isFinite(amount) && amount > 0, `invalid retail price ${amount}`);
  return { amount, currency: 'RUB' };
}

function imageQuality(photo, hasPrice) {
  const exact = photo?.kind === 'exact';
  const series = photo?.kind === 'series';
  return {
    score: exact ? 91 : series ? 78 : 68,
    hasRealImage: exact || series,
    hasVerifiedSpecs: true,
    hasSourceRefs: true,
    hasPrice,
    hasAvailability: false,
    publishInSitemap: exact || series,
    notes: [
      'Наличие в магазине не подтверждено.',
      ...(!hasPrice ? ['Розничная цена в предложении поставщика не указана.'] : []),
      ...(series ? ['Фото показывает серию, а не подтвержденный внешний вид конкретной модели.'] : []),
      ...(!photo ? ['Фото конкретной модели у поставщика не найдено.'] : []),
    ],
  };
}

function photoRefs(photo) {
  return photo ? [{ type: 'supplier', label: `Фото товара: ${photo.kind === 'exact' ? 'модель' : 'серия'}`, url: photo.sourcePageUrl }] : [];
}

function vrtProduct(item, index) {
  const photo = vrtPhotos[item.code];
  const details = vrtDetails[item.code];
  assert(photo?.kind === 'exact' && details, `missing verified VRT photo/details for ${item.code}`);
  const isCartridge = /^картридж(?:\s|$)/iu.test(item.name.trim());
  const specs = {
    ...details.features,
    Артикул: item.code,
    Бренд: 'VRT',
    Производитель: 'VRT',
    Поставщик: 'Ф58',
    'Единица измерения': 'шт',
    Раздел: 'Фильтрация',
    Подраздел: isCartridge ? 'Картриджи для фильтров' : 'Фильтры и комплектующие',
  };
  const description = details.description || item.name;
  return {
    id: `water-vrt-${item.code}`,
    slug: `vrt-${item.code}`,
    categorySlug: 'filtraciya',
    brand: 'vrt', brandName: 'VRT', supplier: 'vrt', supplierName: 'VRT',
    name: item.name, sku: item.code, vendorCode: item.code,
    shortDescription: shortText(description),
    description,
    purpose: isCartridge ? 'Сменный элемент для бытовой фильтрации воды.' : 'Оборудование для бытовой фильтрации воды.',
    image: photo.file, logo: '/brand-logos/vrt.svg', hideBrandLogo: false,
    highlights: [`Код ${item.code}`, specs.Подраздел],
    sellingPoints: ['Точный код для подбора и заказа', 'Характеристики сверены с каталогом Ф58'],
    specs, crossSell: ['Фильтрация', 'VRT', specs.Подраздел],
    price: sourcePrice(item.retailRub), availability: 'unknown',
    sourceRefs: [
      { type: 'supplier', label: `Прайс VRT от 20.09.2026, строка ${item.row}, колонка «Розница»` },
      { type: 'supplier', label: 'Карточка VRT на Ф58', url: details.pageUrl },
    ],
    dataQuality: imageQuality(photo, true), updatedAt: '2026-09-29', sortOrder: index + 1,
  };
}

const manufacturerId = {
  АКВАБРАЙТ: 'aquabright', PUDEKANG: 'pudekang', VONTRON: 'vontron', Экобрайт: 'ecobright', АЛСИС: 'alsis',
};
const logos = {
  aquabright: '/brand-logos/aquabright.png', pudekang: '/brand-logos/pudekang.png',
  vontron: '/brand-logos/vontron.png', ecobright: '/brand-logos/ecobright.svg', alsis: '/brand-logos/alsis.png',
};
const alsisModels = new Set([
  'FM MC 18.5L 0,7-1,4', 'FM MC 18.5L',
  'FM AC 25L 0,7-1,4', 'FM AC 25L',
  'Засыпка для ОБЕЗЖЕЛЕЗ', 'FM MFU 18.5L',
]);
const conciseTitles = {
  'АБФ-КР-1': 'Латунный кран для фильтров АБФ-ТРИА и АБФ-ОСМО',
  'УПД-ОСМО МИНИ': 'Устройство повышения давления для обратного осмоса',
  'УПД-ОСМО-100': 'Устройство повышения давления для обратного осмоса',
  'АБФ-КР-2': 'Металлический кран с двумя керамическими кран-буксами',
  'УГА-ЛАЙН': 'Линейный угольный постфильтр',
  'АБФ-210ББ-БК на Столике': 'Двухступенчатая магистральная система 10BB без картриджей, на столике',
  'АБФ-20ББ-3-БК': 'Трёхступенчатая магистральная система 20BB без картриджей, на планке',
  'АБФ-КОМПАКТ': 'Система умягчения воды до 1 м³/ч',
  'АБФ-СТАНДАРТ': 'Система умягчения воды до 2 м³/ч',
  'ВП-10 М-20 ББ': 'Верёвочный картридж 20BB, 10 мкм',
  'ППГ-5М': 'Полипропиленовый картридж для горячей воды, 5 мкм',
  'ППГ-10М': 'Полипропиленовый картридж для горячей воды, 10 мкм',
  'ПП-5 М-10 ББ': 'Полипропиленовый картридж 10BB, 5 мкм',
  'ПП-5 М-20 ББ': 'Полипропиленовый картридж 20BB, 5 мкм',
  'УГА-10': 'Картридж с гранулированным активированным углём 10 дюймов',
  'УГА-10-КОКОС': 'Картридж с кокосовым углём 10 дюймов',
  'УГП-10': 'Угольный картридж «Карбон Блок» 10 дюймов',
  'УГП-10-КОКОС': 'Кокосовый угольный картридж «Карбон Блок» 10 дюймов',
  'Eco 6.25 IER L': 'Фильтрующая загрузка «Экобрайт Умягчение», 6,25 л',
  'КОМБИ-10': 'Комбинированный картридж для механической и сорбционной очистки, 10 дюймов',
  'PE0104 white/WE-2004W': 'Шланг 1/4, белый, цена за 1 м',
  'PE0104 red/WE-2004R': 'Шланг 1/4, красный, цена за 1 м',
  'PE0104 blue/WE-2004B': 'Шланг 1/4, синий, цена за 1 м',
  'PE0104/WE-2004Y': 'Шланг 1/4, жёлтый, цена за 1 м',
};

function aquaTitle(item) {
  if (conciseTitles[item.model]) return `${item.model} — ${conciseTitles[item.model]}`;
  let detail = item.name.replace(/^(?:№\s*\d+\s*)?/, '').trim();
  const displayModel = item.manufacturer === 'PUDEKANG' && item.model.includes('/')
    ? item.model.split('/')[0].trim()
    : item.model;
  const simpleModel = displayModel.replace(/\s+(?:3 штуки|Пустой|на Планке|На Столике|столик|с Мембраной).*$/i, '').trim();
  if (detail.toLocaleLowerCase('ru-RU').startsWith(simpleModel.toLocaleLowerCase('ru-RU'))) {
    detail = detail.slice(simpleModel.length).replace(/^[,.:;\s–-]+/, '');
  }
  if (item.manufacturer === 'PUDEKANG' && detail.includes(',')) {
    detail = detail.slice(detail.indexOf(',') + 1).trim();
  }
  detail = detail.replace(/\s*\([^)]*(?:коробк|паллет)[^)]*\)/gi, '').trim();
  if (item.model.startsWith('АБФ-ОСМО')) {
    detail = item.name.match(/Система очистки воды ОБРАТНОГО ОСМОСА[^.]+/i)?.[0] ?? detail;
    if (item.row === 30) detail = 'Система обратного осмоса, комплектация БКР';
    if (item.row === 34) detail = 'Система обратного осмоса с минерализатором';
  } else {
    detail = detail.split(/\.\s+(?=[А-ЯЁA-Z])/)[0].trim();
  }
  if (!detail) detail = item.section.toLocaleLowerCase('ru-RU');
  detail = shortText(detail, 112);
  return shortText(`${item.model} — ${detail}`, 160);
}

function aquaProduct(item, index) {
  // The offer leaves these media unbranded; the manufacturer's own catalog identifies
  // Sorbent AC/MC and MFU as ALSIS products. Do not extend this to other blank rows.
  const manufacturer = alsisModels.has(item.model) ? 'АЛСИС' : item.manufacturer;
  const brand = manufacturerId[manufacturer] ?? 'generic';
  const photo = aquaPhotos[item.model];
  const hasPrice = item.retailRub !== null;
  const categorySlug = item.row >= 39 && item.row <= 53 ? 'smesiteli-i-sifony' : 'filtraciya';
  const brandName = brand === 'generic' ? 'Производитель не указан' : manufacturer;
  const title = aquaTitle(item);
  const specs = {
    Модель: item.model,
    Бренд: brandName,
    Производитель: brandName,
    Поставщик: 'Terra Water',
    Раздел: categorySlug === 'filtraciya' ? 'Фильтрация' : 'Смесители и сифоны',
    Подраздел: item.section,
  };
  if (item.model.startsWith('PE0104')) specs['Единица цены'] = '1 м';
  if (photo?.kind === 'series') specs['Фото'] = 'Иллюстрация серии; исполнение модели может отличаться.';
  return {
    id: `water-terra-${slugify(item.model)}`,
    slug: `terra-${slugify(item.model)}`,
    categorySlug, brand, brandName,
    supplier: brand, supplierName: brand === 'generic' ? 'Terra Water' : brandName,
    name: title, sku: item.model, vendorCode: item.model,
    shortDescription: shortText(item.name), description: item.name,
    purpose: categorySlug === 'filtraciya' ? 'Оборудование и материалы для очистки воды.' : 'Кран или смеситель для кухонной питьевой системы.',
    image: photo?.file ?? '/images/generated-placeholders/catalog-product.svg',
    logo: logos[brand], hideBrandLogo: !logos[brand],
    highlights: [`Модель ${item.model}`, item.section],
    sellingPoints: ['Модель и характеристики из предложения Terra Water', 'Совместимость и наличие уточняются перед заказом'],
    specs, crossSell: [specs.Раздел, item.section, brandName],
    price: sourcePrice(item.retailRub), availability: 'unknown',
    sourceRefs: [
      { type: 'supplier', label: `Предложение Terra Water от 19.06.2026, строка ${item.row}, колонка «Розница»` },
      ...(brand === 'alsis' ? [{ type: 'supplier', label: 'Каталог производителя АЛСИС', url: 'https://alsis-ur.ru/category/catalog/' }] : []),
      ...photoRefs(photo),
    ],
    dataQuality: {
      ...imageQuality(photo, hasPrice),
      ...(item.row === 30 ? { score: 68, publishInSitemap: false } : {}),
      ...([30, 117].includes(item.row) ? { notes: [
        ...imageQuality(photo, hasPrice).notes,
        item.row === 30
          ? 'В исходном предложении комплектация БКР указана одновременно «без крана» и «с отдельным краном»; уточнить комплектацию.'
          : 'В исходном предложении модель указана «На Планке», а описание — «на столике»; исполнение нужно уточнить.',
      ] } : {}),
    },
    updatedAt: '2026-09-29', sortOrder: vrt.items.length + index + 1,
  };
}

assert(vrt.items.length === 51, `expected 51 VRT items, got ${vrt.items.length}`);
assert(aqua.items.length === 235, `expected 235 Terra Water items, got ${aqua.items.length}`);
assert(aqua.items.filter((item) => item.retailRub === null).length === 23, 'unexpected blank retail price count');

const imported = [
  ...vrt.items.map(vrtProduct),
  ...aqua.items.map(aquaProduct),
];
const importedSlugs = new Set(imported.map((item) => `${item.categorySlug}/${item.slug}`));
assert(importedSlugs.size === imported.length, 'duplicate imported product route');

const base = (catalog.products ?? []).filter((item) => !String(item.id).startsWith('water-vrt-') && !String(item.id).startsWith('water-terra-'));
const baseRoutes = new Set(base.map((item) => `${item.categorySlug}/${item.slug}`));
for (const route of importedSlugs) assert(!baseRoutes.has(route), `route collision ${route}`);
const baseIds = new Set(base.map((item) => item.id));
for (const item of imported) assert(!baseIds.has(item.id), `id collision ${item.id}`);

catalog.products = [...base, ...imported];
catalog.generatedAt = '2026-09-29T00:00:00.000Z';
catalog.stats = { ...catalog.stats, products: catalog.products.length };
const supplierStats = {};
for (const item of catalog.products) {
  const supplier = item.supplier || item.brand || 'generic';
  supplierStats[supplier] = (supplierStats[supplier] ?? 0) + 1;
}
catalog.supplierStats = supplierStats;
fs.writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ base: base.length, vrt: vrt.items.length, terra: aqua.items.length, total: catalog.products.length, images: imported.filter((item) => item.dataQuality.hasRealImage).length }, null, 2));
