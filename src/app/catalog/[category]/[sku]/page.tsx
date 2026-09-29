import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { MetrikaGoalLink, MetrikaProductView } from '@/components/analytics/MetrikaEvents';
import { ProductAvailabilityBadge } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import { JsonLd } from '@/components/seo/JsonLd';
import { getCategoryBySlug, getProductBySlug, getProductByUniqueSlug, getRelatedProductsForProduct } from '@/lib/catalog/loaders';
import { getProductAvailabilityPresentation } from '@/lib/catalog/availability';
import { canPublishProductInSitemap } from '@/lib/catalog/quality';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { formatSpecLabel, getProductDistinctionFacts, getProductKeyFacts } from '@/lib/catalog/specs';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { getLegacyCatalogRedirect } from '@/lib/seo/legacy-redirects';
import { getProductCardDescription, getProductDisplayTitle, getProductLocalSummary, getProductSeoDescription, getProductSeoTitle, getProductVisibleDescription, getProductVisibleText } from '@/lib/seo/product';
import { getCspNonce } from '@/lib/security/nonce';
import { METRIKA_GOALS } from '@/lib/analytics/metrika';

type PageProps = { params: Promise<{ category: string; sku: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, sku } = await params;
  const product = getProductBySlug(category, sku);
  if (!product) return {};
  return buildMetadata({
    title: getProductSeoTitle(product),
    description: getProductSeoDescription(product),
    path: `/catalog/${product.categorySlug}/${product.slug}`,
    images: [product.image],
    noindex: !canPublishProductInSitemap(product),
    followWhenNoindex: true,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const nonce = await getCspNonce();
  const { category, sku } = await params;
  const product = getProductBySlug(category, sku);
  if (!product) {
    const movedProduct = getProductByUniqueSlug(sku);
    if (movedProduct) permanentRedirect(`/catalog/${movedProduct.categorySlug}/${movedProduct.slug}`);
    const legacyDestination = getLegacyCatalogRedirect([category, sku]);
    if (legacyDestination) permanentRedirect(legacyDestination);
    notFound();
  }
  const categoryData = getCategoryBySlug(product.categorySlug);
  if (!categoryData) notFound();
  const related = getRelatedProductsForProduct(product);
  const requestHref = `/contacts?category=${encodeURIComponent(product.categorySlug)}&sku=${encodeURIComponent(product.slug)}`;
  const priceLabel = formatProductPrice(product);
  const availabilityPresentation = getProductAvailabilityPresentation(product);
  const productGoalParams = {
    sku: product.sku ?? product.vendorCode ?? product.slug,
    category: product.categorySlug,
    brand: product.brandName,
    availability: product.availability,
    price_status: product.price ? 'known' : 'request',
  };
  const distinctionFacts = getProductDistinctionFacts(product, 5);
  const displayTitle = getProductDisplayTitle(product);
  const localSummary = getProductLocalSummary(product);
  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: categoryData.name, path: `/catalog/${categoryData.slug}` },
    { name: product.name, path: `/catalog/${product.categorySlug}/${product.slug}` },
  ];
  const jsonLd = [breadcrumbJsonLd(breadcrumbs), productJsonLd(product)];

  return (
    <>
      <JsonLd data={jsonLd} nonce={nonce} />
      <MetrikaProductView goalParams={productGoalParams} />
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / <Link href={`/catalog/${product.categorySlug}`}>{categoryData.name}</Link> / {product.name}</div>
      <section className="hero">
        <div className="container pdp-grid">
          <div className="pdp-visual-card">
            <ProductImage src={product.image} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} priority />
            <dl className="pdp-visual-meta">
              <div>
                <dt>Категория</dt>
                <dd>{categoryData.name}</dd>
              </div>
              <div>
                <dt>Артикул</dt>
                <dd>{product.sku || product.vendorCode || 'уточняется'}</dd>
              </div>
              <div>
                <dt>Получение</dt>
                <dd>{availabilityPresentation?.label || 'уточняется'}</dd>
              </div>
            </dl>
          </div>
          <div className="pdp-main">
            <div className="eyebrow">{product.brandName} · инженерная комплектация</div>
            <h1>{displayTitle}</h1>
            <p className="lead">{localSummary}</p>
            {distinctionFacts.length > 0 ? (
              <p className="product-difference-line">Отличия позиции: {distinctionFacts.join(' · ')}.</p>
            ) : null}
            <ul className="badges">
              {getProductKeyFacts(product, 5).map((item) => <li className="badge" key={item}>{item}</li>)}
              <ProductAvailabilityBadge product={product} />
            </ul>
            <div className="price-panel">
              <span>Цена</span>
              <strong>{priceLabel}</strong>
              <p className={product.availability === 'preorder' ? 'availability-line availability-preorder' : 'availability-line'}>
                {product.availability === 'preorder' && availabilityPresentation ? (
                  <><span>{availabilityPresentation.label}</span> {availabilityPresentation.note}</>
                ) : (
                  'Перед покупкой подтвердим актуальную цену и возможность отгрузки.'
                )}
              </p>
            </div>
            <div className="actions">
              <MetrikaGoalLink
                className="btn btn-primary"
                href={requestHref}
                goal={METRIKA_GOALS.orderClick}
                goalParams={{ ...productGoalParams, location: 'product_primary' }}
              >
                {product.price ? 'Уточнить по товару' : 'Запросить цену'}
              </MetrikaGoalLink>
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
            <p>{getProductVisibleDescription(product)}</p>
            <h3>Почему удобно заказать здесь</h3>
            <ul>{product.sellingPoints
              .map((point) => ({ source: point, visible: getProductVisibleText(product, point) }))
              .filter(({ visible }) => visible.length > 0)
              .map(({ source, visible }) => <li key={source}>{visible}</li>)}</ul>
          </article>
          <aside className="card">
            <h2>Параметры</h2>
            <table className="specs"><tbody>{Object.entries(product.specs)
              .filter(([key]) => key !== 'Статус поставки')
              .map(([key, value]) => <tr key={key}><th>{formatSpecLabel(key)}</th><td>{value}</td></tr>)}</tbody></table>
          </aside>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="cta-panel pdp-contact-panel">
            <h2>Связаться с магазином</h2>
            <p>Проверим параметры, подскажем совместимые позиции и подтвердим возможность отгрузки по телефону или email.</p>
            <MetrikaGoalLink
              className="btn"
              href={requestHref}
              goal={METRIKA_GOALS.orderClick}
              goalParams={{ ...productGoalParams, location: 'product_contact_panel' }}
            >
              Уточнить по товару
            </MetrikaGoalLink>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>С этим товаром смотрят</h2><p>{product.crossSell.join(' · ')}</p></div>
          <div className="grid grid-3">
            {related.map((item) => (
              <Link key={item.slug} className="card" href={`/catalog/${item.categorySlug}/${item.slug}`}>
                <h3>{item.name}</h3>
                <p>{getProductCardDescription(item)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
