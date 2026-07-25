import Link from 'next/link';
import { ProductAvailabilityBadge, ProductAvailabilityText } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';
import type { CatalogFilterKey, CatalogFilterSelection } from '@/lib/catalog/filters';
import {
  activeCatalogFilterCount,
  applyCatalogFilters,
  buildCatalogFilters,
  getProductGroupLabel,
  parseCatalogFilterSelection,
  priceRangeLabel,
} from '@/lib/catalog/filters';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getProductImage } from '@/lib/catalog/product-images';
import { getProductDistinctionFacts } from '@/lib/catalog/specs';
import { getProductCardDescription } from '@/lib/seo/product';

const productsPerPage = 60;
type CollectionViewMode = 'grid' | 'list';
type CollectionSortMode = 'default' | 'price_asc' | 'price_desc';

function firstQueryValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? '').trim();
}

function parsePage(query: Record<string, string | string[] | undefined>): number {
  const page = Number.parseInt(firstQueryValue(query.page) || '1', 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function parseView(query: Record<string, string | string[] | undefined>): CollectionViewMode {
  return firstQueryValue(query.view) === 'list' ? 'list' : 'grid';
}

function parseSort(query: Record<string, string | string[] | undefined>): CollectionSortMode {
  const value = firstQueryValue(query.sort);
  return value === 'price_asc' || value === 'price_desc' ? value : 'default';
}

function sortProducts(products: Product[], sort: CollectionSortMode): Product[] {
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

function matchesSearch(product: Product, query: string): boolean {
  if (!query) return true;
  const haystack = [
    product.name,
    product.brandName,
    product.sku,
    product.vendorCode,
    getProductGroupLabel(product),
    product.shortDescription,
  ].join(' ').toLocaleLowerCase('ru-RU');
  return query.toLocaleLowerCase('ru-RU').split(/\s+/).every((term) => haystack.includes(term));
}

function buildCollectionHref(
  basePath: string,
  selected: CatalogFilterSelection,
  search: string,
  view: CollectionViewMode,
  sort: CollectionSortMode,
  options: {
    key?: CatalogFilterKey;
    value?: string;
    page?: number;
    view?: CollectionViewMode;
    sort?: CollectionSortMode;
    search?: string;
    clearFilters?: boolean;
  } = {},
): string {
  const params = new URLSearchParams();
  const nextSelected = options.clearFilters ? {} : { ...selected };
  if (options.key) {
    if (options.value && selected[options.key] !== options.value) nextSelected[options.key] = options.value;
    else delete nextSelected[options.key];
  }
  for (const [key, value] of Object.entries(nextSelected)) {
    if (value) params.set(key, value);
  }

  const nextSearch = options.search ?? search;
  const nextView = options.view ?? view;
  const nextSort = options.sort ?? sort;
  if (nextSearch) params.set('q', nextSearch);
  if (nextView === 'list') params.set('view', 'list');
  if (nextSort !== 'default') params.set('sort', nextSort);
  if ((options.page ?? 1) > 1) params.set('page', String(options.page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function FilterPanel({
  basePath,
  products,
  selected,
  search,
  view,
  sort,
}: {
  basePath: string;
  products: Product[];
  selected: CatalogFilterSelection;
  search: string;
  view: CollectionViewMode;
  sort: CollectionSortMode;
}) {
  const filters = buildCatalogFilters(products, selected);
  const activeCount = activeCatalogFilterCount(selected);
  if (filters.length === 0) return null;

  return (
    <details className="filter-drawer" open={activeCount > 0}>
      <summary className="btn btn-secondary filter-toggle">Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}</summary>
      <form className="filter-panel" action={basePath}>
        {search ? <input type="hidden" name="q" value={search} /> : null}
        {view === 'list' ? <input type="hidden" name="view" value="list" /> : null}
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
          <Link className="btn btn-secondary" href={buildCollectionHref(basePath, selected, search, view, sort, { clearFilters: true })}>Сбросить фильтры</Link>
        </div>
      </form>
    </details>
  );
}

export function CatalogCollectionGrid({
  products,
  basePath,
  query,
  title = 'Товары',
}: {
  products: Product[];
  basePath: string;
  query: Record<string, string | string[] | undefined>;
  title?: string;
}) {
  const selected = parseCatalogFilterSelection(query);
  const search = firstQueryValue(query.q);
  const view = parseView(query);
  const sort = parseSort(query);
  const requestedPage = parsePage(query);
  const searchedProducts = products.filter((product) => matchesSearch(product, search));
  const filteredProducts = applyCatalogFilters(searchedProducts, selected);
  const visibleCollection = sortProducts(filteredProducts, sort);
  const pageCount = Math.max(1, Math.ceil(visibleCollection.length / productsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
  const startIndex = (currentPage - 1) * productsPerPage;
  const visibleProducts = visibleCollection.slice(startIndex, startIndex + productsPerPage);
  const visibleStart = visibleCollection.length > 0 ? startIndex + 1 : 0;
  const visibleEnd = startIndex + visibleProducts.length;
  const paginationPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const groupCounts = new Map<string, number>();
  for (const product of products) {
    const group = getProductGroupLabel(product);
    if (group) groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }
  const groups = [...groupCounts.entries()].slice(0, 14);
  const activeCount = activeCatalogFilterCount(selected);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            <p>
              {visibleCollection.length.toLocaleString('ru-RU')} позиций
              {activeCount > 0 || search ? ` после отбора из ${products.length.toLocaleString('ru-RU')}` : ''}.
              {' '}Цену и возможность отгрузки подтверждает менеджер.
            </p>
          </div>
          {visibleCollection.length > 0 ? (
            <p className="meta">Показаны позиции {visibleStart.toLocaleString('ru-RU')}–{visibleEnd.toLocaleString('ru-RU')} из {visibleCollection.length.toLocaleString('ru-RU')}.</p>
          ) : null}
        </div>

        <form className="collection-search" action={basePath} role="search">
          {selected.group ? <input type="hidden" name="group" value={selected.group} /> : null}
          {view === 'list' ? <input type="hidden" name="view" value="list" /> : null}
          {sort !== 'default' ? <input type="hidden" name="sort" value={sort} /> : null}
          <label>
            <span>Поиск в этой подборке</span>
            <input name="q" type="search" defaultValue={search} placeholder="Название, бренд или артикул" />
          </label>
          <button className="btn btn-primary" type="submit">Найти</button>
          {search ? <Link className="btn btn-secondary" href={buildCollectionHref(basePath, selected, '', view, sort, { search: '' })}>Очистить</Link> : null}
        </form>

        {groups.length > 0 ? (
          <div className="catalog-groups" aria-label="Группы товаров">
            <Link className={!selected.group ? 'is-active' : ''} href={buildCollectionHref(basePath, selected, search, view, sort, { key: 'group', value: selected.group })}>
              Все группы <strong>{products.length.toLocaleString('ru-RU')}</strong>
            </Link>
            {groups.map(([group, count]) => (
              <Link
                key={group}
                className={selected.group === group ? 'is-active' : ''}
                href={buildCollectionHref(basePath, selected, search, view, sort, { key: 'group', value: group })}
              >
                {group} <strong>{count.toLocaleString('ru-RU')}</strong>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="catalog-toolbar">
          <FilterPanel basePath={basePath} products={searchedProducts} selected={selected} search={search} view={view} sort={sort} />
          <div className="catalog-view-switcher" aria-label="Сортировка товаров">
            {([
              ['default', 'По важности'],
              ['price_asc', 'Сначала дешевле'],
              ['price_desc', 'Сначала дороже'],
            ] as Array<[CollectionSortMode, string]>).map(([mode, label]) => (
              <Link key={mode} className={sort === mode ? 'is-active' : ''} href={buildCollectionHref(basePath, selected, search, view, sort, { sort: mode })}>{label}</Link>
            ))}
          </div>
          <div className="catalog-view-switcher" aria-label="Вид каталога">
            <Link className={view === 'grid' ? 'is-active' : ''} href={buildCollectionHref(basePath, selected, search, view, sort, { view: 'grid', page: currentPage })}>Карточки с фото</Link>
            <Link className={view === 'list' ? 'is-active' : ''} href={buildCollectionHref(basePath, selected, search, view, sort, { view: 'list', page: currentPage })}>Список без фото</Link>
          </div>
        </div>

        {activeCount > 0 ? (
          <div className="active-filters" aria-label="Выбранные фильтры">
            {Object.entries(selected).map(([key, value]) => value ? (
              <Link key={key} href={buildCollectionHref(basePath, selected, search, view, sort, { key: key as CatalogFilterKey, value })}>
                {key === 'price' ? priceRangeLabel(value) : value} ×
              </Link>
            ) : null)}
          </div>
        ) : null}

        {visibleCollection.length === 0 ? (
          <div className="notice collection-empty">
            <h2>Ничего не найдено</h2>
            <p>Измените запрос или сбросьте часть параметров. Поиск проверяет название, бренд, артикул и группу товара.</p>
            <Link className="btn btn-primary" href={basePath}>Сбросить поиск и фильтры</Link>
          </div>
        ) : view === 'list' ? (
          <div className="product-rows" role="list">
            {visibleProducts.map((product) => (
              <Link key={`${product.categorySlug}/${product.slug}`} className="product-row" href={`/catalog/${product.categorySlug}/${product.slug}`} role="listitem">
                <span className="product-row-brand">{product.brandName}</span>
                <span className="product-row-main">
                  <strong>{product.name}</strong>
                  <small>{getProductGroupLabel(product) ?? getProductCardDescription(product)}</small>
                </span>
                <span className="product-row-sku">{product.sku || product.vendorCode || 'артикул уточняется'}</span>
                <span className="product-row-facts">{getProductDistinctionFacts(product, 4).join(' · ')}</span>
                <span className="product-row-price">
                  <span>{formatProductPrice(product)}</span>
                  <ProductAvailabilityText product={product} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="product-list-grid product-list-grid-with-images">
            {visibleProducts.map((product) => (
              <Link
                key={`${product.categorySlug}/${product.slug}`}
                className="product-list-card product-list-card-with-image"
                href={`/catalog/${product.categorySlug}/${product.slug}`}
              >
                <ProductImage
                  src={getProductImage(product, 'card')}
                  alt={product.name}
                  logoSrc={product.logo}
                  brand={product.brandName}
                  hideBrandLogo={product.hideBrandLogo}
                  compact
                />
                <span className="brand-line">{product.brandName}</span>
                <h3>{product.name}</h3>
                <p>{getProductCardDescription(product)}</p>
                <ul className="badges">
                  {product.sku ? <li className="badge">{product.sku}</li> : null}
                  <li className="badge price-badge">{formatProductPrice(product)}</li>
                  <ProductAvailabilityBadge product={product} />
                  {getProductDistinctionFacts(product, 2).map((fact) => <li className="badge" key={fact}>{fact}</li>)}
                </ul>
              </Link>
            ))}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="catalog-pagination" aria-label="Страницы каталога">
            {currentPage > 1 ? <Link rel="prev" href={buildCollectionHref(basePath, selected, search, view, sort, { page: currentPage - 1 })}>Назад</Link> : null}
            {paginationPages.map((page, index) => (
              <span className="catalog-pagination-item" key={page}>
                {index > 0 && page - paginationPages[index - 1] > 1 ? <span className="catalog-pagination-gap" aria-hidden="true">…</span> : null}
                <Link
                  className={page === currentPage ? 'is-active' : ''}
                  href={buildCollectionHref(basePath, selected, search, view, sort, { page })}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Link>
              </span>
            ))}
            {currentPage < pageCount ? <Link rel="next" href={buildCollectionHref(basePath, selected, search, view, sort, { page: currentPage + 1 })}>Вперёд</Link> : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
