'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductImage } from '@/components/product/ProductImage';
import type { Product } from '@/entities/product/model';

const AUTOPLAY_DELAY_MS = 5000;

export function CategoryProductCarousel({
  products,
  groupLabels,
}: {
  products: Product[];
  groupLabels?: string[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const activeProduct = products[activeIndex] ?? products[0];

  useEffect(() => {
    products.slice(1).forEach((product) => {
      const image = new Image();
      image.src = product.image;
    });
  }, [products]);

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
      && !hasFocusWithin
      && !prefersReducedMotion
      && isDocumentVisible;
    if (!shouldRun) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, hasFocusWithin, isDocumentVisible, isPaused, prefersReducedMotion, products.length]);

  if (!activeProduct) return null;

  return (
    <section
      className="category-product-carousel"
      aria-label="Рекомендуемые товары раздела"
      data-carousel-size={products.length}
      data-carousel-groups={groupLabels?.join('|')}
      data-carousel-autoplay-ms={AUTOPLAY_DELAY_MS}
      onFocusCapture={() => setHasFocusWithin(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setHasFocusWithin(false);
        }
      }}
    >
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
        aria-live={isPaused || hasFocusWithin ? 'polite' : 'off'}
      >
        <span className="category-carousel-counter">Рекомендуемые товары · {activeIndex + 1} из {products.length}</span>
        <h2>{activeProduct.name}</h2>
        <p>{groupLabels?.[activeIndex] || activeProduct.purpose}</p>
        <Link href={`/catalog/${activeProduct.categorySlug}/${activeProduct.slug}`}>Открыть товар</Link>
      </div>
      <div className="category-carousel-controls">
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
          className="visually-hidden"
          type="button"
          onClick={() => setIsPaused((current) => !current)}
          aria-pressed={isPaused}
        >
          {isPaused ? 'Продолжить автоматическую прокрутку' : 'Остановить автоматическую прокрутку'}
        </button>
      </div>
    </section>
  );
}
