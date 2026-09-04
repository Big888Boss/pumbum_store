import type { Product } from '@/entities/product/model';
import { getProductGroupLabel } from '@/lib/catalog/filters';
import { getProductTitleParameter } from '@/lib/catalog/specs';

const categoryLabels: Record<string, string> = {
  vodosnabzhenie: 'Оборудование для водоснабжения',
  kanalizaciya: 'Оборудование для канализации',
  filtraciya: 'Оборудование для фильтрации',
  nasosy: 'Насосное оборудование',
  'smesiteli-i-sifony': 'Смесители и сифоны',
  'krepezh-dlya-montazha': 'Крепёж для монтажа',
  'nasosy-i-vodosnabzhenie': 'Оборудование для насосов и водоснабжения',
  'kanalizaciya-i-vodootvedenie': 'Оборудование для канализации и водоотведения',
  'truby-i-fitingi': 'Трубы и фитинги',
  'otoplenie-i-kotelnaya': 'Оборудование для отопления и котельной',
  'armatura-i-komplektuyuschie': 'Арматура и комплектующие',
  'prochee-oborudovanie': 'Инструмент и расходные материалы',
};

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

const inStockCopyPatterns = [
  /\s*Позиция есть в наличии; актуальное количество уточнит менеджер\.?/gi,
  /\s*Позиция есть в наличии\. Актуальное количество уточнит менеджер\.?/gi,
];

function trimAtWord(value: string, maxLength: number): string {
  const clean = compact(value);
  if (clean.length <= maxLength) return clean;
  const shortened = clean.slice(0, maxLength + 1).replace(/\s+\S*$/, '').trim();
  return `${shortened || clean.slice(0, maxLength).trim()}…`;
}

export function getProductDisplayName(product: Product): string {
  const name = compact(product.name);
  const brand = compact(product.brandName);
  return name.toLocaleLowerCase('ru-RU').includes(brand.toLocaleLowerCase('ru-RU'))
    ? name
    : `${brand} ${name}`;
}

function getProductIdentifier(product: Product): string {
  return compact(product.sku || product.vendorCode || product.slug);
}

export function getProductLocalSummary(product: Product): string {
  const group = getProductGroupLabel(product) || categoryLabels[product.categorySlug] || 'Инженерное оборудование';
  return `${compact(group).replace(/[.!?]+$/, '')}. Продажа и самовывоз в Саратове.`;
}

export function getProductVisibleText(product: Product, value: string): string {
  if (product.availability !== 'in_stock') return compact(value);
  return compact(inStockCopyPatterns.reduce((text, pattern) => text.replace(pattern, ' '), value));
}

export function getProductVisibleDescription(product: Product): string {
  const description = getProductVisibleText(product, product.description);
  return description || `${getProductDisplayName(product)}: характеристики и параметры позиции приведены в карточке товара.`;
}

export function getProductCardDescription(product: Product): string {
  const description = getProductVisibleText(product, product.shortDescription);
  return description || getProductLocalSummary(product);
}

// Название с ключевым параметром: «AQUARIO ADB-35, напор 35 м» — для H1 и title.
export function getProductDisplayTitle(product: Product): string {
  const name = getProductDisplayName(product);
  const parameter = getProductTitleParameter(product);
  return parameter ? `${name}, ${parameter}` : name;
}

export function getProductSeoTitle(product: Product): string {
  const parameter = getProductTitleParameter(product);
  const identity = parameter
    ? `${getProductIdentifier(product)}, ${parameter}`
    : getProductIdentifier(product);
  return trimAtWord(`${identity} — ${getProductDisplayName(product)} | Сантехникъ`, 75);
}

export function getProductSeoDescription(product: Product): string {
  const orderNote = product.availability === 'preorder'
    ? 'Поставка под заказ, срок подтвердит менеджер.'
    : 'Актуальную цену и возможность отгрузки подтвердит менеджер.';
  return trimAtWord(
    `${getProductIdentifier(product)}. ${getProductDisplayTitle(product)}. ${getProductLocalSummary(product)} Характеристики и фото. ${orderNote}`,
    170,
  );
}
