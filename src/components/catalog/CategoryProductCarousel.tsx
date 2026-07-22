'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';

export function CategoryProductCarousel({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const activeProduct = products[activeIndex] ?? products[0];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setPrefersReducedMotion(media.matches);
    const syncDocumentVisibility = () => setIsDocumentVisible(!document.hidden);
    syncMotionPreference();
    syncDocumentVisibility();
    media.addEventListener('change', syncMotionPreference);
    document.addEventListener('visibilitychange', syncDocumentVisibility);
    return () => {
      media.removeEventListener('change', syncMotionPreference);
      document.removeEventListener('visibilitychange', syncDocumentVisibility);
    };
  }, []);

  useEffect(() => {
    const shouldRun = products.length > 1
      && !isPaused
      && !isHovering
      && !hasFocusWithin
      && !prefersReducedMotion
      && isDocumentVisible;
    if (!shouldRun) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, hasFocusWithin, isDocumentVisible, isHovering, isPaused, prefersReducedMotion, products.length]);

  if (!activeProduct) return null;

  const showPrevious = () => setActiveIndex((current) => (current - 1 + products.length) % products.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % products.length);

  return (
    <section
      className="category-product-carousel"
      aria-label="Рекомендуемые товары раздела"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={() => setHasFocusWithin(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setHasFocusWithin(false);
        }
      }}
    >
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
      <div className="category-carousel-copy" aria-live={isPaused || hasFocusWithin ? 'polite' : 'off'}>
        <span className="category-carousel-counter">Рекомендуемые товары · {activeIndex + 1} из {products.length}</span>
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
        <div className="category-carousel-actions">
          <button type="button" onClick={() => setIsPaused((current) => !current)} aria-pressed={isPaused}>
            {isPaused ? 'Продолжить' : 'Пауза'}
          </button>
          <button type="button" onClick={showNext} aria-label="Следующий товар">Далее</button>
        </div>
      </div>
    </section>
  );
}
