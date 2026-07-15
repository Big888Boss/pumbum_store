import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ProductAvailabilityBadge, ProductAvailabilityText } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import { JsonLd } from '@/components/seo/JsonLd';
import type { Category } from '@/entities/category/model';
import type { Product } from '@/entities/product/model';
import type { CatalogFilterKey, CatalogFilterSelection } from '@/lib/catalog/filters';
import { activeCatalogFilterCount, applyCatalogFilters, buildCatalogFilters, getProductGroupLabel, parseCatalogFilterSelection } from '@/lib/catalog/filters';
import { getCategoryBySlug, getFeaturedProductByCategory, getProductsByCategory, getRelatedProducts } from '@/lib/catalog/loaders';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getProductImage } from '@/lib/catalog/product-images';
import { getProductDistinctionFacts, getProductKeyFacts } from '@/lib/catalog/specs';
import { categoryJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCspNonce } from '@/lib/security/nonce';
import { getLegacyCatalogRedirect } from '@/lib/seo/legacy-redirects';
import { getProductCardDescription, getProductVisibleDescription } from '@/lib/seo/product';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const productsPerPage = 60;
type CatalogViewMode = 'grid' | 'list';

function getTopProductGroups(products: Product[], limit = 14) {
  const counts = new Map<string, number>();
  for (const product of products) {
    const label = getProductGroupLabel(product);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).slice(0, limit);
}

function formatPositions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'позиция' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'позиции' : 'позиций';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

function parseCatalogViewMode(query: Record<string, string | string[] | undefined>): CatalogViewMode {
  const raw = query.view;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'list' ? 'list' : 'grid';
}

