'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MascotFigure } from '@/components/layout/MascotFigure';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';
import type { MascotAsset } from '@/lib/mascots';

const AUTOPLAY_DELAY_MS = 2400;

export function CategoryProductCarousel({
  products,
  groupLabels,
  mascot,
}: {
  products: Product[];
  groupLabels?: string[];
  mascot?: MascotAsset;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const activeProduct = products[activeIndex] ?? products[0];

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + products.length) % products.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % products.length);
  };

  useEffect(() => {
    const nextProduct = products[(activeIndex + 1) % products.length];
    if (!nextProduct || nextProduct.slug === activeProduct?.slug) return undefined;
    const timer = window.setTimeout(() => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = nextProduct.image;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeIndex, activeProduct?.slug, products]);

  useEffect(() => {
    const syncDocumentVisibility = () => setIsDocumentVisible(!document.hidden);
    syncDocumentVisibility();
    document.addEventListener('visibilitychange', syncDocumentVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncDocumentVisibility);
    };
  }, []);

  useEffect(() => {
    const shouldRun = products.length > 1
      && !isHovered
      && isDocumentVisible;
    if (!shouldRun) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isDocumentVisible, isHovered, products.length]);

  if (!activeProduct) return null;

  return (
    <section
      className={`category-product-carousel${mascot ? ' category-product-carousel-has-mascot' : ''}`}
      aria-label="Рекомендуемые товары раздела"
      data-carousel-size={products.length}
      data-carousel-groups={groupLabels?.join('|')}
      aria-roledescription="карусель"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {mascot ? <MascotFigure mascot={mascot} placement="peek" className="mascot-figure-category" priority /> : null}
      <div className="category-carousel-image" key={`${activeProduct.slug}-image`}>
        <ProductImage
          src={activeProduct.image}
          alt={activeProduct.name}
          logoSrc={activeProduct.logo}
          brand={activeProduct.brandName}
          hideBrandLogo={activeProduct.hideBrandLogo}
          priority
        />
      </div>
      <div
        className="category-carousel-copy"
        key={`${activeProduct.slug}-copy`}
        aria-live="off"
      >
        <span className="category-carousel-counter">Рекомендуемые товары · {activeIndex + 1} из {products.length}</span>
        <h2>{activeProduct.name}</h2>
        <p>{groupLabels?.[activeIndex] || activeProduct.purpose}</p>
        <Link href={`/catalog/${activeProduct.categorySlug}/${activeProduct.slug}`}>Открыть товар</Link>
      </div>
      <div className="category-carousel-controls">
        <button
          className="category-carousel-arrow"
          type="button"
          onClick={showPrevious}
          aria-label="Предыдущий товар"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="category-carousel-dots" aria-label="Выбор товара">
          {products.map((product, index) => (
            <button
              key={product.slug}
              type="button"
              className={`category-carousel-dot${index === activeIndex ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Показать товар ${index + 1}: ${product.name}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
        <button
          className="category-carousel-arrow"
          type="button"
          onClick={showNext}
          aria-label="Следующий товар"
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
