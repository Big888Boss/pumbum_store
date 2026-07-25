import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogCollectionGrid, hasCatalogCollectionState } from '@/components/catalog/CatalogCollectionGrid';
import { getCatalogSubcategory, getCategoryBySlug, getProductsByCatalogSubcategory } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const query = searchParams ? await searchParams : {};
  const definition = getCatalogSubcategory(category, subcategory);
  if (!definition) return {};
  return buildMetadata({
    title: definition.title,
    description: definition.description,
    path: `/catalog/${category}/podrazdel/${subcategory}`,
    noindex: hasCatalogCollectionState(query),
    followWhenNoindex: true,
  });
}

export default async function CatalogSubcategoryPage({ params, searchParams }: PageProps) {
  const { category, subcategory } = await params;
  const query = searchParams ? await searchParams : {};
  const categoryData = getCategoryBySlug(category);
  const definition = getCatalogSubcategory(category, subcategory);
  if (!categoryData || !definition) notFound();
  const products = getProductsByCatalogSubcategory(category, subcategory);
  const basePath = `/catalog/${category}/podrazdel/${subcategory}`;

  return (
    <>
      <div className="container breadcrumbs">
        <Link href="/catalog">Каталог</Link> / <Link href={`/catalog/${category}`}>{categoryData.name}</Link> / {definition.name}
      </div>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">{categoryData.name}</div>
          <h1>{definition.name}</h1>
          <p className="lead">{definition.intro}</p>
          <div className="actions">
            <Link className="btn btn-primary" href="/contacts">Помочь с подбором</Link>
            <Link className="btn btn-secondary" href={`/catalog/${category}`}>Весь раздел</Link>
          </div>
        </div>
      </section>
      <CatalogCollectionGrid products={products} basePath={basePath} query={query} />
      <section className="section section-tight">
        <div className="container">
          <article className="card info-card">
            <h2>Как выбрать</h2>
            <p>{definition.selectionGuide}</p>
            <p className="meta">Совместимость конкретных артикулов, цену и срок поставки подтвердит менеджер до заказа.</p>
          </article>
        </div>
      </section>
    </>
  );
}
