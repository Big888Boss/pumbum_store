import { getAllRouteEntries } from '@/lib/catalog/route-map';
import { absoluteUrl } from '@/lib/seo/config';

export function getSitemapEntries() {
  return getAllRouteEntries().map((entry) => ({
    url: absoluteUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
