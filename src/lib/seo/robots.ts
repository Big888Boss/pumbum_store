import { siteConfig } from '@/lib/seo/config';

export function isProductionIndexingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SITE_ENV === 'production';
}

export function getRobotsPolicy() {
  const allowIndexing = isProductionIndexingEnabled();
  return {
    rules: allowIndexing ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: `${siteConfig.siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
