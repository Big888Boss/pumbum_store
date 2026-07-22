import companyProfile from '../../../content/company/profile.json';
import legacyCatalog from '../../../content/generated/legacy-catalog.json';
import type { Category } from '@/entities/category/model';
import type { CompanyProfile } from '@/entities/company/model';
import type { Product } from '@/entities/product/model';
import { applyProductPricing } from '@/lib/catalog/pricing';
import { applyProductImageManifest } from '@/lib/catalog/product-images';
import { getCategoryProductPriority, normalizeProductCategory, purposeCategories } from '@/lib/catalog/purpose';

export type ManufacturerGroup = {
  slug: string;
  name: string;
  logo?: string;
  productCount: number;
  categoryCount: number;
  sections: string[];
  featuredProducts: Product[];
};

export type CategoryShowcase = {
  image: string;
  alt: string;
};

function asCategory(category: unknown): Category {
  return category as Category;
}

function asProduct(product: unknown): Product {
  return product as Product;
}

const sinikonLogo = '/images/brands/sinikon.svg';
const generatedProducts = ((legacyCatalog as { products?: unknown[] }).products ?? []).map(asProduct);
const allCategories = purposeCategories.map(asCategory);

function assertUniqueProducts(input: Product[]): Product[] {
  const seen = new Set<string>();
  for (const product of input) {
    const key = `${product.categorySlug}/${product.slug}`;
    if (seen.has(key)) throw new Error(`Duplicate normalized catalog route: ${key}`);
    seen.add(key);
  }
  return input;
}

const supplierSourceGroups = [
  {
    slug: 'sinikon',
    name: 'SINIKON',
    sources: [
      'catalog/latunnye-aksialnye-fitingi.json',
      'catalog/naruzhnaya-kanalizaciya.json',
      'catalog/truby-pe-x-pe-rt.json',
      'catalog/vnutrennie-vodostoki.json',
      'catalog/vnutrennyaya-kanalizaciya.json',
    ],
  },
  { slug: 'valtec', name: 'VALTEC', sources: ['valtec/catalog.json'] },
  { slug: 'gidrokontrakt', name: 'Гидроконтракт', sources: ['gidrokontrakt/catalog.json'] },
  { slug: 'aquario', name: 'AQUARIO', sources: ['aquario/catalog.json'] },
  { slug: 'vivaldo', name: 'VIVALDO', sources: ['vivaldo/catalog.json'] },
  { slug: 'aquatec', name: 'АКВАТЕК', sources: ['aquatec/catalog.json'] },
  { slug: 'zota', name: 'ZOTA', sources: ['zota/catalog.json'] },
  { slug: 'tim', name: 'TIM', sources: ['tim/catalog.json'] },
  { slug: 'espa', name: 'ESPA', sources: ['espa/catalog.json'] },
] as const;

type SupplierSlug = (typeof supplierSourceGroups)[number]['slug'];

const supplierLogoFallbacks: Record<SupplierSlug, string> = {
  valtec: '/brand-logos/valtec.svg',
  sinikon: sinikonLogo,
  aquario: '/brand-logos/aquario.svg',
  gidrokontrakt: '/brand-logos/gidrokontrakt.svg',
  aquatec: '/brand-logos/aquatec.svg',
  vivaldo: '/brand-logos/vivaldo.png',
  zota: '/brand-logos/zota.svg',
  tim: '/brand-logos/tim.jpg',
  espa: '/brand-logos/espa.png',
};

function sourceLabels(product: Product): string {
  return product.sourceRefs.map((source) => source.label).join(' ');
}

function hasLegacySource(product: Product, sources: readonly string[]): boolean {
  const labels = new Set(product.sourceRefs.map((source) => source.label));
  return sources.some((source) => labels.has(source));
}

function inferSupplierSlug(product: Product): SupplierSlug | undefined {
  if (product.supplier && product.supplier !== 'generic') return product.supplier as SupplierSlug;
  const sourceText = [
    sourceLabels(product),
    ...product.sourceRefs.map((source) => source.url ?? ''),
    product.brandName,
    product.name,
    product.supplierName,
    product.supplier,
    product.description,
    product.shortDescription,
    product.specs['Бренд'],
    product.specs['Раздел'],
    product.specs['Подраздел'],
    product.specs['Группа'],
  ].join(' ').toLowerCase();

  if (sourceText.includes('valtec')) return 'valtec';
  if (sourceText.includes('aquario')) return 'aquario';
  if (sourceText.includes('gidrokontrakt') || sourceText.includes('гидроконтракт')) return 'gidrokontrakt';
  if (sourceText.includes('vivaldo')) return 'vivaldo';
  if (sourceText.includes('aq-plastic') || sourceText.includes('aquatec') || sourceText.includes('акватек')) return 'aquatec';
  if (sourceText.includes('zota')) return 'zota';
  if (/\btim\b/.test(sourceText) || sourceText.includes('тим')) return 'tim';
  if (/\bespa\b/.test(sourceText)) return 'espa';
  if (
    sourceText.includes('sinikon')
    || sourceText.includes('синикон')
    || hasLegacySource(product, supplierSourceGroups[0].sources)
  ) {
    return 'sinikon';
  }

  return undefined;
}

