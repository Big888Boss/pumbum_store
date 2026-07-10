import { getPublishedCategories, getPublishedProducts } from '@/lib/catalog/loaders';

export type RouteEntry = {
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
};

export function getStaticRouteEntries(): RouteEntry[] {
  return [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/catalog', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/catalog/proizvoditeli', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/delivery', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contacts', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  ];
}

export function getCatalogRouteEntries(): RouteEntry[] {
  const categoryRoutes = getPublishedCategories().map((category) => ({
    path: `/catalog/${category.slug}`,
    priority: 0.8,
    changeFrequency: 'weekly' as const,
  }));
  const productRoutes = getPublishedProducts().map((product) => ({
    path: `/catalog/${product.categorySlug}/${product.slug}`,
    priority: 0.75,
    changeFrequency: 'weekly' as const,
  }));
  return [...categoryRoutes, ...productRoutes];
}

export function getAllRouteEntries(): RouteEntry[] {
  return [...getStaticRouteEntries(), ...getCatalogRouteEntries()];
}
