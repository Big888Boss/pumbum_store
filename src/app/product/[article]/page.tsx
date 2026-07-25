import { notFound, permanentRedirect } from 'next/navigation';
import { getLegacyArticleRedirect } from '@/lib/seo/legacy-redirects';

type PageProps = { params: Promise<{ article: string }> };

export default async function LegacyProductPage({ params }: PageProps) {
  const { article } = await params;
  const destination = getLegacyArticleRedirect(article);
  if (destination) permanentRedirect(destination);
  notFound();
}
