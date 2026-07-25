import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogCollectionGrid, hasCatalogCollectionState } from '@/components/catalog/CatalogCollectionGrid';
import { getManufacturerGroupBySlug, getProductsByManufacturer } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = {
  params: Promise<{ manufacturer: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function groupHref(basePath: string, group: string): string {
  const params = new URLSearchParams({ group });
  return `${basePath}?${params.toString()}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { manufacturer: slug } = await params;
  const query = searchParams ? await searchParams : {};
  const manufacturer = getManufacturerGroupBySlug(slug);
  if (!manufacturer) return {};
  return buildMetadata({
    title: `${manufacturer.name} — каталог товаров в Саратове`,
    description: `${manufacturer.name}: ${manufacturer.productCount.toLocaleString('ru-RU')} товаров инженерной сантехники. Артикулы, характеристики и цены в каталоге «Сантехникъ».`,
    path: `/catalog/proizvoditeli/${slug}`,
    noindex: hasCatalogCollectionState(query),
    followWhenNoindex: true,
  });
}

export default async function ManufacturerPage({ params, searchParams }: PageProps) {
  const { manufacturer: slug } = await params;
  const query = searchParams ? await searchParams : {};
  const manufacturer = getManufacturerGroupBySlug(slug);
  if (!manufacturer) notFound();
  const basePath = `/catalog/proizvoditeli/${slug}`;

  return (
    <>
      <div className="container breadcrumbs">
        <Link href="/catalog">Каталог</Link> / <Link href="/catalog/proizvoditeli">Производители</Link> / {manufacturer.name}
      </div>
      <section className="hero">
        <div className="container">
          <h1>{manufacturer.name}</h1>
          <p className="lead">{manufacturer.productCount.toLocaleString('ru-RU')} товаров в покупательских разделах каталога.</p>
          <ul className="badges">
            {manufacturer.sections.slice(0, 10).map((section) => (
              <li className="badge" key={section}><Link href={groupHref(basePath, section)}>{section}</Link></li>
            ))}
          </ul>
        </div>
      </section>
      <CatalogCollectionGrid
        products={getProductsByManufacturer(slug)}
        basePath={basePath}
        query={query}
        title={`Товары ${manufacturer.name}`}
        hideBrandFilter
      />
    </>
  );
}
