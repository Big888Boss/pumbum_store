import companyProfile from '../../../content/company/profile.json';
import legacyCatalog from '../../../content/generated/legacy-catalog.json';
import type { Category } from '@/entities/category/model';
import type { CompanyProfile } from '@/entities/company/model';
import type { Product } from '@/entities/product/model';
import {
  getBuyerGroupLabel,
  getBuyerSubcategoriesByCategory,
  getBuyerSubcategoryBySlug,
  getBuyerSubcategoryForProduct,
  getBuyerSubcategoryProducts,
  type BuyerSubcategory,
} from '@/lib/catalog/buyer-subcategories';
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
  kanalizaciya: ['sistemy-naruzhnoy-kanalizacii-20015'],
  filtraciya: ['valtec-vt-389-n-06'],
  nasosy: ['aquario-7435'],
  'smesiteli-i-sifony': ['tim-bas0802s', 'tim-bas0260b-a', 'tim-c-l50-02bk'],
  'otoplenie-i-kotelnaya': ['zota-zota-zuma'],
  'krepezh-dlya-montazha': ['sistemy-naruzhnoy-kanalizacii-km038-r'],
  'truby-i-fitingi': ['valtec-vti-900-304-1208'],
  'armatura-i-komplektuyuschie': ['valtec-vt-214-n-04'],
  'prochee-oborudovanie': [
    'valtec-vt-1550-ucz-220-2',
    'valtec-vtm-396-0',
    'valtec-vtp-799-e-020040',
  ],
};

const carouselImageOverrides: Record<string, string> = {
  'tim-bas0802s': '/images/carousel-products/tim-bas0802s.png',
  'tim-bas0260b-a': '/images/carousel-products/tim-bas0260ba.png',
  'tim-c-l50-02bk': '/images/carousel-products/tim-cl5002bk.png',
  'cimm-cm-afesb-050': '/images/carousel-products/CM.AFESB.050_0-clean.webp',
};

