import { getAllRouteEntries } from '@/lib/catalog/route-map';
import { absoluteUrl } from '@/lib/seo/config';

export function getSitemapEntries() {
  const now = new Date();
  return getAllRouteEntries().map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
