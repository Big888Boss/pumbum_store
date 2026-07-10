import { NextResponse } from 'next/server';
import { getAllCategories, getAllProducts, getPublishedProducts } from '@/lib/catalog/loaders';

export const dynamic = 'force-dynamic';

export function GET() {
  const products = getAllProducts();
  const publishedProducts = getPublishedProducts();
  const categories = getAllCategories();

  return NextResponse.json({
    status: 'ok',
    service: 'pumbum-store-v2',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    catalog: {
      products: products.length,
      publishedProducts: publishedProducts.length,
      categories: categories.length,
    },
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV || 'unknown',
      siteEnv: process.env.NEXT_PUBLIC_SITE_ENV || 'staging',
    },
  });
}