function supplierDisplayName(supplier: SupplierSlug): string {
  if (supplier === 'sinikon') return 'SINIKON';
  if (supplier === 'aquatec') return 'АКВАТЕК';
  if (supplier === 'gidrokontrakt') return 'Гидроконтракт';
  if (supplier === 'aquario') return 'AQUARIO';
  if (supplier === 'valtec') return 'VALTEC';
  if (supplier === 'vivaldo') return 'VIVALDO';
  if (supplier === 'zota') return 'ZOTA';
  if (supplier === 'tim') return 'TIM';
  if (supplier === 'espa') return 'ESPA';
  return supplier;
}

const categoryFeaturedProductOverrides: Record<string, string[]> = {
  vodosnabzhenie: ['akvatek-atv-500'],
  kanalizaciya: ['sistemy-naruzhnoy-kanalizacii-504049-u'],
  filtraciya: ['tim-jh-1001'],
  nasosy: ['aquario-7435'],
  'smesiteli-i-sifony': ['tim-bas0802s'],
  'otoplenie-i-kotelnaya': [
    'zota-zota-zuma',
    'zota-zota-zota-solid-x',
    'zota-zota-zota-topol-vk',
  ],
  'krepezh-dlya-montazha': ['tim-zsr-2502-302002'],
  'truby-i-fitingi': ['tim-tpap-1620-100-stabil'],
  'armatura-i-komplektuyuschie': ['valtec-vt-214-n-04'],
  'prochee-oborudovanie': ['valtec-vt-1550-ucz-220-2'],
};

function hasDisplayableProductImage(product: Product): boolean {
  const image = product.image ?? '';
  if (!image) return false;
  if (!product.dataQuality.hasRealImage) return false;
  if (image.includes('/generated-placeholders/')) return false;
  if (image.includes('/brand-logos/')) return false;
  if (image.includes('/images/brands/')) return false;
  if (/fallback|placeholder|logo/i.test(image)) return false;
  return true;
}

function applyManualProductPresentationFixes(product: Product): Product {
  if (
    product.slug === 'sistemy-dlya-vnutrennih-vodostokov-t-01-110-600-3'
    || product.sku === 'T.01.110.600.3'
  ) {
    return {
      ...product,
      brandName: 'SINIKON',
      logo: sinikonLogo,
      hideBrandLogo: false,
    };
  }

  return product;
}

function applySupplierPresentationFixes(product: Product): Product {
  const supplier = inferSupplierSlug(product);
  if (!supplier) return product;

  const logo = supplier === 'tim'
    ? supplierLogoFallbacks.tim
    : product.logo || supplierLogoFallbacks[supplier] || undefined;
  const shouldReplaceBrandName = (
    !product.logo
    || product.hideBrandLogo
    || product.brandName === product.specs['Раздел']
    || product.brandName === product.specs['Подраздел']
    || product.brandName === product.specs['Группа']
    || supplier === 'sinikon'
    || supplier === 'aquatec'
    || supplier === 'tim'
  );

  return {
    ...product,
    brand: supplier,
    supplier,
    supplierName: supplierDisplayName(supplier),
    brandName: shouldReplaceBrandName ? supplierDisplayName(supplier) : product.brandName,
    logo,
    hideBrandLogo: !logo ? product.hideBrandLogo : false,
    specs: {
      ...product.specs,
      Бренд: shouldReplaceBrandName ? supplierDisplayName(supplier) : product.specs['Бренд'],
    },
  };
}

const allProducts = assertUniqueProducts(
  generatedProducts
    .map(applyProductPricing)
    .map(normalizeProductCategory)
    .map(applySupplierPresentationFixes)
    .map(applyManualProductPresentationFixes)
    .map(applyProductImageManifest),
);

function productHasLegacySource(product: Product, sources: readonly string[]): boolean {
  return product.sourceRefs.some((source) => sources.includes(source.label));
}

function getSupplierSection(product: Product): string | undefined {
  const rawSection = product.specs['Подраздел'] || product.specs['Группа'] || product.specs['Исходный раздел'];
  const section = rawSection?.split('/')[0]?.trim();
  if (!section || section === product.name) return undefined;
  return section;
}

