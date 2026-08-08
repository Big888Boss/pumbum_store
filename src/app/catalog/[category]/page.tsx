import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { CategoryProductCarousel } from '@/components/catalog/CategoryProductCarousel';
import { CategorySectionVideo } from '@/components/catalog/CategorySectionVideo';
import { CatalogScrollRestorer } from '@/components/catalog/CatalogScrollRestorer';
import { CallStoreButton } from '@/components/layout/CallStoreButton';
import { MascotFigure } from '@/components/layout/MascotFigure';
import { ProductAvailabilityBadge, ProductAvailabilityText } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import { JsonLd } from '@/components/seo/JsonLd';
import type { Category } from '@/entities/category/model';
import type { Product } from '@/entities/product/model';
import type { CatalogFilterKey, CatalogFilterSelection } from '@/lib/catalog/filters';
import { activeCatalogFilterCount, applyCatalogFilters, buildCatalogFilters, getProductGroupLabel, parseCatalogFilterSelection, priceRangeLabel } from '@/lib/catalog/filters';
import { getCatalogSubcategories, getCategoryBySlug, getFeaturedProductsByCategory, getProductsByCategory, getRelatedProducts } from '@/lib/catalog/loaders';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getCategoryVideo } from '@/lib/catalog/category-videos';
import { getProductImage } from '@/lib/catalog/product-images';
import { getProductDistinctionFacts, getProductKeyFacts } from '@/lib/catalog/specs';
import { categoryJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCspNonce } from '@/lib/security/nonce';
import { getLegacyCatalogRedirect } from '@/lib/seo/legacy-redirects';
import { getProductCardDescription, getProductVisibleDescription } from '@/lib/seo/product';
import { getCategoryMascot, getCategoryMascotPose } from '@/lib/mascots';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const productsPerPage = 24;
type CatalogViewMode = 'grid' | 'list';

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

type CatalogSortMode = 'default' | 'price_asc' | 'price_desc';

function parseCatalogSort(query: Record<string, string | string[] | undefined>): CatalogSortMode {
  const raw = query.sort;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'price_asc' || value === 'price_desc' ? value : 'default';
}

// Товары без цены при любой сортировке уходят в конец списка.
function sortCatalogProducts(products: Product[], sort: CatalogSortMode): Product[] {
  if (sort === 'default') return products;
  const direction = sort === 'price_asc' ? 1 : -1;
  const amount = (product: Product): number | undefined => {
    const value = product.price?.amount;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  };
  return [...products].sort((a, b) => {
    const priceA = amount(a);
    const priceB = amount(b);
    if (priceA === undefined && priceB === undefined) return 0;
    if (priceA === undefined) return 1;
    if (priceB === undefined) return -1;
    return (priceA - priceB) * direction;
  });
}

function buildCategoryHref(
  categorySlug: string,
  selected: CatalogFilterSelection,
  viewMode: CatalogViewMode,
  sort: CatalogSortMode,
  options: { key?: CatalogFilterKey; value?: string; page?: number; sort?: CatalogSortMode } = {},
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
  const nextSort = options.sort ?? sort;
  if (nextSort !== 'default') params.set('sort', nextSort);
  if ((options.page ?? 1) > 1) params.set('page', String(options.page));

  const query = params.toString();
  return query ? `/catalog/${categorySlug}?${query}` : `/catalog/${categorySlug}`;
}

function ViewSwitcher({ categorySlug, selected, viewMode, sort, page }: { categorySlug: string; selected: CatalogFilterSelection; viewMode: CatalogViewMode; sort: CatalogSortMode; page: number }) {
  return (
    <div className="catalog-view-switcher" aria-label="Вид каталога">
      <Link className={viewMode === 'grid' ? 'is-active' : ''} href={`${buildCategoryHref(categorySlug, selected, 'grid', sort, { page })}#catalog-products`}>Карточки с фото</Link>
      <Link className={viewMode === 'list' ? 'is-active' : ''} href={`${buildCategoryHref(categorySlug, selected, 'list', sort, { page })}#catalog-products`}>Список без фото</Link>
    </div>
  );
}

function SortSwitcher({ categorySlug, selected, viewMode, sort }: { categorySlug: string; selected: CatalogFilterSelection; viewMode: CatalogViewMode; sort: CatalogSortMode }) {
  const modes: Array<[CatalogSortMode, string]> = [
    ['default', 'По порядку'],
    ['price_asc', 'Сначала дешевле'],
    ['price_desc', 'Сначала дороже'],
  ];
  return (
    <div className="catalog-view-switcher" aria-label="Сортировка товаров">
      {modes.map(([mode, label]) => (
        <Link key={mode} className={sort === mode ? 'is-active' : ''} href={`${buildCategoryHref(categorySlug, selected, viewMode, sort, { sort: mode })}#catalog-products`}>
          {label}
        </Link>
      ))}
    </div>
  );
}

