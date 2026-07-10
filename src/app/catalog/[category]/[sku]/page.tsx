import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductImage } from '@/components/product/ProductImage';
import { getAllProducts, getCategoryBySlug, getProductBySlug, getRelatedProducts } from '@/lib/catalog/loaders';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { formatSpecLabel, getProductDistinctionFacts, getProductKeyFacts } from '@/lib/catalog/specs';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = { params: Promise<{ category: string; sku: string }> };

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ category: product.categorySlug, sku: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, sku } = await params;
  const product = getProductBySlug(category, sku);
  if (!product) return {};
  return buildMetadata({
    title: `${product.name}`,
    description: product.shortDescription,
    path: `/catalog/${product.categorySlug}/${product.slug}`,
    images: [product.image],
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { category, sku } = await params;
  const product = getProductBySlug(category, sku);
  if (!product) notFound();
  const categoryData = getCategoryBySlug(product.categorySlug);
  if (!categoryData) notFound();
  const related = getRelatedProducts(product.categorySlug);
  const requestHref = `/contacts?category=${encodeURIComponent(product.categorySlug)}&sku=${encodeURIComponent(product.slug)}`;
  const priceLabel = formatProductPrice(product);
  const distinctionFacts = getProductDistinctionFacts(product, 5);
  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: categoryData.name, path: `/catalog/${categoryData.slug}` },
    { name: product.name, path: `/catalog/${product.categorySlug}/${product.slug}` },
  ];
  const jsonLd = [breadcrumbJsonLd(breadcrumbs), productJsonLd(product)];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / <Link href={`/catalog/${product.categorySlug}`}>{categoryData.name}</Link> / {product.name}</div>
      <section className="hero">
        <div className="container pdp-grid">
          <ProductImage src={product.image} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} priority />
          <div>
            <div className="eyebrow">{product.brandName} · инженерная комплектация</div>
            <h1>{product.name}</h1>
            <p className="lead">{product.shortDescription}</p>
            {distinctionFacts.length > 0 ? (
              <p className="product-difference-line">Отличия позиции: {distinctionFacts.join(' · ')}.</p>
            ) : null}
            <ul className="badges">
              {getProductKeyFacts(product, 5).map((item) => <li className="badge" key={item}>{item}</li>)}
            </ul>
            <div className="price-panel">
              <span>Цена</span>
              <strong>{priceLabel}</strong>
              <p>Наличие, срок поставки и комплектность уточняются в магазине.</p>
            </div>
            <div className="actions">
              <Link className="btn btn-primary" href={requestHref}>{product.price ? 'Уточнить наличие' : 'Запросить цену'}</Link>
              <Link className="btn btn-secondary" href="/contacts">Контакты магазина</Link>
              <Link className="btn btn-secondary" href={`/catalog/${product.categorySlug}`}>Вернуться в категорию</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <article className="card">
            <h2>Описание и сценарий применения</h2>
            <p>{product.description}</p>
            <h3>Почему удобно заказать здесь</h3>
            <ul>{product.sellingPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          </article>
          <aside className="card">
            <h2>Параметры</h2>
            <table className="specs"><tbody>{Object.entries(product.specs).map(([key, value]) => <tr key={key}><th>{formatSpecLabel(key)}</th><td>{value}</td></tr>)}</tbody></table>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <div className="notice">
            <h2>Фото товара</h2>
            <p>Изображение помогает оценить форму, исполнение и общий вид позиции перед подбором комплекта.</p>
            <p className="meta">Менеджер проверит наличие, совместимость, сроки поставки и возможные аналоги.</p>
          </div>
          <div className="cta-panel">
            <h2>Связаться с магазином</h2>
            <p>Проверим параметры, подскажем совместимые позиции и актуальное наличие по телефону или email.</p>
            <Link className="btn" href={requestHref}>Уточнить по товару</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>С этим товаром смотрят</h2><p>{product.crossSell.join(' · ')}</p></div>
          <div className="grid grid-3">
            {related.map((item) => <Link key={item.categorySlug} className="card" href={`/catalog/${item.categorySlug}`}><h3>{item.name}</h3><p>{item.shortDescription}</p></Link>)}
          </div>
        </div>
      </section>
    </>
  );
}
