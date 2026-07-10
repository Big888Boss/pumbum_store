import type { Product } from '@/entities/product/model';

export type CatalogFilterKey =
  | 'brand'
  | 'group'
  | 'type'
  | 'series'
  | 'size'
  | 'diameter'
  | 'material'
  | 'thread'
  | 'pressure'
  | 'temperature'
  | 'power'
  | 'head'
  | 'flow'
  | 'volume';

export type CatalogFilterSelection = Partial<Record<CatalogFilterKey, string>>;

export type CatalogFilterOption = {
  label: string;
  value: string;
  count: number;
};

export type CatalogFilter = {
  key: CatalogFilterKey;
  label: string;
  options: CatalogFilterOption[];
};

type FilterDefinition = {
  key: CatalogFilterKey;
  label: string;
  specKeys?: string[];
  getValue?: (product: Product) => string | undefined;
  alwaysShow?: boolean;
};

const filterDefinitions: FilterDefinition[] = [
  { key: 'brand', label: 'Бренд', getValue: (product) => product.brandName, alwaysShow: true },
  { key: 'group', label: 'Подраздел', getValue: getProductGroupLabel, alwaysShow: true },
  { key: 'type', label: 'Тип', specKeys: ['Тип', 'type', 'pump_type'] },
  { key: 'series', label: 'Серия', specKeys: ['Серия', 'series', 'filter_seriya_nasosa'] },
  { key: 'size', label: 'Размер', specKeys: ['Размер', 'size', 'tube_size_mm', 'tube_sizes_mm'] },
  { key: 'diameter', label: 'Диаметр', specKeys: ['Диаметр', 'diameter_mm', 'diameters_mm', 'filter_diameter', 'outlet_diameter', 'diametr_nasosa'] },
  { key: 'material', label: 'Материал', specKeys: ['Материал', 'material', 'impeller_material', 'pump_body_material', 'grate_material'] },
  { key: 'thread', label: 'Резьба', specKeys: ['Резьба', 'thread', 'prisoedinitelnyy_razmer'] },
  { key: 'pressure', label: 'Давление', specKeys: ['Давление', 'pressure', 'working_pressure', 'pressure_bar'] },
  { key: 'temperature', label: 'Температура', specKeys: ['Температура', 'temperature', 'working_temperature'] },
  { key: 'power', label: 'Мощность', specKeys: ['Мощность', 'power_w', 'power_kw'] },
  { key: 'head', label: 'Напор', specKeys: ['Напор', 'head_m', 'filter_napor'] },
  { key: 'flow', label: 'Производительность', specKeys: ['Производительность', 'flow_rate_l_min', 'filter_proizvoditelnost'] },
  { key: 'volume', label: 'Объем', specKeys: ['Объем', 'volume', 'volume_single_m3', 'accumulator_volume'] },
];

const maxFilters = 7;
const maxOptionsPerFilter = 14;

function cleanValue(value: unknown): string | undefined {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text || text === '-' || text === '—' || text.toLowerCase() === 'null') return undefined;
  return text;
}

function getFirstSpecValue(product: Product, keys: string[] = []): string | undefined {
  for (const key of keys) {
    const value = cleanValue(product.specs[key]);
    if (value) return value;
  }
  return undefined;
}

export function getProductGroupLabel(product: Product): string | undefined {
  const label = cleanValue(product.specs['Подраздел']) || cleanValue(product.specs['Группа']) || cleanValue(product.specs.group) || cleanValue(product.specs.type);
  return label && label !== product.name ? label : undefined;
}

function getFilterValue(product: Product, definition: FilterDefinition): string | undefined {
  return definition.getValue?.(product) || getFirstSpecValue(product, definition.specKeys);
}

function buildOptions(products: Product[], definition: FilterDefinition, selectedValue?: string): CatalogFilterOption[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = getFilterValue(product, definition);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const options = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, maxOptionsPerFilter)
    .map(([value, count]) => ({ label: value, value, count }));

  if (selectedValue && counts.has(selectedValue) && !options.some((option) => option.value === selectedValue)) {
    options.push({ label: selectedValue, value: selectedValue, count: counts.get(selectedValue) ?? 0 });
  }

  return options;
}

export function getCatalogFilterValue(product: Product, key: CatalogFilterKey): string | undefined {
  const definition = filterDefinitions.find((item) => item.key === key);
  return definition ? getFilterValue(product, definition) : undefined;
}

export function buildCatalogFilters(products: Product[], selected: CatalogFilterSelection): CatalogFilter[] {
  const filters = filterDefinitions
    .map((definition) => {
      const options = buildOptions(products, definition, selected[definition.key]);
      return { definition, options };
    })
    .filter(({ definition, options }) => options.length > 1 || (definition.alwaysShow && options.length > 0))
    .sort((a, b) => {
      if (a.definition.alwaysShow !== b.definition.alwaysShow) return a.definition.alwaysShow ? -1 : 1;
      return b.options.reduce((sum, option) => sum + option.count, 0) - a.options.reduce((sum, option) => sum + option.count, 0);
    })
    .slice(0, maxFilters);

  return filters.map(({ definition, options }) => ({
    key: definition.key,
    label: definition.label,
    options,
  }));
}

export function applyCatalogFilters(products: Product[], selected: CatalogFilterSelection): Product[] {
  const activeFilters = Object.entries(selected).filter((entry): entry is [CatalogFilterKey, string] => Boolean(entry[1]));
  if (activeFilters.length === 0) return products;

  return products.filter((product) =>
    activeFilters.every(([key, expected]) => getCatalogFilterValue(product, key) === expected)
  );
}

export function parseCatalogFilterSelection(params: Record<string, string | string[] | undefined>): CatalogFilterSelection {
  const selected: CatalogFilterSelection = {};
  for (const definition of filterDefinitions) {
    const raw = params[definition.key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const clean = cleanValue(value);
    if (clean) selected[definition.key] = clean;
  }
  return selected;
}

export function activeCatalogFilterCount(selected: CatalogFilterSelection): number {
  return Object.values(selected).filter(Boolean).length;
}
