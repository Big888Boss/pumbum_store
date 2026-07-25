import { NextResponse } from 'next/server';
import catalogHealth from '../../../../content/generated/catalog-health.json';
import { purposeCategories } from '@/lib/catalog/purpose';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'pumbum-store-v2',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    catalog: {
      products: catalogHealth.products,
      publishedProducts: catalogHealth.publishedProducts,
      categories: purposeCategories.length,
    },
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV || 'unknown',
      siteEnv: process.env.NEXT_PUBLIC_SITE_ENV || 'staging',
    },
  });
}
