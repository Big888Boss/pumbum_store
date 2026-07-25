import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogCollectionGrid } from '@/components/catalog/CatalogCollectionGrid';
import { StaticImage } from '@/components/media/StaticImage';
import { getManufacturerGroupBySlug, getProductsByManufacturer } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = {
  params: Promise<{ manufacturer: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePage(query: Record<string, string | string[] | undefined>): number {
  const raw = query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
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
    noindex: parsePage(query) > 1,
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
          <div className="eyebrow">Производитель</div>
          {manufacturer.logo ? <StaticImage src={manufacturer.logo} alt={`Логотип ${manufacturer.name}`} width={180} height={72} /> : null}
          <h1>{manufacturer.name}</h1>
          <p className="lead">{manufacturer.productCount.toLocaleString('ru-RU')} товаров в покупательских разделах каталога.</p>
          <ul className="badges">
            {manufacturer.sections.slice(0, 10).map((section) => <li className="badge" key={section}>{section}</li>)}
          </ul>
        </div>
      </section>
      <CatalogCollectionGrid
        products={getProductsByManufacturer(slug)}
        basePath={basePath}
        requestedPage={parsePage(query)}
        title={`Товары ${manufacturer.name}`}
      />
    </>
  );
}
