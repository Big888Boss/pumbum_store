'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BrandLogoOverlay } from '@/components/brand/BrandLogoOverlay';
import { ProductTypeIcon } from '@/components/product/ProductTypeIcon';

export function ProductImage({ src, alt, logoSrc, brand, priority = false, hideBrandLogo = false, compact = false }: { src: string; alt: string; logoSrc?: string; brand?: string; priority?: boolean; hideBrandLogo?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const isPlaceholder = failed || src.includes('/images/generated-placeholders/');
  const showBrandLogo = Boolean(logoSrc) && !hideBrandLogo;

  return (
    <figure className={compact ? 'product-frame product-frame-compact' : 'product-frame'}>
      {isPlaceholder ? (
        <div className="product-fallback" role="img" aria-label={alt}>
          {showBrandLogo ? (
            <Image src={logoSrc as string} alt="" width={180} height={72} className="product-fallback-logo" />
          ) : (
            <ProductTypeIcon text={alt} compact={compact} />
          )}
        </div>
      ) : (
        <Image src={src} alt={alt} width={960} height={720} className="product-photo" priority={priority} onError={() => setFailed(true)} />
      )}
      {!isPlaceholder && !hideBrandLogo && logoSrc ? <BrandLogoOverlay src={logoSrc} alt={`${brand ?? 'brand'} logo`} /> : null}
    </figure>
  );
}