function CategoryExpertText({ category }: { category: Category }) {
  return (
    <section className="section section-tight" aria-labelledby="category-selection-guide">
      <div className="container">
        <article className="card info-card">
          <h2 id="category-selection-guide">Как выбрать оборудование для своей задачи</h2>
          <p>{category.seoText}</p>
          <p>{category.buyingGuide}</p>
          <p className="meta">Товар можно забрать в магазине на Большой Горной, 290 в Саратове. Цену, срок поставки и совместимость комплекта подтвердит менеджер.</p>
          <div className="actions info-card-actions">
            <CallStoreButton location={`category_guide_${category.slug}`} />
          </div>
        </article>
      </div>
    </section>
  );
}

function FilterPanel({ categorySlug, products, selected, viewMode, sort }: { categorySlug: string; products: Product[]; selected: CatalogFilterSelection; viewMode: CatalogViewMode; sort: CatalogSortMode }) {
  const filters = buildCatalogFilters(products, selected);
  const activeCount = activeCatalogFilterCount(selected);

  if (filters.length === 0) return null;

  return (
    <details className="filter-drawer" open={activeCount > 0}>
      <summary className="btn btn-secondary filter-toggle">
        Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}
      </summary>
      <form className="filter-panel" action={`/catalog/${categorySlug}#catalog-products`}>
        {viewMode === 'list' ? <input type="hidden" name="view" value="list" /> : null}
        {sort !== 'default' ? <input type="hidden" name="sort" value={sort} /> : null}
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
          <Link className="btn btn-secondary" href={`${buildCategoryHref(categorySlug, {}, viewMode, sort)}#catalog-products`}>Сбросить</Link>
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
  const hasSort = parseCatalogSort(query) !== 'default';
  const categoryData = getCategoryBySlug(category);
  if (!categoryData) return {};
  return buildMetadata({
    title: categoryData.title,
    description: categoryData.description,
    path: `/catalog/${categoryData.slug}`,
    noindex: hasFilters || hasPagination || hasSort,
    followWhenNoindex: hasPagination && !hasFilters && !hasSort,
  });
}

