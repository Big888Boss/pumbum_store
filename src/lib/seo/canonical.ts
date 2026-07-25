import { absoluteUrl } from '@/lib/seo/config';

export function canonical(path: string): string {
  return absoluteUrl(path);
}
