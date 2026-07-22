'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';

export function CategoryProductCarousel({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProduct = products[activeIndex] ?? products[0];
  if (!activeProduct) return null;

  const showPrevious = () => setActiveIndex((current) => (current - 1 + products.length) % products.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % products.length);

  return (
    <section className="category-product-carousel" aria-label="Основное оборудование раздела">
      <div className="category-carousel-image">
        <ProductImage
          src={activeProduct.image}
          alt={activeProduct.name}
          logoSrc={activeProduct.logo}
          brand={activeProduct.brandName}
          hideBrandLogo={activeProduct.hideBrandLogo}
          priority
        />
      </div>
      <div className="category-carousel-copy" aria-live="polite">
        <span className="category-carousel-counter">Основное оборудование · {activeIndex + 1} из {products.length}</span>
        <h2>{activeProduct.name}</h2>
        <p>{activeProduct.specs['Подраздел'] || activeProduct.purpose}</p>
        <Link href={`/catalog/${activeProduct.categorySlug}/${activeProduct.slug}`}>Открыть товар</Link>
      </div>
      <div className="category-carousel-controls">
        <button type="button" onClick={showPrevious} aria-label="Предыдущий товар">Назад</button>
        <div className="category-carousel-dots" aria-label="Выбор товара">
          {products.map((product, index) => (
            <button
              key={product.slug}
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать товар ${index + 1}: ${product.name}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={showNext} aria-label="Следующий товар">Далее</button>
      </div>
    </section>
  );
}
