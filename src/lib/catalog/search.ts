import type { Product } from '@/entities/product/model';
import { getAllProducts } from '@/lib/catalog/loaders';

export type ProductSearchInput = {
  query?: string;
  categorySlug?: string;
  limit?: number;
};

export type ProductSearchResult = {
  product: Product;
  score: number;
  matchedBy: string[];
};

export type ProductSearchResponse = {
  results: ProductSearchResult[];
  total: number;
  mode: 'strict' | 'related';
};

const brandAliasGroups = [
  ['SINIKON', 'sinikon', 'sinicon', 'синикон'],
  ['VALTEC', 'valtec', 'валтек', 'вальтек'],
  ['AQUARIO', 'aquario', 'aquarius', 'акварио', 'аквариус'],
  ['AQUATEC', 'aquatec', 'akvatek', 'aq-plastic', 'акватек'],
  ['GIDROKONTRAKT', 'gidrokontrakt', 'gidro kontrakt', 'hydrocontract', 'гидроконтракт'],
  ['ZOTA', 'zota', 'зота'],
  ['VIVALDO', 'vivaldo', 'vivalda', 'вивальдо', 'вивалдо'],
  ['TIM', 'tim', 'team', 'тим'],
] as const;

const semanticAliasGroups = [
  ['водонагреватель', 'эвн', 'электроводонагреватель', 'электрический водонагреватель', 'водогрейка', 'нагреватель воды', 'бойлер'],
  ['гвс', 'горячее водоснабжение'],
  ['кран шаровой', 'кран шаровый', 'шаровой кран', 'шаровый кран', 'шаровые краны'],
  ['канализация', 'канализационный', 'канализационная', 'канализационные'],
  ['насос', 'насосы', 'насосная станция', 'насосное оборудование'],
  ['фитинг', 'фитинги', 'соединитель', 'соединители'],
  ['труба', 'трубы', 'трубопровод'],
  ['котел', 'котлы', 'котельное оборудование'],
  ['радиатор', 'радиаторы', 'радиаторная арматура'],
  ['теплый пол', 'теплый пол', 'теплые полы'],
] as const;

const queryTokenAlternatives: Record<string, string[]> = {
  водонагреватель: ['бойлер', 'эвн', 'водогрейка'],
  бойлер: ['водонагреватель', 'эвн', 'водогрейка'],
  эвн: ['водонагреватель', 'бойлер'],
  водогрейка: ['водонагреватель', 'бойлер'],
  гвс: ['водоснабжение'],
  шаровой: ['шаровый'],
  шаровый: ['шаровой'],
  фитинг: ['соединитель'],
  соединитель: ['фитинг'],
};

const stopWords = new Set([
  'а',
  'в',
  'во',
  'для',
  'до',
  'и',
  'или',
  'из',
  'к',
  'на',
  'от',
  'по',
  'под',
  'при',
  'с',
  'со',
  'тип',
  'арт',
  'артикул',
  'мм',
  'см',
  'м',
  'шт',
]);

type SearchField = {
  text: string;
  tokens: string[];
};

type QueryTerm = {
  token: string;
  alternatives: string[];
};

type ProductWithSupplier = Product & {
  supplier?: string;
  supplierName?: string;
};

function getSupplierName(product: Product): string | undefined {
  return (product as ProductWithSupplier).supplierName;
}

function getSupplierSlug(product: Product): string | undefined {
  return (product as ProductWithSupplier).supplier;
}

function decodeText(value: string): string {
  return value
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&laquo;/gi, ' ')
    .replace(/&raquo;/gi, ' ');
}

