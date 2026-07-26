import type { Metadata } from 'next';
import Link from 'next/link';
import { MetrikaSearchForm } from '@/components/analytics/MetrikaEvents';
import { PageMascot } from '@/components/layout/PageMascot';
import { ProductAvailabilityBadge } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import { getAllCategories, getAllProducts, getCategoryBySlug } from '@/lib/catalog/loaders';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getProductImage } from '@/lib/catalog/product-images';
import { searchProductsWithTotal } from '@/lib/catalog/search';
import { getProductKeyFacts } from '@/lib/catalog/specs';
import { buildMetadata } from '@/lib/seo/metadata';
import { getProductCardDescription } from '@/lib/seo/product';

type PageProps = { searchParams: Promise<{ q?: string; category?: string }> };

function cleanPreviewText(value: string): string {
  return value
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export const metadata: Metadata = buildMetadata({
  title: 'Поиск по каталогу — Сантехникъ',
  description: 'Поиск по артикулам, брендам и характеристикам инженерной сантехники.',
  path: '/search',
  noindex: true,
});

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? '').trim();
  const categorySlug = (params.category ?? '').trim();
  const categories = getAllCategories();
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
  const categorySearch = searchProductsWithTotal({ query, categorySlug, limit: 36 });
  const globalFallbackSearch = query.length > 0 && categorySlug.length > 0 && categorySearch.total === 0
    ? searchProductsWithTotal({ query, limit: 36 })
    : undefined;
  const showingGlobalFallback = Boolean(globalFallbackSearch && globalFallbackSearch.total > 0);
  const search = showingGlobalFallback && globalFallbackSearch ? globalFallbackSearch : categorySearch;
  const results = search.results;
  const hasSearch = query.length > 0 || categorySlug.length > 0;
  const totalProducts = getAllProducts().length;
  const resultScope = showingGlobalFallback ? ' по всему каталогу' : category ? ` в разделе ${category.name}` : '';
  const resultCountText = search.total === results.length
    ? `${search.total.toLocaleString('ru-RU')} совпадений${resultScope}.`
    : `Показаны первые ${results.length.toLocaleString('ru-RU')} из ${search.total.toLocaleString('ru-RU')} совпадений${resultScope}.`;
  const resultText = showingGlobalFallback && category
    ? `В разделе ${category.name} ничего не найдено. ${resultCountText}`
    : search.mode === 'related' && search.total > 0
      ? `Точных совпадений нет. ${resultCountText.replace('совпадений', 'близких совпадений')}`
      : resultCountText;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid hero-grid-mascot">
          <div>
            <div className="eyebrow">Поиск</div>
            <h1>Поиск по {totalProducts.toLocaleString('ru-RU')} позициям</h1>
            <p className="lead">Ищите по артикулу, бренду, названию, диаметру, серии или характеристике. Актуальную цену и возможность отгрузки подтвердит менеджер.</p>
            <MetrikaSearchForm className="search-panel" action="/search" location="search_page">
              <input name="q" type="search" placeholder="Например: V1620.040, AQUARIO, 32 мм" defaultValue={query} />
              <select name="category" defaultValue={categorySlug}>
                <option value="">Все разделы</option>
                {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
              <button className="btn btn-primary" type="submit">Найти</button>
            </MetrikaSearchForm>
          </div>
          <PageMascot
            src="/images/mascots/bak-hlopotun-search.webp"
            alt="Бак Хлопотун ищет товар с лупой"
            label="Бак Хлопотун помогает искать товары"
            variant="search"
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{hasSearch ? 'Результаты' : 'Начните поиск'}</h2>
              <p>{hasSearch ? resultText : 'Введите артикул или параметр, чтобы быстро найти позицию в полном каталоге.'}</p>
            </div>
            {hasSearch ? <Link className="btn btn-secondary" href="/search">Сбросить</Link> : null}
          </div>

          {hasSearch && results.length === 0 ? (
            <div className="notice">
              <h2>Ничего не найдено</h2>
              <p>Проверьте артикул или свяжитесь с магазином: подскажем аналог по параметрам.</p>
              <Link className="btn btn-primary" href="/contacts">Связаться</Link>
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="product-list-grid">
              {results.map(({ product }) => (
                <Link key={`${product.categorySlug}/${product.slug}`} className="product-list-card product-list-card-with-image" href={`/catalog/${product.categorySlug}/${product.slug}`}>
                  <ProductImage src={getProductImage(product, 'card')} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} compact />
                  <span className="brand-line">{product.brandName}</span>
                  <h3>{product.name}</h3>
                  <p>{cleanPreviewText(getProductCardDescription(product))}</p>
                  <ul className="badges">
                    {product.sku ? <li className="badge">{product.sku}</li> : null}
                    <li className="badge price-badge">{formatProductPrice(product)}</li>
                    <ProductAvailabilityBadge product={product} />
                    {getProductKeyFacts(product, 3).slice(1).map((fact) => <li className="badge" key={fact}>{fact}</li>)}
                  </ul>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
