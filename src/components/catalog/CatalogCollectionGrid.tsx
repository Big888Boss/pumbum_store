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
import { searchProductsInCollection } from '@/lib/catalog/search';
import { getProductDistinctionFacts } from '@/lib/catalog/specs';
import { getProductCardDescription } from '@/lib/seo/product';

const productsPerPage = 60;
type CatalogViewMode = 'grid' | 'list';
type CatalogSortMode = 'default' | 'price_asc' | 'price_desc';
type Query = Record<string, string | string[] | undefined>;
const priceAscendingCache = new WeakMap<Product[], Product[]>();
const priceDescendingCache = new WeakMap<Product[], Product[]>();
const productGroupsCache = new WeakMap<Product[], Array<[string, number]>>();

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePage(query: Query, fallback = 1): number {
  const page = Number.parseInt(firstValue(query.page) || String(fallback), 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function parseView(query: Query): CatalogViewMode {
  return firstValue(query.view) === 'list' ? 'list' : 'grid';
}

function parseSort(query: Query): CatalogSortMode {
  const sort = firstValue(query.sort);
  return sort === 'price_asc' || sort === 'price_desc' ? sort : 'default';
}

function parseSearchQuery(query: Query): string {
  return firstValue(query.q).replace(/\s+/g, ' ').trim().slice(0, 100);
}

function sortProducts(products: Product[], sort: CatalogSortMode): Product[] {
  if (sort === 'default') return products;
  const cache = sort === 'price_asc' ? priceAscendingCache : priceDescendingCache;
  const cached = cache.get(products);
  if (cached) return cached;
  const direction = sort === 'price_asc' ? 1 : -1;
  const amount = (product: Product): number | undefined => {
    const value = product.price?.amount;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const sorted = [...products].sort((a, b) => {
    const priceA = amount(a);
    const priceB = amount(b);
    if (priceA === undefined && priceB === undefined) return 0;
    if (priceA === undefined) return 1;
    if (priceB === undefined) return -1;
    return (priceA - priceB) * direction;
  });
  cache.set(products, sorted);
  return sorted;
}

function getCollectionGroups(products: Product[]): Array<[string, number]> {
  const cached = productGroupsCache.get(products);
  if (cached) return cached;
  const counts = new Map<string, number>();
  for (const product of products) {
    const group = getProductGroupLabel(product);
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  const groups = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, 14);
  productGroupsCache.set(products, groups);
  return groups;
}

function buildHref(
  basePath: string,
  selected: CatalogFilterSelection,
  queryText: string,
  viewMode: CatalogViewMode,
  sort: CatalogSortMode,
  options: {
    key?: CatalogFilterKey;
    value?: string;
    page?: number;
    queryText?: string;
    viewMode?: CatalogViewMode;
    sort?: CatalogSortMode;
  } = {},
): string {
  const params = new URLSearchParams();
  const nextSelected = { ...selected };
  if (options.key) {
    if (options.value && selected[options.key] !== options.value) nextSelected[options.key] = options.value;
    else delete nextSelected[options.key];
  }
  for (const [key, value] of Object.entries(nextSelected)) {
    if (value) params.set(key, value);
  }
  const nextQuery = options.queryText ?? queryText;
  const nextView = options.viewMode ?? viewMode;
  const nextSort = options.sort ?? sort;
  if (nextQuery) params.set('q', nextQuery);
  if (nextView === 'list') params.set('view', 'list');
  if (nextSort !== 'default') params.set('sort', nextSort);
  if ((options.page ?? 1) > 1) params.set('page', String(options.page));
  const serialized = params.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

function formatPositions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'позиция' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'позиции' : 'позиций';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

function HiddenState({
  selected,
  queryText,
  viewMode,
  sort,
  exclude,
}: {
  selected: CatalogFilterSelection;
  queryText: string;
  viewMode: CatalogViewMode;
  sort: CatalogSortMode;
  exclude?: CatalogFilterKey;
}) {
  return (
    <>
      {Object.entries(selected).map(([key, value]) => (
        value && key !== exclude ? <input key={key} type="hidden" name={key} value={value} /> : null
      ))}
      {queryText ? <input type="hidden" name="q" value={queryText} /> : null}
      {viewMode === 'list' ? <input type="hidden" name="view" value="list" /> : null}
      {sort !== 'default' ? <input type="hidden" name="sort" value={sort} /> : null}
    </>
  );
}

export function hasCatalogCollectionState(query: Query): boolean {
  return (
    parsePage(query) > 1
    || parseView(query) !== 'grid'
    || parseSort(query) !== 'default'
    || Boolean(parseSearchQuery(query))
    || activeCatalogFilterCount(parseCatalogFilterSelection(query)) > 0
  );
}

export function CatalogCollectionGrid({
  products,
  basePath,
  requestedPage = 1,
  query = {},
  title = 'Товары',
  hideBrandFilter = false,
}: {
  products: Product[];
  basePath: string;
  requestedPage?: number;
  query?: Query;
  title?: string;
  hideBrandFilter?: boolean;
}) {
  const selected = parseCatalogFilterSelection(query);
  const queryText = parseSearchQuery(query);
  const viewMode = parseView(query);
  const sort = parseSort(query);
  const searchedProducts = searchProductsInCollection(products, queryText);
  const filteredProducts = applyCatalogFilters(searchedProducts, selected);
  const visibleCollection = sortProducts(filteredProducts, sort);
  const filters = buildCatalogFilters(searchedProducts, selected)
    .filter((filter) => !(hideBrandFilter && filter.key === 'brand'));
  const activeCount = activeCatalogFilterCount(selected);
  const pageCount = Math.max(1, Math.ceil(visibleCollection.length / productsPerPage));
  const currentPage = Math.min(Math.max(parsePage(query, requestedPage), 1), pageCount);
  const startIndex = (currentPage - 1) * productsPerPage;
  const visibleProducts = visibleCollection.slice(startIndex, startIndex + productsPerPage);
  const visibleStart = visibleCollection.length > 0 ? startIndex + 1 : 0;
  const visibleEnd = startIndex + visibleProducts.length;
  const paginationPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const groups = getCollectionGroups(products);

  return (
    <section className="section">
      <div className="container" data-catalog-collection>
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            <p>
              {formatPositions(visibleCollection.length)}
              {visibleCollection.length !== products.length ? ` из ${formatPositions(products.length)}` : ''}.
              {' '}Цену и возможность отгрузки подтверждает менеджер.
            </p>
          </div>
          {visibleCollection.length > 0 ? (
            <p className="meta">
              Показаны позиции {visibleStart.toLocaleString('ru-RU')}–{visibleEnd.toLocaleString('ru-RU')} из {visibleCollection.length.toLocaleString('ru-RU')}.
            </p>
          ) : null}
        </div>

        {groups.length > 0 ? (
          <nav className="catalog-groups" aria-label="Группы товаров">
            {groups.map(([group, count]) => (
              <Link
                key={group}
                className={selected.group === group ? 'is-active' : ''}
                href={buildHref(basePath, selected, queryText, viewMode, sort, { key: 'group', value: group })}
              >
                {group} <strong>{count.toLocaleString('ru-RU')}</strong>
              </Link>
            ))}
          </nav>
        ) : null}

        <form className="catalog-collection-search" action={basePath}>
          <HiddenState selected={selected} queryText="" viewMode={viewMode} sort={sort} />
          <label htmlFor="collection-search">Поиск внутри этой подборки</label>
          <div>
            <input id="collection-search" type="search" name="q" defaultValue={queryText} maxLength={100} placeholder="Название или артикул" />
            <button className="btn btn-primary" type="submit">Найти</button>
          </div>
        </form>

        <div className="catalog-toolbar">
          {filters.length > 0 ? (
            <details className="filter-drawer" open={activeCount > 0}>
              <summary className="btn btn-secondary filter-toggle">
                Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}
              </summary>
              <form className="filter-panel" action={basePath}>
                <HiddenState selected={{}} queryText={queryText} viewMode={viewMode} sort={sort} />
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
                  <Link className="btn btn-secondary" href={buildHref(basePath, {}, queryText, viewMode, sort)}>Сбросить фильтры</Link>
                </div>
              </form>
            </details>
          ) : <span />}

          <div className="catalog-view-switcher" aria-label="Сортировка товаров">
            {([
              ['default', 'По порядку'],
              ['price_asc', 'Сначала дешевле'],
              ['price_desc', 'Сначала дороже'],
            ] as Array<[CatalogSortMode, string]>).map(([mode, label]) => (
              <Link
                key={mode}
                className={sort === mode ? 'is-active' : ''}
                href={buildHref(basePath, selected, queryText, viewMode, sort, { sort: mode })}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="catalog-view-switcher" aria-label="Вид каталога">
            <Link
              className={viewMode === 'grid' ? 'is-active' : ''}
              href={buildHref(basePath, selected, queryText, viewMode, sort, { viewMode: 'grid', page: currentPage })}
            >
              Карточки с фото
            </Link>
            <Link
              className={viewMode === 'list' ? 'is-active' : ''}
              href={buildHref(basePath, selected, queryText, viewMode, sort, { viewMode: 'list', page: currentPage })}
            >
              Список без фото
            </Link>
          </div>
        </div>

        {activeCount > 0 || queryText ? (
          <div className="active-filters" aria-label="Выбранные условия">
            {queryText ? (
              <Link href={buildHref(basePath, selected, queryText, viewMode, sort, { queryText: '' })}>Поиск: {queryText} ×</Link>
            ) : null}
            {Object.entries(selected).map(([key, value]) => value ? (
              <Link
                key={key}
                href={buildHref(basePath, selected, queryText, viewMode, sort, { key: key as CatalogFilterKey, value })}
              >
                {key === 'price' ? priceRangeLabel(value) : value} ×
              </Link>
            ) : null)}
          </div>
        ) : null}

        {visibleCollection.length === 0 ? (
          <div className="notice">
            <h2>Товары не найдены</h2>
            <p>Измените запрос или сбросьте часть фильтров. В названиях и артикулах поставщиков встречаются разные варианты записи.</p>
            <Link className="btn btn-primary" href={basePath}>Показать все товары</Link>
          </div>
        ) : null}

        {viewMode === 'list' ? (
          <div className="product-rows" role="list">
            {visibleProducts.map((product) => {
              const facts = getProductDistinctionFacts(product, 4);
              return (
                <Link
                  key={`${product.categorySlug}/${product.slug}`}
                  className="product-row"
                  href={`/catalog/${product.categorySlug}/${product.slug}`}
                  role="listitem"
                >
                  <span className="product-row-brand">{product.brandName}</span>
                  <span className="product-row-main">
                    <strong>{product.name}</strong>
                    <small>{getProductGroupLabel(product) ?? getProductCardDescription(product)}</small>
                  </span>
                  <span className="product-row-sku">{product.sku || product.vendorCode || 'артикул уточняется'}</span>
                  <span className="product-row-facts">{facts.join(' · ')}</span>
                  <span className="product-row-price">
                    <span>{formatProductPrice(product)}</span>
                    <ProductAvailabilityText product={product} />
                  </span>
                </Link>
              );
            })}
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
            {currentPage > 1 ? (
              <Link rel="prev" href={buildHref(basePath, selected, queryText, viewMode, sort, { page: currentPage - 1 })}>Назад</Link>
            ) : null}
            {paginationPages.map((page, index) => (
              <span className="catalog-pagination-item" key={page}>
                {index > 0 && page - paginationPages[index - 1] > 1 ? <span className="catalog-pagination-gap" aria-hidden="true">…</span> : null}
                <Link
                  className={page === currentPage ? 'is-active' : ''}
                  href={buildHref(basePath, selected, queryText, viewMode, sort, { page })}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Link>
              </span>
            ))}
            {currentPage < pageCount ? (
              <Link rel="next" href={buildHref(basePath, selected, queryText, viewMode, sort, { page: currentPage + 1 })}>Вперёд</Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
