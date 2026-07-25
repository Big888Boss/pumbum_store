import { getAllCategories, getAllProducts, getCategoryBySlug, getFeaturedProductByCategory, getProductBySlug as getLoadedProductBySlug, getRelatedProducts as getLoadedRelatedProducts } from '@/lib/catalog/loaders';
import type { Product } from '@/entities/product/model';

export type BrandId = Product['brand'];

export type CatalogProduct = Product & {
  category: string;
  categoryName: string;
  categoryIntro: string;
  categorySeo: string;
  source: 'supplier-catalog';
  fullDescription: string;
  imagePrompt: string;
};

function toCompatProduct(product: Product): CatalogProduct {
  const category = getCategoryBySlug(product.categorySlug);
  return {
    ...product,
    category: product.categorySlug,
    categoryName: category?.name ?? product.categorySlug,
    categoryIntro: category?.intro ?? '',
    categorySeo: category?.seoText ?? '',
    source: 'supplier-catalog',
    fullDescription: product.description,
    imagePrompt: '',
  };
}

export const v2PilotProducts: CatalogProduct[] = getAllProducts().map(toCompatProduct);

export const categories = getAllCategories();

export function getProductByCategory(category: string) {
  const product = getFeaturedProductByCategory(category);
  return product ? toCompatProduct(product) : undefined;
}

export function getProductBySlug(category: string, slug: string) {
  const product = getLoadedProductBySlug(category, slug);
  return product ? toCompatProduct(product) : undefined;
}

export function getRelatedProducts(category: string) {
  return getLoadedRelatedProducts(category).map(toCompatProduct);
}
