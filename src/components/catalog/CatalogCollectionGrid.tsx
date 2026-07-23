import Link from 'next/link';
import { ProductAvailabilityBadge } from '@/components/product/ProductAvailability';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';
import { formatProductPrice } from '@/lib/catalog/pricing';
import { getProductImage } from '@/lib/catalog/product-images';
import { getProductDistinctionFacts } from '@/lib/catalog/specs';
import { getProductCardDescription } from '@/lib/seo/product';

const productsPerPage = 60;

function pageHref(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

export function CatalogCollectionGrid({
  products,
  basePath,
  requestedPage,
  title = 'Товары',
}: {
  products: Product[];
  basePath: string;
  requestedPage: number;
  title?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(products.length / productsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), pageCount);
  const startIndex = (currentPage - 1) * productsPerPage;
  const visibleProducts = products.slice(startIndex, startIndex + productsPerPage);
  const paginationPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            <p>{products.length.toLocaleString('ru-RU')} позиций. Цену и возможность отгрузки подтверждает менеджер.</p>
          </div>
          <p className="meta">
            Показаны позиции {(startIndex + 1).toLocaleString('ru-RU')}–{(startIndex + visibleProducts.length).toLocaleString('ru-RU')}.
          </p>
        </div>
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
        {pageCount > 1 ? (
          <nav className="catalog-pagination" aria-label="Страницы каталога">
            {currentPage > 1 ? <Link rel="prev" href={pageHref(basePath, currentPage - 1)}>Назад</Link> : null}
            {paginationPages.map((page, index) => (
              <span className="catalog-pagination-item" key={page}>
                {index > 0 && page - paginationPages[index - 1] > 1 ? <span className="catalog-pagination-gap" aria-hidden="true">…</span> : null}
                <Link className={page === currentPage ? 'is-active' : ''} href={pageHref(basePath, page)} aria-current={page === currentPage ? 'page' : undefined}>
                  {page}
                </Link>
              </span>
            ))}
            {currentPage < pageCount ? <Link rel="next" href={pageHref(basePath, currentPage + 1)}>Вперёд</Link> : null}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
