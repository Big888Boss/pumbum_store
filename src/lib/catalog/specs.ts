import type { Product } from '@/entities/product/model';

const specLabels: Record<string, string> = {
  article: 'Артикул',
  article_vendor: 'Артикул поставщика',
  code: 'Код',
  type: 'Тип',
  series: 'Серия',
  group: 'Группа',
  size: 'Размер',
  material: 'Материал',
  thread: 'Резьба',
  diameter_mm: 'Диаметр',
  diameters_mm: 'Диаметры',
  tube_size_mm: 'Размер трубы',
  tube_sizes_mm: 'Размеры труб',
  wall_thickness_mm: 'Толщина стенки',
  angle: 'Угол',
  angle_deg: 'Угол',
  power_w: 'Мощность',
  power_kw: 'Мощность',
  head_m: 'Напор',
  flow_rate_l_min: 'Производительность',
  voltage_v: 'Напряжение',
  pump_type: 'Тип насоса',
  pump_body_material: 'Материал корпуса',
  impeller_material: 'Материал рабочего колеса',
  accumulator_volume: 'Объем бака',
  volume_single_m3: 'Объем',
  volume_l: 'Объем',
  length_mm: 'Длина',
  length_m_options: 'Длины',
  width_mm: 'Ширина',
  height_mm: 'Высота',
  color: 'Цвет',
  weight_kg: 'Вес',
  warranty: 'Гарантия',
  country_of_origin: 'Страна производства',
};

const keyFactGroups = [
  ['Артикул', 'article', 'code'],
  ['Код поставщика', 'code', 'article_vendor', 'megapolis_article'],
  ['Тип', 'type', 'pump_type'],
  ['Серия', 'series'],
  ['Размер', 'size', 'tube_size_mm', 'tube_sizes_mm'],
  ['Диаметр', 'diameter_mm', 'diameters_mm', 'filter_diameter', 'outlet_diameter', 'diametr_nasosa'],
  ['Угол', 'angle_deg', 'angle'],
  ['Длина', 'length_mm', 'length_m_options'],
  ['Высота', 'height_mm'],
  ['Ширина', 'width_mm'],
  ['Объем', 'volume_single_m3', 'volume_l', 'accumulator_volume'],
  ['Цвет', 'color'],
  ['Материал', 'material', 'pump_body_material', 'impeller_material'],
  ['Резьба', 'thread', 'prisoedinitelnyy_razmer'],
  ['Мощность', 'power_w', 'power_kw'],
  ['Напор', 'head_m', 'filter_napor'],
  ['Производительность', 'flow_rate_l_min', 'filter_proizvoditelnost'],
];

const distinctionFactGroups = [
  ['Код поставщика', 'code', 'article_vendor', 'megapolis_article'],
  ['Размер', 'size', 'tube_size_mm', 'tube_sizes_mm'],
  ['Диаметры', 'diameters_mm'],
  ['Диаметр', 'diameter_mm', 'filter_diameter', 'outlet_diameter', 'diametr_nasosa'],
  ['Угол', 'angle_deg', 'angle'],
  ['Длина', 'length_mm', 'length_m_options'],
  ['Высота', 'height_mm'],
  ['Ширина', 'width_mm'],
  ['Объем', 'volume_single_m3', 'volume_l', 'accumulator_volume'],
  ['Мощность', 'power_w', 'power_kw'],
  ['Напор', 'head_m', 'filter_napor'],
  ['Производительность', 'flow_rate_l_min', 'filter_proizvoditelnost'],
  ['Материал', 'material', 'pump_body_material', 'impeller_material'],
  ['Резьба', 'thread', 'prisoedinitelnyy_razmer'],
  ['Цвет', 'color'],
  ['Серия', 'series'],
  ['Тип', 'type', 'pump_type'],
  ['Группа', 'Группа', 'group'],
];

function clean(value: unknown): string | undefined {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text && text !== '-' && text !== '—' ? text : undefined;
}

export function formatSpecLabel(key: string): string {
  return specLabels[key] || key.replace(/[_-]+/g, ' ');
}

function firstSpecValue(product: Product, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = clean(product.specs[key]);
    if (value) return value;
  }
  return undefined;
}

export function getProductKeyFacts(product: Product, limit = 4): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();

  const sku = clean(product.sku || product.vendorCode);
  if (sku) {
    facts.push(`Артикул ${sku}`);
    seen.add(`Артикул:${sku}`);
  }

  for (const [label, ...keys] of keyFactGroups) {
    if (facts.length >= limit) break;
    if (label === 'Артикул' && sku) continue;
    const value = firstSpecValue(product, keys);
    if (!value) continue;
    const signature = `${label}:${value}`;
    if (seen.has(signature)) continue;
    facts.push(`${label}: ${value}`);
    seen.add(signature);
  }

  return facts.slice(0, limit);
}

// [specKey, подпись, единица для «голых» числовых значений]
const titleParameterSpecs: Array<[string, string, string]> = [
  ['head_m', 'напор', 'м'],
  ['filter_napor', 'напор', 'м'],
  ['power_w', 'мощность', 'Вт'],
  ['power_kw', 'мощность', 'кВт'],
  ['flow_rate_l_min', 'производительность', 'л/мин'],
  ['filter_proizvoditelnost', 'производительность', ''],
  ['volume_l', 'объём', 'л'],
  ['volume_single_m3', 'объём', 'м³'],
  ['accumulator_volume', 'объём', ''],
  ['angle_deg', 'угол', ''],
  ['angle', 'угол', ''],
  ['height_mm', 'высота', 'мм'],
  ['length_mm', 'длина', 'мм'],
  ['width_mm', 'ширина', 'мм'],
  ['diameter_mm', 'диаметр', 'мм'],
  ['size', 'размер', ''],
  ['tube_size_mm', 'размер', 'мм'],
];

function normalizeForComparison(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/\s+/g, '');
}

export function getProductTitleParameter(product: Product): string | undefined {
  const nameNormalized = normalizeForComparison(product.name);
  for (const [key, label, unit] of titleParameterSpecs) {
    const raw = clean(product.specs[key]);
    if (!raw || raw.length > 24) continue;
    if (nameNormalized.includes(normalizeForComparison(raw))) continue;
    // Микрообъёмы вида «0.00035 м³» у мелкой фурнитуры — шум, не ключевой параметр.
    if (key === 'volume_single_m3' && parseFloat(raw.replace(',', '.')) < 0.5) continue;
    const value = unit && /^\d+([.,]\d+)?$/.test(raw) ? `${raw} ${unit}` : raw;
    return `${label} ${value}`;
  }
  return undefined;
}

export function getProductDistinctionFacts(product: Product, limit = 4): string[] {
  const facts: string[] = [];
  const seenValues = new Set<string>();
  const sku = clean(product.sku || product.vendorCode || product.specs['Артикул']);
  const article = clean(product.specs.article);
  const code = clean(product.specs.code);

  for (const [label, ...keys] of distinctionFactGroups) {
    if (facts.length >= limit) break;
    const value = firstSpecValue(product, keys);
    if (!value) continue;
    if ((label === 'Код поставщика' || label === 'Артикул') && (value === sku || value === article)) continue;
    const normalized = `${label}:${value}`.toLowerCase();
    if (seenValues.has(normalized)) continue;
    if (label === 'Код поставщика' && code && sku && code === sku) continue;
    facts.push(`${label}: ${value}`);
    seenValues.add(normalized);
  }

  if (facts.length === 0 && sku) facts.push(`Артикул ${sku}`);
  return facts.slice(0, limit);
}
