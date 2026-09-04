import { siteConfig } from '@/lib/seo/config';

const canonicalProductionUrl = 'https://477477.ru';

export function isProductionIndexingEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_SITE_ENV === 'production'
    && siteConfig.siteUrl.replace(/\/$/, '') === canonicalProductionUrl
  );
}

export function getRobotsPolicy() {
  const allowIndexing = isProductionIndexingEnabled();
  return {
    rules: allowIndexing ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: `${siteConfig.siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
