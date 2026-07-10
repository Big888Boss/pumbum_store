import type { Metadata } from 'next';
import { canonical } from '@/lib/seo/canonical';
import { siteConfig } from '@/lib/seo/config';

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  images?: string[];
  noindex?: boolean;
};

export function buildMetadata({ title, description, path, images = [], noindex = false }: SeoMetadataInput): Metadata {
  const url = canonical(path);
  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
    other: {
      'geo.region': 'RU-SAR',
      'geo.placename': 'Саратов',
      'geo.position': '51.54513;46.020494',
      ICBM: '51.54513, 46.020494',
    },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
