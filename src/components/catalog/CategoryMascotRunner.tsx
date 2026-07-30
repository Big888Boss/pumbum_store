'use client';

import { useEffect, useRef, useState } from 'react';
import { StaticImage } from '@/components/media/StaticImage';
import { getCategoryMascot } from '@/lib/mascots';

export function CategoryMascotRunner({ categorySlug }: { categorySlug: string }) {
  const mascot = getCategoryMascot(categorySlug);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !mascot) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setActive(true);
      observer.disconnect();
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.35 });
    observer.observe(track);
    return () => observer.disconnect();
  }, [mascot]);

  if (!mascot) return null;

  return (
    <div ref={trackRef} className={`category-mascot-track${active ? ' is-active' : ''}`} aria-hidden="true">
      <div className="category-mascot-runner">
        <StaticImage src={mascot.src} alt="" width={420} height={420} priority />
      </div>
    </div>
  );
}
