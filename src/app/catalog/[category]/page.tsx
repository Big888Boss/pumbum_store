import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductImage } from '@/components/product/ProductImage';
import type { Category } from '@/entities/category/model';
import type { Product } from '@/entities/product/model';
import type { CatalogFilterKey, CatalogFilterSelection } from '@/lib/catalog/filters';
import { activeCatalogFilterCount, applyCatalogFilters, buildCatalogFilters, getProductGroupLabel, parseCatalogFilterSelection } from '@/lib/catalog/filters';
import { getAllCategories, getCategoryBySlug, getFeaturedProductByCategory, getProductsByCategory, getRelatedProducts } from '@/lib/catalog/loaders';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getProductImage } from '@/lib/catalog/product-images';
import { getProductDistinctionFacts, getProductKeyFacts } from '@/lib/catalog/specs';
import { categoryJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const visibleProductLimit = 240;
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

function buildCategoryFilterHref(categorySlug: string, selected: CatalogFilterSelection, viewMode: CatalogViewMode, key?: CatalogFilterKey, value?: string): string {
  const params = new URLSearchParams();
  const nextSelected = { ...selected };
  if (key) {
    if (value && selected[key] !== value) nextSelected[key] = value;
    else delete nextSelected[key];
  }

  for (const [entryKey, entryValue] of Object.entries(nextSelected)) {
    if (entryValue) params.set(entryKey, entryValue);
  }
  if (viewMode === 'list') params.set('view', 'list');

  const query = params.toString();
  return query ? `/catalog/${categorySlug}?${query}` : `/catalog/${categorySlug}`;
}

function ViewSwitcher({ categorySlug, selected, viewMode }: { categorySlug: string; selected: CatalogFilterSelection; viewMode: CatalogViewMode }) {
  return (
    <div className="catalog-view-switcher" aria-label="Вид каталога">
      <Link className={viewMode === 'grid' ? 'is-active' : ''} href={buildCategoryFilterHref(categorySlug, selected, 'grid')}>Карточки с фото</Link>
      <Link className={viewMode === 'list' ? 'is-active' : ''} href={buildCategoryFilterHref(categorySlug, selected, 'list')}>Список без фото</Link>
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
          <Link className="btn btn-secondary" href={viewMode === 'list' ? `/catalog/${categorySlug}?view=list` : `/catalog/${categorySlug}`}>Сбросить</Link>
        </div>
      </form>
    </details>
  );
}

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const query = searchParams ? await searchParams : {};
  const hasFilters = activeCatalogFilterCount(parseCatalogFilterSelection(query)) > 0;
  const categoryData = getCategoryBySlug(category);
  if (!categoryData) return {};
  return buildMetadata({
    title: categoryData.title,
    description: categoryData.description,
    path: `/catalog/${categoryData.slug}`,
    noindex: hasFilters,
  });
}

function ProductGrid({ categorySlug, products, baseProducts, selected, viewMode }: { categorySlug: string; products: Product[]; baseProducts: Product[]; selected: CatalogFilterSelection; viewMode: CatalogViewMode }) {
  const visibleProducts = products.slice(0, visibleProductLimit);
  const hiddenCount = Math.max(0, products.length - visibleProducts.length);
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
              {' '}Цены и наличие уточняются у магазина.
            </p>
          </div>
          {hiddenCount > 0 ? <p className="meta">Показаны первые {visibleProductLimit} позиций. Если нужного артикула нет в списке, используйте поиск по каталогу.</p> : null}
        </div>
        {productGroups.length > 0 ? (
          <div className="catalog-groups" aria-label="Популярные группы раздела">
            {productGroups.map(([name, count]) => (
              <Link
                key={name}
                className={selected.group === name ? 'is-active' : ''}
                href={buildCategoryFilterHref(categorySlug, selected, viewMode, 'group', name)}
              >
                {name} <strong>{count.toLocaleString('ru-RU')}</strong>
              </Link>
            ))}
          </div>
        ) : null}
        <div className="catalog-toolbar">
          <FilterPanel categorySlug={categorySlug} products={baseProducts} selected={selected} viewMode={viewMode} />
          <ViewSwitcher categorySlug={categorySlug} selected={selected} viewMode={viewMode} />
        </div>
        {activeCount > 0 ? (
          <div className="active-filters" aria-label="Выбранные фильтры">
            {Object.entries(selected).map(([key, value]) => value ? (
              <Link key={key} href={buildCategoryFilterHref(categorySlug, selected, viewMode, key as CatalogFilterKey, value)}>
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
                    <small>{getProductGroupLabel(item) ?? item.shortDescription}</small>
                  </span>
                  <span className="product-row-sku">{item.sku || item.vendorCode || 'артикул уточняется'}</span>
                  <span className="product-row-facts">{facts.join(' · ')}</span>
                  <span className="product-row-price">{formatProductPrice(item)}</span>
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
                <p>{item.shortDescription}</p>
                <ul className="badges">
                  {item.sku ? <li className="badge">{item.sku}</li> : null}
                  <li className="badge price-badge">{formatProductPrice(item)}</li>
                  {getProductDistinctionFacts(item, 3).map((highlight) => <li className="badge" key={highlight}>{highlight}</li>)}
                </ul>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RadiatorsCategoryView({ category, product, products, related, viewMode }: { category: Category; product: Product; products: Product[]; related: Product[]; viewMode: CatalogViewMode }) {
  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: category.name, path: `/catalog/${category.slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumbs), categoryJsonLd(category)]) }} />
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
              <span>{product.shortDescription}</span>
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
              <p>{product.description}</p>
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
      <ProductGrid categorySlug={category.slug} products={products} baseProducts={products} selected={{}} viewMode={viewMode} />
    </>
  );
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const query = searchParams ? await searchParams : {};
  const selectedFilters = parseCatalogFilterSelection(query);
  const viewMode = parseCatalogViewMode(query);
  const categoryData = getCategoryBySlug(category);
  const categoryProducts = getProductsByCategory(category);
  const filteredProducts = applyCatalogFilters(categoryProducts, selectedFilters);
  const product = getFeaturedProductByCategory(category);
  if (!categoryData || !product) notFound();
  const related = getRelatedProducts(product.categorySlug);

  if (product.categorySlug === 'radiators') {
    return <RadiatorsCategoryView category={categoryData} product={product} products={categoryProducts} related={related} viewMode={viewMode} />;
  }

  const breadcrumbs = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: categoryData.name, path: `/catalog/${categoryData.slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumbs), categoryJsonLd(categoryData)]) }} />
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
            <p>{product.shortDescription}</p>
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
      <ProductGrid categorySlug={categoryData.slug} products={filteredProducts} baseProducts={categoryProducts} selected={selectedFilters} viewMode={viewMode} />

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