function parseCatalogPage(query: Record<string, string | string[] | undefined>): number {
  const raw = query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function buildCategoryHref(
  categorySlug: string,
  selected: CatalogFilterSelection,
  viewMode: CatalogViewMode,
  options: { key?: CatalogFilterKey; value?: string; page?: number } = {},
): string {
  const params = new URLSearchParams();
  const nextSelected = { ...selected };
  if (options.key) {
    if (options.value && selected[options.key] !== options.value) nextSelected[options.key] = options.value;
    else delete nextSelected[options.key];
  }

  for (const [entryKey, entryValue] of Object.entries(nextSelected)) {
    if (entryValue) params.set(entryKey, entryValue);
  }
  if (viewMode === 'list') params.set('view', 'list');
  if ((options.page ?? 1) > 1) params.set('page', String(options.page));

  const query = params.toString();
  return query ? `/catalog/${categorySlug}?${query}` : `/catalog/${categorySlug}`;
}

function ViewSwitcher({ categorySlug, selected, viewMode, page }: { categorySlug: string; selected: CatalogFilterSelection; viewMode: CatalogViewMode; page: number }) {
  return (
    <div className="catalog-view-switcher" aria-label="Вид каталога">
      <Link className={viewMode === 'grid' ? 'is-active' : ''} href={buildCategoryHref(categorySlug, selected, 'grid', { page })}>Карточки с фото</Link>
      <Link className={viewMode === 'list' ? 'is-active' : ''} href={buildCategoryHref(categorySlug, selected, 'list', { page })}>Список без фото</Link>
    </div>
  );
}

function FilterPanel({ categorySlug, products, selected, viewMode }: { categorySlug: string; products: Product[]; selected: CatalogFilterSelection; viewMode: CatalogViewMode }) {
  const filters = buildCatalogFilters(products, selected);
  const activeCount = activeCatalogFilterCount(selected);

  if (filters.length === 0) return null;

  return (
    <details className="filter-drawer" open={activeCount > 0}>
      <summary className="btn btn-secondary filter-toggle">
        Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}
      </summary>
      <form className="filter-panel" action={`/catalog/${categorySlug}`}>
        {viewMode === 'list' ? <input type="hidden" name="view" value="list" /> : null}
        <div className="filter-grid">
          {filters.map((filter) => (
            <label key={filter.key} className="filter-field">
              <span>{filter.label}</span>
              <select name={filter.key} defaultValue={selected[filter.key] ?? ''}>
                <option value="">Все</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} · {option.count.toLocaleString('ru-RU')}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">Показать</button>
          <Link className="btn btn-secondary" href={buildCategoryHref(categorySlug, {}, viewMode)}>Сбросить</Link>
        </div>
      </form>
    </details>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const query = searchParams ? await searchParams : {};
  const hasFilters = activeCatalogFilterCount(parseCatalogFilterSelection(query)) > 0;
  const hasPagination = parseCatalogPage(query) > 1;
  const categoryData = getCategoryBySlug(category);
  if (!categoryData) return {};
  return buildMetadata({
    title: categoryData.title,
    description: categoryData.description,
    path: `/catalog/${categoryData.slug}`,
    noindex: hasFilters || hasPagination,
    followWhenNoindex: hasPagination && !hasFilters,
  });
}

function ProductGrid({ categorySlug, products, baseProducts, selected, viewMode, requestedPage }: { categorySlug: string; products: Product[]; baseProducts: Product[]; selected: CatalogFilterSelection; viewMode: CatalogViewMode; requestedPage: number }) {
  const pageCount = Math.max(1, Math.ceil(products.length / productsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
  const startIndex = (currentPage - 1) * productsPerPage;
  const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
  const visibleStart = products.length > 0 ? startIndex + 1 : 0;
  const visibleEnd = startIndex + visibleProducts.length;
  const paginationPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const productGroups = getTopProductGroups(baseProducts);
  const activeCount = activeCatalogFilterCount(selected);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>Товары раздела</h2>
            <p>
              {formatPositions(products.length)}
              {activeCount > 0 ? ` после фильтрации из ${formatPositions(baseProducts.length)}` : ' в разделе'}.
              {' '}Актуальную цену и возможность отгрузки подтверждает менеджер.
            </p>
          </div>
          {products.length > 0 ? <p className="meta">Показаны позиции {visibleStart.toLocaleString('ru-RU')}–{visibleEnd.toLocaleString('ru-RU')} из {products.length.toLocaleString('ru-RU')}.</p> : null}
        </div>
        {productGroups.length > 0 ? (
          <div className="catalog-groups" aria-label="Популярные группы раздела">
            {productGroups.map(([name, count]) => (
              <Link
                key={name}
                className={selected.group === name ? 'is-active' : ''}
                href={buildCategoryHref(categorySlug, selected, viewMode, { key: 'group', value: name })}
              >
                {name} <strong>{count.toLocaleString('ru-RU')}</strong>
              </Link>
            ))}
          </div>
        ) : null}
        <div className="catalog-toolbar">
          <FilterPanel categorySlug={categorySlug} products={baseProducts} selected={selected} viewMode={viewMode} />
          <ViewSwitcher categorySlug={categorySlug} selected={selected} viewMode={viewMode} page={currentPage} />
        </div>
        {activeCount > 0 ? (
          <div className="active-filters" aria-label="Выбранные фильтры">
            {Object.entries(selected).map(([key, value]) => value ? (
              <Link key={key} href={buildCategoryHref(categorySlug, selected, viewMode, { key: key as CatalogFilterKey, value })}>
                {value} ×
              </Link>
            ) : null)}
          </div>
        ) : null}
        {products.length === 0 ? (
          <div className="notice">
            <h2>По выбранным фильтрам товаров не найдено</h2>
            <p>Сбросьте часть параметров или используйте поиск по артикулу. В инженерных категориях часть характеристик приходит из разных файлов поставщиков.</p>
            <Link className="btn btn-primary" href={`/catalog/${categorySlug}`}>Сбросить фильтры</Link>
          </div>
        ) : null}
        {viewMode === 'list' ? (
          <div className="product-rows" role="list">
            {visibleProducts.map((item) => {
              const facts = getProductDistinctionFacts(item, 4);
              return (
                <Link key={`${item.categorySlug}/${item.slug}`} className="product-row" href={`/catalog/${item.categorySlug}/${item.slug}`} role="listitem">
                  <span className="product-row-brand">{item.brandName}</span>
                  <span className="product-row-main">
                    <strong>{item.name}</strong>
                    <small>{getProductGroupLabel(item) ?? getProductCardDescription(item)}</small>
                  </span>
                  <span className="product-row-sku">{item.sku || item.vendorCode || 'артикул уточняется'}</span>
                  <span className="product-row-facts">{facts.join(' · ')}</span>
                  <span className="product-row-price">
                    <span>{formatProductPrice(item)}</span>
                    <ProductAvailabilityText product={item} />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="product-list-grid product-list-grid-with-images">
            {visibleProducts.map((item) => (
              <Link key={`${item.categorySlug}/${item.slug}`} className="product-list-card product-list-card-with-image" href={`/catalog/${item.categorySlug}/${item.slug}`}>
                <ProductImage src={getProductImage(item, 'card')} alt={item.name} logoSrc={item.logo} brand={item.brandName} hideBrandLogo={item.hideBrandLogo} compact />
                <span className="brand-line">{item.brandName}</span>
                <h3>{item.name}</h3>
                <p>{getProductCardDescription(item)}</p>
                <ul className="badges">
                  {item.sku ? <li className="badge">{item.sku}</li> : null}
                  <li className="badge price-badge">{formatProductPrice(item)}</li>
                  <ProductAvailabilityBadge product={item} />
                  {getProductDistinctionFacts(item, 3).map((highlight) => <li className="badge" key={highlight}>{highlight}</li>)}
                </ul>
              </Link>
            ))}
          </div>
        )}
        {pageCount > 1 ? (
          <nav className="catalog-pagination" aria-label="Страницы каталога">
            {currentPage > 1 ? (
              <Link rel="prev" href={buildCategoryHref(categorySlug, selected, viewMode, { page: currentPage - 1 })}>Назад</Link>
            ) : null}
            {paginationPages.map((page, index) => (
              <span className="catalog-pagination-item" key={page}>
                {index > 0 && page - paginationPages[index - 1] > 1 ? <span className="catalog-pagination-gap" aria-hidden="true">…</span> : null}
                <Link
                  className={page === currentPage ? 'is-active' : ''}
                  href={buildCategoryHref(categorySlug, selected, viewMode, { page })}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Link>
              </span>
            ))}
            {currentPage < pageCount ? (
              <Link rel="next" href={buildCategoryHref(categorySlug, selected, viewMode, { page: currentPage + 1 })}>Вперёд</Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function RadiatorsCategoryView({ category, product, products, related, viewMode, page, nonce }: { category: Category; product: Product; products: Product[]; related: Product[]; viewMode: CatalogViewMode; page: number; nonce?: string }) {
  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: category.name, path: `/catalog/${category.slug}` },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(breadcrumbs), categoryJsonLd(category)]} nonce={nonce} />
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / {category.name}</div>
      <section className="radiator-hero">
        <div className="container radiator-hero-grid">
          <div className="radiator-hero-copy">
            <div className="eyebrow">{category.name}</div>
            <h1>{category.h1}</h1>
            <p className="lead">{category.intro}</p>
            <div className="radiator-advantages" aria-label="Что уточнить">
              <span>Проверка совместимости</span>
              <span>Совместимость компонентов</span>
              <span>Размер и подключение</span>
              <span>Готовые комплекты</span>
            </div>
            <div className="actions">
              <Link className="btn btn-primary" href="/contacts">Подобрать комплект</Link>
              <Link className="btn btn-secondary" href="/contacts">Получить консультацию</Link>
            </div>
          </div>
          <div className="radiator-visual-card">
            <ProductImage src={product.image} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} priority />
            <div className="radiator-visual-note">
              <strong>{product.brandName}</strong>
              <span>{getProductCardDescription(product)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container grid grid-2">
          <article className="card info-card">
            <h2>Подходит для</h2>
            <ul className="clean-list">
              {(product.suitableFor ?? []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <aside className="card info-card accent-card">
            <h2>Что уточнить перед покупкой</h2>
            <p>Проверим важные параметры до заказа, чтобы комплект подошёл к радиатору и выглядел аккуратно после монтажа.</p>
            <ul className="check-grid">
              {(product.selectionHelp ?? []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </aside>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="section-head"><h2>Популярный комплект</h2><p>Готовое решение для аккуратного подключения и регулировки радиатора.</p></div>
          <article className="radiator-product-card">
            <ProductImage src={product.image} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} />
            <div className="radiator-product-content">
              <div className="brand-line">{product.brandName}</div>
              <h3>{product.name}</h3>
              <p>{getProductVisibleDescription(product)}</p>
              <ul className="badges">
              {getProductKeyFacts(product, 4).map((item) => <li className="badge" key={item}>{item}</li>)}
                <li className="badge price-badge">{formatProductPrice(product)}</li>
              </ul>
              <div className="actions">
                <Link className="btn btn-primary" href="/contacts">Подобрать комплект</Link>
                <Link className="btn btn-secondary" href={`/catalog/${product.categorySlug}/${product.slug}`}>Подробнее</Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>С этим обычно подбирают</h2><p>Дополните комплект позициями, которые часто нужны для монтажа радиаторного узла.</p></div>
          <div className="grid grid-3">
            {related.map((item) => (
              <Link key={item.categorySlug} className="mini-product-card" href={`/catalog/${item.categorySlug}`}>
                <ProductImage src={item.image} alt={item.name} logoSrc={item.logo} brand={item.brandName} />
                <div>
                  <span className="brand-line">{item.brandName}</span>
                  <h3>{item.name}</h3>
                  <p>{item.purpose}</p>
                  <strong>Смотреть раздел</strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <ProductGrid categorySlug={category.slug} products={products} baseProducts={products} selected={{}} viewMode={viewMode} requestedPage={page} />
    </>
  );
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const nonce = await getCspNonce();
  const { category } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedFilters = parseCatalogFilterSelection(query);
  const viewMode = parseCatalogViewMode(query);
  const page = parseCatalogPage(query);
  const categoryData = getCategoryBySlug(category);
  const categoryProducts = getProductsByCategory(category);
  const filteredProducts = applyCatalogFilters(categoryProducts, selectedFilters);
  const product = getFeaturedProductByCategory(category);
  if (!categoryData || !product) {
    const legacyDestination = getLegacyCatalogRedirect([category]);
    if (legacyDestination) permanentRedirect(legacyDestination);
    notFound();
  }
  const related = getRelatedProducts(product.categorySlug);

  if (product.categorySlug === 'radiators') {
    return <RadiatorsCategoryView category={categoryData} product={product} products={categoryProducts} related={related} viewMode={viewMode} page={page} nonce={nonce} />;
  }

  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: categoryData.name, path: `/catalog/${categoryData.slug}` },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(breadcrumbs), categoryJsonLd(categoryData)]} nonce={nonce} />
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / {categoryData.name}</div>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">{categoryData.name}</div>
            <h1>{categoryData.h1}</h1>
            <p className="lead">{categoryData.intro}</p>
            <div className="actions">
              <Link className="btn btn-primary" href={`/catalog/${product.categorySlug}/${product.slug}`}>Смотреть товар</Link>
              <Link className="btn btn-secondary" href="/contacts">Связаться с магазином</Link>
            </div>
          </div>
          <ProductImage src={product.image} alt={product.name} logoSrc={product.logo} brand={product.brandName} hideBrandLogo={product.hideBrandLogo} priority />
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <Link className="card popular-product-card" href={`/catalog/${product.categorySlug}/${product.slug}`}>
            <h2>Популярный товар</h2>
            <h3>{product.name}</h3>
            <p>{getProductCardDescription(product)}</p>
            <ul className="badges">
              {getProductKeyFacts(product, 4).map((item) => <li className="badge" key={item}>{item}</li>)}
              <li className="badge price-badge">{formatProductPrice(product)}</li>
            </ul>
          </Link>
          <aside className="card">
            <h2>Что уточнить перед покупкой</h2>
            <ul>
              {product.sellingPoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </aside>
        </div>
      </section>
      <ProductGrid categorySlug={categoryData.slug} products={filteredProducts} baseProducts={categoryProducts} selected={selectedFilters} viewMode={viewMode} requestedPage={page} />

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Связанные категории</h2><p>Комплектующие, которые часто нужны для одной инженерной системы.</p></div>
          <div className="grid grid-3">
            {related.map((item) => (
              <Link key={item.categorySlug} className="card" href={`/catalog/${item.categorySlug}`}>
                <h3>{item.name}</h3>
                <p>{item.purpose}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
