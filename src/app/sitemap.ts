import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/lib/seo/sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapEntries();
}
