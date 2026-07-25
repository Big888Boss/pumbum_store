'use client';

import { useState } from 'react';
import { BrandLogoOverlay } from '@/components/brand/BrandLogoOverlay';
import { StaticImage } from '@/components/media/StaticImage';
import { ProductTypeIcon } from '@/components/product/ProductTypeIcon';

export function ProductImage({ src, alt, logoSrc, brand, priority = false, hideBrandLogo = false, compact = false }: { src: string; alt: string; logoSrc?: string; brand?: string; priority?: boolean; hideBrandLogo?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const isPlaceholder = failed || src.includes('/images/generated-placeholders/');
  const showBrandLogo = Boolean(logoSrc) && !hideBrandLogo;
  const fallbackLogoClassName = logoSrc?.toLowerCase().includes('vivaldo')
    ? 'product-fallback-logo product-fallback-logo-vivaldo'
    : logoSrc?.toLowerCase().includes('/tim.')
      ? 'product-fallback-logo product-fallback-logo-tim'
      : 'product-fallback-logo';

  return (
    <figure className={compact ? 'product-frame product-frame-compact' : 'product-frame'}>
      {isPlaceholder ? (
        <div className="product-fallback" role="img" aria-label={alt}>
          {showBrandLogo ? (
            <StaticImage src={logoSrc as string} alt="" width={180} height={72} className={fallbackLogoClassName} />
          ) : (
            <ProductTypeIcon text={alt} compact={compact} />
          )}
        </div>
      ) : (
        <StaticImage src={src} alt={alt} width={960} height={720} className="product-photo" priority={priority} onError={() => setFailed(true)} />
      )}
      {!isPlaceholder && !hideBrandLogo && logoSrc ? <BrandLogoOverlay src={logoSrc} alt={`${brand ?? 'brand'} logo`} /> : null}
    </figure>
  );
}
