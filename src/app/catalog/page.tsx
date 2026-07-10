import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import { getAllCategories, getCategoryShowcaseBySlug, getProductsByCategory } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Каталог — категории инженерной сантехники',
  description: 'Каталог инженерной сантехники по назначению: отопление, водоснабжение, канализация, трубы, арматура и комплектующие.',
  path: '/catalog',
});

function formatPositions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'позиция' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'позиции' : 'позиций';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

export default function CatalogPage() {
  const categories = getAllCategories();

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Каталог</div>
          <h1>Каталог товаров по назначению</h1>
          <p className="lead">Подберите комплектующие для водоснабжения и отопления: по назначению, совместимости и условиям монтажа.</p>
          <div className="actions">
            <Link className="btn btn-secondary" href="/catalog/proizvoditeli">Открыть каталог по производителям</Link>
          </div>
          <form className="search-panel search-panel-compact" action="/search">
            <input name="q" type="search" placeholder="Поиск по артикулу, бренду или параметру" />
            <button className="btn btn-primary" type="submit">Найти</button>
          </form>
        </div>
      </section>
      <section className="section">
        <div className="container grid grid-3">
          {categories.map((category) => {
            const showcase = getCategoryShowcaseBySlug(category.slug);
            const productCount = getProductsByCategory(category.slug).length;
            return (
            <Link key={category.slug} className="card category-card" href={`/catalog/${category.slug}`}>
              {showcase ? <ProductImage src={showcase.image} alt={showcase.alt} /> : null}
              <div>
                <h2>{category.name}</h2>
                <p>{category.seoText}</p>
                <ul className="badges">
                  <li className="badge">{formatPositions(productCount)}</li>
                </ul>
              </div>
            </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
