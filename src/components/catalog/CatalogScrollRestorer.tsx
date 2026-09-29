'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function CatalogScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (window.location.hash !== '#catalog-products') return;
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById('catalog-products')?.scrollIntoView({ block: 'start' });
      });
    });
    return () => window.cancelAnimationFrame(firstFrame);
  }, [navigationKey]);

  return null;
}