function normalizeBase(value: string): string {
  return decodeText(value)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/(\d)\s*[xх×]\s*(\d)/gi, '$1 x $2')
    .replace(/[°º]/g, ' град ')
    .replace(/[.,;:()[\]{}"«»<>/\\|_+=]+/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeToken(token: string): string {
  if (/^шаров(ой|ый|ая|ое|ого|ому|ым|ом|ые|ых|ыми|ую|ою)$/.test(token)) return 'шаровой';
  if (/^кран(а|у|ом|е|ы|ов|ами|ах)?$/.test(token)) return 'кран';
  if (/^водонагревател(ь|я|ю|ем|е|и|ей|ями|ях)?$/.test(token)) return 'водонагреватель';
  if (/^бойлер(а|у|ом|е|ы|ов|ами|ах)?$/.test(token)) return 'бойлер';
  if (/^накопительн(ый|ая|ое|ого|ому|ым|ом|ые|ых|ыми|ую)$/.test(token)) return 'накопительный';
  if (/^нагревател(ь|я|ю|ем|е|и|ей|ями|ях)?$/.test(token)) return 'нагреватель';
  if (/^фитинг(а|у|ом|е|и|ов|ами|ах)?$/.test(token)) return 'фитинг';
  if (/^соединител(ь|я|ю|ем|е|и|ей|ями|ях)?$/.test(token)) return 'соединитель';
  if (/^насос/.test(token)) return 'насос';
  if (/^труб(а|ы|е|у|ой|ами|ах)?$/.test(token)) return 'труба';
  if (/^трубопровод/.test(token)) return 'трубопровод';
  if (/^кот(ел|ла|лу|лом|ле|лы|лов|лами|лах)$/.test(token)) return 'котел';
  if (/^радиатор/.test(token)) return 'радиатор';
  if (/^канализац/.test(token)) return 'канализация';
  if (/^водоснабжен/.test(token)) return 'водоснабжение';
  if (/^запорн/.test(token)) return 'запорный';
  return token;
}

function normalizeWords(value: string): string {
  const prepared = normalizeBase(value);
  return prepared
    .split(' ')
    .map(canonicalizeToken)
    .filter(Boolean)
    .join(' ');
}

function hasNormalizedPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeWords(phrase);
  if (!normalizedPhrase) return false;
  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

function normalize(value: string): string {
  const prepared = normalizeWords(value);
  const expandedAliases = brandAliasGroups
    .flatMap(([canonical, ...aliases]) => aliases.some((alias) => hasNormalizedPhrase(prepared, alias)) ? [canonical] : []);
  const expandedSemanticAliases = semanticAliasGroups
    .flatMap(([canonical, ...aliases]) => aliases.some((alias) => hasNormalizedPhrase(prepared, alias)) ? [canonical] : []);

  return normalizeWords([prepared, ...expandedAliases, ...expandedSemanticAliases].join(' '));
}

function getBrandAliases(product: Product): string[] {
  const text = [
    product.brandName,
    product.brand,
    getSupplierName(product),
    getSupplierSlug(product),
    product.categorySlug,
    ...product.sourceRefs.map((source) => source.label),
    ...product.sourceRefs.map((source) => source.url ?? ''),
  ].join(' ').toLowerCase();

  return brandAliasGroups
    .filter(([, ...aliases]) => aliases.some((alias) => text.includes(normalizeBase(alias))))
    .flatMap(([canonical, ...aliases]) => [canonical, ...aliases]);
}

function compact(value: string): string {
  return normalizeWords(value).replace(/[^a-zа-я0-9]+/gi, '');
}

function buildField(values: Array<string | undefined>): SearchField {
  const text = normalize(values.filter(Boolean).join(' '));
  const tokens = Array.from(new Set(text.split(' ').filter((token) => token.length >= 2)));
  return {
    text,
    tokens,
  };
}

function buildQueryTerms(query: string): QueryTerm[] {
  const tokens = normalizeWords(query)
    .split(' ')
    .map(canonicalizeToken)
    .filter((token) => token.length >= 2 && !stopWords.has(token));

  const uniqueTokens = Array.from(new Set(tokens));
  return uniqueTokens.map((token) => {
    const alternatives = [
      token,
      ...(queryTokenAlternatives[token] ?? []),
    ].map(normalizeWords).flatMap((item) => item.split(' ')).filter((item) => item.length >= 2 && !stopWords.has(item));

    return {
      token,
      alternatives: Array.from(new Set(alternatives)),
    };
  });
}

function buildQueryVariants(query: string): string[] {
  const prepared = normalizeWords(query);
  const variants = new Set<string>();
  if (prepared.length >= 2) variants.add(prepared);

  for (const [canonical, ...aliases] of [...brandAliasGroups, ...semanticAliasGroups]) {
    if (aliases.some((alias) => hasNormalizedPhrase(prepared, alias))) {
      const normalized = normalizeWords(canonical);
      if (normalized.length >= 2) variants.add(normalized);
    }
  }

  return Array.from(variants);
}

function fieldHasPhrase(field: SearchField, variants: string[]): boolean {
  return variants.some((variant) => variant.length >= 2 && field.text.includes(variant));
}

function tokenMatches(field: SearchField, term: QueryTerm): boolean {
  for (const alternative of term.alternatives) {
    if (field.tokens.includes(alternative)) return true;
    if (alternative.length >= 4) {
      for (const token of field.tokens) {
        if (token.startsWith(alternative) || (alternative.startsWith(token) && token.length >= 4)) return true;
      }
    }
  }
  return false;
}

function countTokenMatches(field: SearchField, terms: QueryTerm[]): number {
  return terms.reduce((count, term) => count + (tokenMatches(field, term) ? 1 : 0), 0);
}

function countTokenMatchesAcross(fields: SearchField[], terms: QueryTerm[]): number {
  return terms.reduce(
    (count, term) => count + (fields.some((field) => tokenMatches(field, term)) ? 1 : 0),
    0,
  );
}

type ProductSearchIndexEntry = {
  product: Product;
  sku: string;
  skuCompact: string;
  name: SearchField;
  brand: SearchField;
  category: SearchField;
  specs: SearchField;
  description: SearchField;
};

const searchIndex: ProductSearchIndexEntry[] = getAllProducts().map((product) => {
  const skuValue = product.sku ?? product.vendorCode ?? '';
  const brandAliases = getBrandAliases(product);
  const specs = Object.entries(product.specs).flatMap(([key, value]) => [key, value]);
  const name = buildField([product.name]);
  const brand = buildField([product.brandName, getSupplierName(product), product.brand, getSupplierSlug(product), ...brandAliases]);
  const category = buildField([product.categorySlug, product.purpose, product.specs['Раздел'], product.specs['Подраздел'], product.specs['Группа']]);
  const specsField = buildField([product.sku, product.vendorCode, ...product.highlights, ...specs]);
  const description = buildField([product.shortDescription, product.description, ...product.sellingPoints, ...(product.suitableFor ?? [])]);

  return {
    product,
    sku: normalizeWords(skuValue),
    skuCompact: compact(skuValue),
    name,
    brand,
    category,
    specs: specsField,
    description,
  };
});

export function searchProducts({ query = '', categorySlug = '', limit = 60 }: ProductSearchInput): ProductSearchResult[] {
  return searchProductsWithTotal({ query, categorySlug, limit }).results;
}

function rankProducts({ query, categorySlug, limit, mode }: Required<ProductSearchInput> & { mode: 'strict' | 'related' }): ProductSearchResponse {
  const q = normalizeWords(query);
  const qCompact = compact(query);
  const terms = buildQueryTerms(query);
  const queryVariants = buildQueryVariants(query);
  if (terms.length === 0 && !categorySlug) return { results: [], total: 0, mode };

  const matches = searchIndex
    .filter(({ product }) => !categorySlug || product.categorySlug === categorySlug)
    .map(({ product, sku, skuCompact, name, brand, category, specs, description }) => {
      const matchedBy: string[] = [];
      let score = 0;

      if (!q && categorySlug) {
        score += 1;
        matchedBy.push('раздел');
      }
      if (q && sku && sku === q) {
        score += 120;
        matchedBy.push('точный артикул');
      } else if (qCompact && skuCompact && skuCompact === qCompact) {
        score += 110;
        matchedBy.push('точный артикул');
      } else if (q && sku && sku.includes(q)) {
        score += 80;
        matchedBy.push('артикул');
      } else if (qCompact && skuCompact && skuCompact.includes(qCompact)) {
        score += 72;
        matchedBy.push('артикул');
      }

      const namePhrase = fieldHasPhrase(name, queryVariants);
      const brandPhrase = fieldHasPhrase(brand, queryVariants);
      const categoryPhrase = fieldHasPhrase(category, queryVariants);
      const specsPhrase = fieldHasPhrase(specs, queryVariants);

      if (q && name.text === q) {
        score += 90;
        matchedBy.push('точное название');
      } else if (namePhrase) {
        score += 62;
        matchedBy.push('название');
      }
      if (brandPhrase || (q && brand.text.includes(q))) {
        score += 42;
        matchedBy.push('бренд');
      }
      if (categoryPhrase) {
        score += 24;
        matchedBy.push('раздел');
      }
      if (specsPhrase) {
        score += 18;
        matchedBy.push('характеристики');
      }

      const nameMatches = countTokenMatches(name, terms);
      const brandMatches = countTokenMatches(brand, terms);
      const categoryMatches = countTokenMatches(category, terms);
      const specMatches = countTokenMatches(specs, terms);
      const descriptionMatches = countTokenMatches(description, terms);
      const strongMatches = countTokenMatchesAcross([name, brand, category, specs], terms);
      const requiredStrongMatches = terms.length <= 2 ? terms.length : terms.length - 1;
      const hasStrongEnoughMatch = terms.length === 0
        || strongMatches >= requiredStrongMatches
        || namePhrase
        || brandPhrase
        || categoryPhrase
        || specsPhrase
        || score >= 72;

      if (terms.length > 0) {
        score += nameMatches * 28;
        score += brandMatches * 24;
        score += categoryMatches * 14;
        score += specMatches * 12;
        score += descriptionMatches * (mode === 'related' ? 2 : 1);

        if (nameMatches > 0) matchedBy.push('название');
        if (brandMatches > 0) matchedBy.push('бренд');
        if (categoryMatches > 0) matchedBy.push('раздел');
        if (specMatches > 0) matchedBy.push('характеристики');

        if (mode === 'strict' && terms.length >= 2 && !hasStrongEnoughMatch) {
          score = 0;
        }
        if (mode === 'strict' && terms.length === 1 && strongMatches === 0 && descriptionMatches > 0) {
          score = 0;
        }
        if (mode === 'related' && strongMatches === 0 && nameMatches === 0 && brandMatches === 0 && categoryMatches === 0 && specMatches === 0) {
          score = 0;
        }
        if (mode === 'related' && score > 0) matchedBy.push('похожее');
      }

      if (score > 0 && categorySlug && product.categorySlug === categorySlug) score += 6;
      if (score > 0 && product.dataQuality.hasRealImage) score += 2;
      if (score > 0 && product.dataQuality.hasVerifiedSpecs) score += 2;

      return { product, score, matchedBy: Array.from(new Set(matchedBy)) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ru'));

  return {
    results: matches.slice(0, limit),
    total: matches.length,
    mode,
  };
}

export function searchProductsWithTotal({ query = '', categorySlug = '', limit = 60 }: ProductSearchInput): ProductSearchResponse {
  const strict = rankProducts({ query, categorySlug, limit, mode: 'strict' });
  if (strict.total > 0 || query.trim().length === 0) return strict;
  return rankProducts({ query, categorySlug, limit, mode: 'related' });
}