function ProductGrid({ category, products, baseProducts, selected, viewMode, sort, requestedPage }: { category: Category; products: Product[]; baseProducts: Product[]; selected: CatalogFilterSelection; viewMode: CatalogViewMode; sort: CatalogSortMode; requestedPage: number }) {
  const categorySlug = category.slug;
  const categoryVideo = getCategoryVideo(categorySlug);
  const pageCount = Math.max(1, Math.ceil(products.length / productsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
  const startIndex = (currentPage - 1) * productsPerPage;
  const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
  const visibleStart = products.length > 0 ? startIndex + 1 : 0;
  const visibleEnd = startIndex + visibleProducts.length;
  const paginationPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const productGroups = getCatalogSubcategories(categorySlug)
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 14);
  const activeCount = activeCatalogFilterCount(selected);

  return (
    <section className="section category-products-section" id="catalog-products">
      <CatalogScrollRestorer />
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
        {categoryVideo ? <CategorySectionVideo categoryName={category.name} video={categoryVideo} /> : null}
        {productGroups.length > 0 ? (
          <div className="catalog-groups" aria-label="Группы товаров раздела">
            {productGroups.map((group) => (
              <Link
                key={group.slug}
                className={selected.group === group.name ? 'is-active' : ''}
                href={`/catalog/${categorySlug}/podrazdel/${group.slug}`}
              >
                {group.name} <strong>{group.productCount.toLocaleString('ru-RU')}</strong>
              </Link>
            ))}
          </div>
        ) : null}
        <div className="catalog-toolbar">
          <FilterPanel categorySlug={categorySlug} products={baseProducts} selected={selected} viewMode={viewMode} sort={sort} />
          <SortSwitcher categorySlug={categorySlug} selected={selected} viewMode={viewMode} sort={sort} />
          <ViewSwitcher categorySlug={categorySlug} selected={selected} viewMode={viewMode} sort={sort} page={currentPage} />
        </div>
        {activeCount > 0 ? (
          <div className="active-filters" aria-label="Выбранные фильтры">
            {Object.entries(selected).map(([key, value]) => value ? (
              <Link key={key} href={`${buildCategoryHref(categorySlug, selected, viewMode, sort, { key: key as CatalogFilterKey, value })}#catalog-products`}>
                {key === 'price' ? priceRangeLabel(value) : value} ×
              </Link>
            ) : null)}
          </div>
        ) : null}
        {products.length === 0 ? (
          <div className="notice">
            <h2>По выбранным фильтрам товаров не найдено</h2>
            <p>Сбросьте часть параметров или используйте поиск по артикулу. В инженерных категориях часть характеристик приходит из разных файлов поставщиков.</p>
            <Link className="btn btn-primary" href={`/catalog/${categorySlug}#catalog-products`}>Сбросить фильтры</Link>
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
            {visibleProducts.map((item, index) => (
              <Link key={`${item.categorySlug}/${item.slug}`} className="product-list-card product-list-card-with-image" href={`/catalog/${item.categorySlug}/${item.slug}`}>
                <ProductImage src={getProductImage(item, 'card')} alt={item.name} logoSrc={item.logo} brand={item.brandName} hideBrandLogo={item.hideBrandLogo} compact priority={index < 6} />
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
              <Link rel="prev" href={`${buildCategoryHref(categorySlug, selected, viewMode, sort, { page: currentPage - 1 })}#catalog-products`}>Назад</Link>
            ) : null}
            {paginationPages.map((page, index) => (
              <span className="catalog-pagination-item" key={page}>
                {index > 0 && page - paginationPages[index - 1] > 1 ? <span className="catalog-pagination-gap" aria-hidden="true">…</span> : null}
                <Link
                  className={page === currentPage ? 'is-active' : ''}
                  href={`${buildCategoryHref(categorySlug, selected, viewMode, sort, { page })}#catalog-products`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Link>
              </span>
            ))}
            {currentPage < pageCount ? (
              <Link rel="next" href={`${buildCategoryHref(categorySlug, selected, viewMode, sort, { page: currentPage + 1 })}#catalog-products`}>Вперёд</Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function RadiatorsCategoryView({ category, product, products, related, viewMode, sort, page, nonce }: { category: Category; product: Product; products: Product[]; related: Product[]; viewMode: CatalogViewMode; sort: CatalogSortMode; page: number; nonce?: string }) {
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
            <div className="actions info-card-actions">
              <CallStoreButton location="radiator_before_purchase" label="Позвонить менеджеру" />
            </div>
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
      <ProductGrid category={category} products={sortCatalogProducts(products, sort)} baseProducts={products} selected={{}} viewMode={viewMode} sort={sort} requestedPage={page} />
      <CategoryExpertText category={category} />
    </>
  );
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const nonce = await getCspNonce();
  const { category } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedFilters = parseCatalogFilterSelection(query);
  const viewMode = parseCatalogViewMode(query);
  const sort = parseCatalogSort(query);
  const page = parseCatalogPage(query);
  const categoryData = getCategoryBySlug(category);
  const categoryProducts = getProductsByCategory(category);
  const filteredProducts = sortCatalogProducts(applyCatalogFilters(categoryProducts, selectedFilters), sort);
  const featuredProducts = getFeaturedProductsByCategory(category, 3);
  const product = featuredProducts[0];
  if (!categoryData || !product) {
    const legacyDestination = getLegacyCatalogRedirect([category]);
    if (legacyDestination) permanentRedirect(legacyDestination);
    notFound();
  }
  const categoryMascot = getCategoryMascot(categoryData.slug);
  const related = getRelatedProducts(product.categorySlug);
  const featuredGroupLabels = featuredProducts.map((item) => getProductGroupLabel(item) ?? item.purpose);

  if (product.categorySlug === 'radiators') {
    return <RadiatorsCategoryView category={categoryData} product={product} products={categoryProducts} related={related} viewMode={viewMode} sort={sort} page={page} nonce={nonce} />;
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
          <div className="category-hero-media">
            <CategoryProductCarousel
              products={featuredProducts}
              groupLabels={featuredGroupLabels}
              mascot={categoryMascot ? getCategoryMascotPose(categoryMascot, 'peek') : undefined}
              categorySlug={categoryData.slug}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <article className="card popular-product-card">
            <h2>Основные направления раздела</h2>
            <h3>Разные типы товаров</h3>
            <p>Карусель показывает разные направления категории, чтобы быстрее перейти к основному оборудованию, а не к случайной вспомогательной позиции.</p>
            <ul className="badges">
              {featuredGroupLabels.map((label) => <li className="badge" key={label}>{label}</li>)}
            </ul>
          </article>
          <aside className="card category-advice-card">
            <h2>Что уточнить перед покупкой</h2>
            <p>{categoryData.buyingGuide}</p>
            <p className="meta">Менеджер проверит параметры и совместимость конкретных артикулов до заказа.</p>
            <div className="actions info-card-actions">
              <CallStoreButton location={`category_before_purchase_${categoryData.slug}`} label="Позвонить менеджеру" />
            </div>
            {categoryMascot ? <MascotFigure mascot={getCategoryMascotPose(categoryMascot, 'thoughtful')} placement="thoughtful" className="mascot-figure-category" /> : null}
          </aside>
        </div>
      </section>
      <ProductGrid category={categoryData} products={filteredProducts} baseProducts={categoryProducts} selected={selectedFilters} viewMode={viewMode} sort={sort} requestedPage={page} />
      <CategoryExpertText category={categoryData} />

      <section className="section">
        <div className="container">
          <div className="section-head category-related-head">
            <h2>Связанные категории</h2>
            <p>Комплектующие, которые часто нужны для одной инженерной системы.</p>
            {categoryMascot ? <MascotFigure mascot={getCategoryMascotPose(categoryMascot, 'seated')} placement="seated" className="mascot-figure-category" /> : null}
          </div>
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
