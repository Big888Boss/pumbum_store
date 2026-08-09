import productImageManifest from '../../../content/generated/product-image-manifest.json';
import transparentImageOverrides from '../../../content/generated/product-transparent-image-overrides.json';
import type { Product } from '@/entities/product/model';

type ProductImageStatus = 'ready' | 'family-image' | 'missing' | 'fallback' | 'source-error' | 'unsupported';

type ProductImageManifestEntry = {
  status?: ProductImageStatus;
  image?: {
    card?: string;
    detail?: string;
  };
  notes?: string[];
};

type ProductImageManifest = {
  products?: Record<string, ProductImageManifestEntry>;
};

const manifest = productImageManifest as ProductImageManifest;
const transparencyOverrides = transparentImageOverrides as Record<string, { card?: string; detail?: string }>;
const usableStatuses = new Set<ProductImageStatus>(['ready', 'family-image']);
const presentationImageOverrides: Record<string, string> = {
  '/images/products/_normalized-v2/valtec/vti.900.304.1208-83e0e2cec79f7608-detail.webp': '/images/category-showcase/valtec-stainless-pipe-detail.webp',
  '/images/products/_normalized-v2/valtec/vti.900.304.1208-83e0e2cec79f7608-card.webp': '/images/category-showcase/valtec-stainless-pipe-card.webp',
  '/images/products/_normalized-v2/sinikon/km038.r-f50943302c94da60-detail.webp': '/images/category-showcase/sinikon-clamp-km038-detail.webp',
  '/images/products/_normalized-v2/sinikon/km038.r-f50943302c94da60-card.webp': '/images/category-showcase/sinikon-clamp-km038-card.webp',
  '/images/products/_normalized-v2/sinikon/km100d.r-0a8f9cacaaf7bc21-detail.webp': '/images/category-showcase/sinikon-clamp-km100d-detail.webp',
  '/images/products/_normalized-v2/sinikon/km100d.r-0a8f9cacaaf7bc21-card.webp': '/images/category-showcase/sinikon-clamp-km100d-card.webp',
  '/images/products/_normalized-v2/sinikon/20005-f1697def6bf3c71a-detail.webp': '/images/category-showcase/sinikon-sewer-pipe-detail.webp',
  '/images/products/_normalized-v2/sinikon/20005-f1697def6bf3c71a-card.webp': '/images/category-showcase/sinikon-sewer-pipe-card.webp',
};
const sinikonLegacySources = new Set([
  'catalog/latunnye-aksialnye-fitingi.json',
  'catalog/naruzhnaya-kanalizaciya.json',
  'catalog/truby-pe-x-pe-rt.json',
  'catalog/vnutrennie-vodostoki.json',
  'catalog/vnutrennyaya-kanalizaciya.json',
]);

type ProductForImageKeys = Pick<Product, 'categorySlug' | 'slug' | 'sourceRefs' | 'brandName' | 'brand' | 'supplier' | 'supplierName' | 'name' | 'description' | 'shortDescription' | 'specs'>;

function getSupplierSlug(product: ProductForImageKeys): string | undefined {
  if (product.supplier && product.supplier !== 'generic') return product.supplier;
  const refs = product.sourceRefs ?? [];
  const supplierUrl = refs.find((ref) => ref.type === 'supplier')?.url ?? '';
  const labels = refs.map((ref) => ref.label ?? '').join(' ');
  const text = [
    supplierUrl,
    labels,
    product.brandName,
    product.brand,
    product.supplierName,
    product.supplier,
    product.name,
    product.description,
    product.shortDescription,
    product.specs?.['Бренд'],
    product.specs?.['Раздел'],
    product.specs?.['Подраздел'],
    product.specs?.['Группа'],
  ].join(' ').toLowerCase();
  const hasSinikonLegacySource = refs.some((ref) => sinikonLegacySources.has(ref.label ?? ''));

  if (text.includes('valtec')) return 'valtec';
  if (text.includes('aquario')) return 'aquario';
  if (text.includes('gidrokontrakt')) return 'gidrokontrakt';
  if (text.includes('vivaldo')) return 'vivaldo';
  if (text.includes('aq-plastic') || text.includes('aquatec') || text.includes('акватек')) return 'aquatec';
  if (text.includes('zota')) return 'zota';
  if (/\btim\b/.test(text) || text.includes('тим')) return 'tim';
  if (/\bespa\b/.test(text)) return 'espa';
  if (text.includes('sinikon') || text.includes('синикон') || hasSinikonLegacySource) return 'sinikon';
  return 'unknown';
}

function getLegacyCategorySlug(product: Pick<Product, 'sourceRefs'>): string | undefined {
  const refs = product.sourceRefs ?? [];
  const labels = refs.map((ref) => ref.label ?? '');
  for (const label of labels) {
    const match = label.match(/^catalog\/([^/]+)\.json$/);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function getProductImageManifestKeys(
  product: ProductForImageKeys,
): string[] {
  const keys = [`${product.categorySlug}/${product.slug}`];
  const legacyCategorySlug = getLegacyCategorySlug(product);
  if (legacyCategorySlug && legacyCategorySlug !== product.categorySlug) {
    keys.push(`${legacyCategorySlug}/${product.slug}`);
  }
  const supplierSlug = getSupplierSlug(product);
  if (supplierSlug) keys.push(`${supplierSlug}/${product.slug}`);
  return keys;
}

export function getProductImageManifestKey(product: Pick<Product, 'categorySlug' | 'slug'>): string {
  return `${product.categorySlug}/${product.slug}`;
}

// Некоторые нормализованные файлы названы кириллицей (артикулы вида «тп10025323»);
// без percent-кодирования такой путь ломает HTTP-заголовок Link (preload) — ByteString TypeError.
function toAsciiSafeImagePath(path: string): string {
  return /[^ -~]/.test(path) ? encodeURI(path) : path;
}

export function getProductImage(product: Product, variant: 'card' | 'detail' = 'detail'): string {
  const entry = getProductImageManifestKeys(product)
    .map((key) => manifest.products?.[key])
    .find((candidate) => candidate?.status && usableStatuses.has(candidate.status));
  const selectedImage = entry?.status && usableStatuses.has(entry.status)
    ? entry.image?.[variant] || entry.image?.detail || entry.image?.card || product.image
    : product.image;
  const presentedImage = presentationImageOverrides[selectedImage] ?? selectedImage;
  const transparentImage = transparencyOverrides[presentedImage]?.[variant] ?? presentedImage;
  return toAsciiSafeImagePath(transparentImage);
}

export function applyProductImageManifest(product: Product): Product {
  const image = getProductImage(product, 'detail');
  if (image === product.image) return product;

  return {
    ...product,
    image,
    dataQuality: {
      ...product.dataQuality,
      hasRealImage: true,
      notes: [...(product.dataQuality.notes ?? []), 'normalized-product-image'],
    },
  };
}