const categoryFeaturedSubcategoryOrder: Record<string, string[]> = {
  vodosnabzhenie: ['emkosti-dlya-vody', 'gidroakkumulyatory', 'zashchita-ot-protechek'],
  kanalizaciya: ['naruzhnaya-kanalizaciya', 'vnutrennyaya-kanalizaciya', 'trapy-i-dushevye-lotki'],
  filtraciya: ['promyvnye-filtry', 'mehanicheskie-filtry', 'gryazeotdeliteli'],
  nasosy: ['skvazhinnye-nasosy', 'nasosnye-stancii', 'cirkulyacionnye-nasosy'],
  'smesiteli-i-sifony': ['sifony', 'slivy-i-obvyazki', 'dushevye-komplektuyushchie'],
  'otoplenie-i-kotelnaya': ['kotly', 'kollektory', 'radiatornaya-armatura'],
  'krepezh-dlya-montazha': ['homuty', 'montazhnye-profili', 'klipsy-i-krepleniya'],
  'truby-i-fitingi': ['nerzhaveyushchaya-stal', 'polipropilen', 'pex-i-metallopolimer'],
  'armatura-i-komplektuyuschie': ['sharovye-krany', 'reguliruyushchaya-armatura', 'armatura-bezopasnosti'],
  'prochee-oborudovanie': ['press-instrument', 'rezka-i-podgotovka-trub', 'svarochnyy-instrument', 'uplotniteli-i-rashodniki'],
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

function hasCarouselQualityImage(product: Product): boolean {
  if (!hasDisplayableProductImage(product)) return false;
  const image = carouselImageOverrides[product.slug] ?? product.image;
  return (
    image.includes('/images/products/_normalized-v2/')
    || image.includes('/images/category-showcase/')
    || image.includes('/images/carousel-products/')
  );
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

function compareCatalogDefaultOrder(a: Product, b: Product): number {
  return (
    getCategoryProductPriority(b) - getCategoryProductPriority(a)
    || a.name.localeCompare(b.name, 'ru')
    || a.slug.localeCompare(b.slug, 'ru')
  );
}

export function sortProductsByCatalogPriority(products: Product[]): Product[] {
  return [...products].sort(compareCatalogDefaultOrder);
}

for (const products of productsByCategory.values()) {
  products.sort(compareCatalogDefaultOrder);
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
    const items = sortProductsByCatalogPriority(allProducts.filter((product) => (
      inferSupplierSlug(product) === supplier.slug
      || productHasLegacySource(product, supplier.sources)
    )));
    const sections = [...new Set(items.map(getBuyerGroupLabel).filter(Boolean) as string[])]
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

export function getManufacturerGroupBySlug(slug: string): ManufacturerGroup | undefined {
  return getManufacturerGroups().find((manufacturer) => manufacturer.slug === slug);
}

export function getProductsByManufacturer(slug: string): Product[] {
  const supplier = supplierSourceGroups.find((item) => item.slug === slug);
  if (!supplier) return [];
  return sortProductsByCatalogPriority(allProducts.filter((product) => (
    inferSupplierSlug(product) === supplier.slug
    || productHasLegacySource(product, supplier.sources)
  )));
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return productsByCategory.get(categorySlug) ?? [];
}

export function getCatalogSubcategories(categorySlug: string): Array<BuyerSubcategory & { productCount: number }> {
  const products = getProductsByCategory(categorySlug);
  return getBuyerSubcategoriesByCategory(categorySlug)
    .map((definition) => ({
      ...definition,
      productCount: getBuyerSubcategoryProducts(products, definition).length,
    }))
    .filter((definition) => definition.productCount > 0);
}

export function getCatalogSubcategory(categorySlug: string, subcategorySlug: string): BuyerSubcategory | undefined {
  const definition = getBuyerSubcategoryBySlug(categorySlug, subcategorySlug);
  if (!definition) return undefined;
  return getBuyerSubcategoryProducts(getProductsByCategory(categorySlug), definition).length > 0
    ? definition
    : undefined;
}

export function getProductsByCatalogSubcategory(categorySlug: string, subcategorySlug: string): Product[] {
  const definition = getCatalogSubcategory(categorySlug, subcategorySlug);
  return definition
    ? getBuyerSubcategoryProducts(getProductsByCategory(categorySlug), definition)
    : [];
}

export function getFeaturedProductByCategory(categorySlug: string): Product | undefined {
  return getFeaturedProductsByCategory(categorySlug, 1)[0];
}

export function getFeaturedProductsByCategory(categorySlug: string, limit = 3): Product[] {
  const products = getProductsByCategory(categorySlug);
  const featured: Product[] = [];
  const selectedGroups = new Set<string>();
  const selectedProducts = new Set<string>();

  const addProduct = (product: Product | undefined) => {
    if (!product || selectedProducts.has(product.slug) || !hasCarouselQualityImage(product)) return;
    const group = getBuyerSubcategoryForProduct(product);
    if (!group || selectedGroups.has(group.slug)) return;
    featured.push(carouselImageOverrides[product.slug]
      ? { ...product, image: carouselImageOverrides[product.slug] }
      : product);
    selectedProducts.add(product.slug);
    selectedGroups.add(group.slug);
  };

  for (const preferredSlug of categoryFeaturedProductOverrides[categorySlug] ?? []) {
    addProduct(products.find((product) => product.slug === preferredSlug));
  }
  for (const subcategorySlug of categoryFeaturedSubcategoryOrder[categorySlug] ?? []) {
    if (featured.length >= limit) break;
    const definition = getBuyerSubcategoryBySlug(categorySlug, subcategorySlug);
    if (!definition || selectedGroups.has(definition.slug)) continue;
    addProduct(getBuyerSubcategoryProducts(products, definition).find(hasCarouselQualityImage));
  }
  for (const product of products) {
    if (featured.length >= limit) break;
    addProduct(product);
  }
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
  const relatedCategoryOrder: Record<string, string[]> = {
    vodosnabzhenie: ['nasosy', 'filtraciya', 'armatura-i-komplektuyuschie'],
    kanalizaciya: ['truby-i-fitingi', 'krepezh-dlya-montazha', 'nasosy'],
    filtraciya: ['armatura-i-komplektuyuschie', 'vodosnabzhenie', 'truby-i-fitingi'],
    nasosy: ['vodosnabzhenie', 'armatura-i-komplektuyuschie', 'truby-i-fitingi'],
    'smesiteli-i-sifony': ['armatura-i-komplektuyuschie', 'truby-i-fitingi', 'kanalizaciya'],
    'otoplenie-i-kotelnaya': ['armatura-i-komplektuyuschie', 'truby-i-fitingi', 'nasosy'],
    'krepezh-dlya-montazha': ['truby-i-fitingi', 'prochee-oborudovanie', 'armatura-i-komplektuyuschie'],
    'truby-i-fitingi': ['armatura-i-komplektuyuschie', 'krepezh-dlya-montazha', 'prochee-oborudovanie'],
    'armatura-i-komplektuyuschie': ['truby-i-fitingi', 'prochee-oborudovanie', 'krepezh-dlya-montazha'],
    'prochee-oborudovanie': ['truby-i-fitingi', 'krepezh-dlya-montazha', 'armatura-i-komplektuyuschie'],
  };
  const sameCategory = getProductsByCategory(product.categorySlug)
    .filter((candidate) => (
      candidate.slug !== product.slug
      && getBuyerGroupLabel(candidate) !== getBuyerGroupLabel(product)
      && hasDisplayableProductImage(candidate)
    ));
  const candidates = [
    ...sameCategory,
    ...(relatedCategoryOrder[product.categorySlug] ?? [])
      .flatMap((categorySlug) => getFeaturedProductsByCategory(categorySlug, 1)),
  ];
  return candidates
    .filter((candidate, index) => candidates.findIndex((item) => (
      item.categorySlug === candidate.categorySlug && item.slug === candidate.slug
    )) === index)
    .slice(0, limit);
}

export function getPublishedCategories(): Category[] {
  return getAllCategories().filter((category) => getProductsByCategory(category.slug).some((product) => product.dataQuality.publishInSitemap));
}

export function getPublishedProducts(): Product[] {
  return allProducts.filter((product) => product.dataQuality.publishInSitemap);
}
