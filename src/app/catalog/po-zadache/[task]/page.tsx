import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogCollectionGrid } from '@/components/catalog/CatalogCollectionGrid';
import type { Product } from '@/entities/product/model';
import { getBuyerTaskBySlug } from '@/lib/catalog/buyer-tasks';
import { getCatalogSubcategory, getProductsByCatalogSubcategory } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = {
  params: Promise<{ task: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePage(query: Record<string, string | string[] | undefined>): number {
  const raw = query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function getTaskProducts(taskSlug: string): Product[] {
  const task = getBuyerTaskBySlug(taskSlug);
  if (!task) return [];
  const groups = task.subcategories.map(({ categorySlug, subcategorySlug }) => (
    getProductsByCatalogSubcategory(categorySlug, subcategorySlug)
  ));
  const products: Product[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const product = group[index];
      const key = product ? `${product.categorySlug}/${product.slug}` : '';
      if (product && !seen.has(key)) {
        products.push(product);
        seen.add(key);
      }
    }
  }
  return products;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { task: taskSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const task = getBuyerTaskBySlug(taskSlug);
  if (!task) return {};
  return buildMetadata({
    title: task.title,
    description: task.description,
    path: `/catalog/po-zadache/${task.slug}`,
    noindex: parsePage(query) > 1,
    followWhenNoindex: true,
  });
}

export default async function BuyerTaskPage({ params, searchParams }: PageProps) {
  const { task: taskSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const task = getBuyerTaskBySlug(taskSlug);
  if (!task) notFound();
  const basePath = `/catalog/po-zadache/${task.slug}`;

  return (
    <>
      <div className="container breadcrumbs">
        <Link href="/catalog">Каталог</Link> / <Link href="/catalog/po-zadache">По задаче</Link> / {task.name}
      </div>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Подбор по задаче</div>
          <h1>{task.name}</h1>
          <p className="lead">{task.intro}</p>
          <ul className="badges">
            {task.subcategories.map(({ categorySlug, subcategorySlug }) => {
              const group = getCatalogSubcategory(categorySlug, subcategorySlug);
              return group ? <li className="badge" key={`${categorySlug}/${subcategorySlug}`}>{group.name}</li> : null;
            })}
          </ul>
          <div className="actions">
            <Link className="btn btn-primary" href="/contacts">Помочь с подбором</Link>
            <Link className="btn btn-secondary" href="/catalog/po-zadache">Другие задачи</Link>
          </div>
        </div>
      </section>
      <CatalogCollectionGrid products={getTaskProducts(task.slug)} basePath={basePath} requestedPage={parsePage(query)} title="Подходящие группы товаров" />
      <section className="section section-tight">
        <div className="container">
          <article className="card info-card">
            <h2>Что нужно знать для подбора</h2>
            <ul>{task.guide.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="meta">Это навигационная подборка, а не обещание готовой совместимости. Конкретный комплект проверит менеджер.</p>
          </article>
        </div>
      </section>
    </>
  );
}
