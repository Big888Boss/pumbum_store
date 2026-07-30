'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StaticImage } from '@/components/media/StaticImage';
import { getCategoryMascot } from '@/lib/mascots';

export function CategoryMascotRunner({ categorySlug }: { categorySlug: string }) {
  const mascot = getCategoryMascot(categorySlug);
  const imageRef = useRef<HTMLImageElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!mascot) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const resolveHost = () => {
      if (cancelled) return;
      const nextHost = document.querySelector<HTMLElement>('#catalog-products .product-list-card-with-image')
        ?? document.querySelector<HTMLElement>('#catalog-products .product-row')
        ?? document.querySelector<HTMLElement>('#catalog-products .filter-panel');
      if (!nextHost) {
        retryTimer = setTimeout(resolveHost, 180);
        return;
      }
      nextHost.classList.add('category-mascot-host');
      setHost(nextHost);
    };
    const frame = requestAnimationFrame(() => requestAnimationFrame(resolveHost));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (retryTimer) clearTimeout(retryTimer);
      setHost((current) => {
        current?.classList.remove('category-mascot-host');
        return null;
      });
    };
  }, [mascot]);

  useEffect(() => {
    if (!host || !mascot) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setActive(true);
      observer.disconnect();
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.35 });
    observer.observe(host);
    return () => observer.disconnect();
  }, [host, mascot]);

  if (!mascot || !host) return null;

  return createPortal(
    <div className={`category-mascot-runner${active ? ' is-active' : ''}`} aria-hidden="true">
      <StaticImage ref={imageRef} src={mascot.src} alt="" width={720} height={720} priority />
    </div>,
    host,
  );
}
