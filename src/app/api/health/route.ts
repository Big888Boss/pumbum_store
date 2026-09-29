import { NextResponse } from 'next/server';
import catalogHealth from '../../../../content/generated/catalog-health.json';
import { purposeCategories } from '@/lib/catalog/purpose';

export const dynamic = 'force-dynamic';

export function GET() {
  const body: Record<string, unknown> = {
    status: 'ok',
    service: 'pumbum-store-v2',
    timestamp: new Date().toISOString(),
    catalog: {
      products: catalogHealth.products,
      publishedProducts: catalogHealth.publishedProducts,
      categories: purposeCategories.length,
    },
    runtime: { siteEnv: process.env.NEXT_PUBLIC_SITE_ENV || 'staging' },
  };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
