import { notFound, permanentRedirect } from 'next/navigation';
import { getLegacyCatalogRedirect } from '@/lib/seo/legacy-redirects';

type PageProps = {
  params: Promise<{ category: string; sku: string; group: string }>;
};

export default async function LegacyCatalogGroupPage({ params }: PageProps) {
  const { category, sku, group } = await params;
  const destination = getLegacyCatalogRedirect([category, sku, group]);
  if (destination) permanentRedirect(destination);
  notFound();
}