const sortedCategories = [...allCategories].sort((a, b) => b.priority - a.priority);
const categoryBySlug = new Map(allCategories.map((category) => [category.slug, category]));
const productsByCategory = new Map<string, Product[]>();
const productsByUniqueSlug = new Map<string, Product | null>();

for (const product of allProducts) {
  const categoryProducts = productsByCategory.get(product.categorySlug);
  if (categoryProducts) categoryProducts.push(product);
  else productsByCategory.set(product.categorySlug, [product]);

  if (!productsByUniqueSlug.has(product.slug)) productsByUniqueSlug.set(product.slug, product);
  else productsByUniqueSlug.set(product.slug, null);
}

for (const products of productsByCategory.values()) {
  products.sort((a, b) => (
    getCategoryProductPriority(b) - getCategoryProductPriority(a)
    || a.name.localeCompare(b.name, 'ru')
    || a.slug.localeCompare(b.slug, 'ru')
  ));
}

export function getCompanyProfile(): CompanyProfile {
  return companyProfile as CompanyProfile;
}

export function getAllCategories(): Category[] {
  return sortedCategories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categoryBySlug.get(slug);
}

export function getAllProducts(): Product[] {
  return allProducts;
}

export function getManufacturerGroups(): ManufacturerGroup[] {
  return supplierSourceGroups.map((supplier) => {
    const items = allProducts.filter((product) => productHasLegacySource(product, supplier.sources));
    const sections = [...new Set(items.map(getSupplierSection).filter(Boolean) as string[])]
      .sort((a, b) => a.localeCompare(b, 'ru'));
    const logo = items.find((product) => product.logo)?.logo || supplierLogoFallbacks[supplier.slug];
    return {
      slug: supplier.slug,
      name: supplier.name,
      logo,
      productCount: items.length,
      categoryCount: sections.length,
      sections,
      featuredProducts: items.slice(0, 3),
    };
  }).filter((group) => group.productCount > 0);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return productsByCategory.get(categorySlug) ?? [];
}

export function getFeaturedProductByCategory(categorySlug: string): Product | undefined {
  return getFeaturedProductsByCategory(categorySlug, 1)[0];
}

export function getFeaturedProductsByCategory(categorySlug: string, limit = 3): Product[] {
  const products = getProductsByCategory(categorySlug);
  const featured: Product[] = [];
  for (const preferredSlug of categoryFeaturedProductOverrides[categorySlug] ?? []) {
    const preferred = products.find((product) => product.slug === preferredSlug && hasDisplayableProductImage(product));
    if (preferred) featured.push(preferred);
  }
  for (const product of products) {
    if (featured.length >= limit) break;
    if (!featured.includes(product) && hasDisplayableProductImage(product)) featured.push(product);
  }
  if (featured.length === 0 && products[0]) featured.push(products[0]);
  return featured.slice(0, limit);
}

export function getCategoryShowcaseBySlug(categorySlug: string): CategoryShowcase | undefined {
  const showcaseProduct = getFeaturedProductByCategory(categorySlug);
  if (!showcaseProduct) return undefined;

  return {
    image: showcaseProduct.image,
    alt: showcaseProduct.name,
  };
}

export function getProductBySlug(categorySlug: string, productSlug: string): Product | undefined {
  return getProductsByCategory(categorySlug).find((product) => product.slug === productSlug);
}

export function getProductByUniqueSlug(productSlug: string): Product | undefined {
  return productsByUniqueSlug.get(productSlug) ?? undefined;
}

export function getRelatedProducts(categorySlug: string, limit = 3): Product[] {
  return sortedCategories
    .filter((category) => category.slug !== categorySlug)
    .map((category) => getFeaturedProductByCategory(category.slug))
    .filter((product): product is Product => Boolean(product))
    .slice(0, limit);
}

export function getRelatedProductsForProduct(product: Product, limit = 3): Product[] {
  const series = product.specs['Подраздел'] || product.specs['Группа'];
  return getProductsByCategory(product.categorySlug)
    .filter((candidate) => (
      candidate.categorySlug === product.categorySlug
      && candidate.slug !== product.slug
    ))
    .sort((a, b) => {
      const aScore = Number(a.supplier === product.supplier) * 2
        + Number(Boolean(series) && (a.specs['Подраздел'] === series || a.specs['Группа'] === series));
      const bScore = Number(b.supplier === product.supplier) * 2
        + Number(Boolean(series) && (b.specs['Подраздел'] === series || b.specs['Группа'] === series));
      return bScore - aScore;
    })
    .slice(0, limit);
}

export function getPublishedCategories(): Category[] {
  return getAllCategories().filter((category) => getProductsByCategory(category.slug).some((product) => product.dataQuality.publishInSitemap));
}

export function getPublishedProducts(): Product[] {
  return allProducts.filter((product) => product.dataQuality.publishInSitemap);
}
