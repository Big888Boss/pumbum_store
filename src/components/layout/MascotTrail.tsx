'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { StaticImage } from '@/components/media/StaticImage';
import { CATEGORY_MASCOTS, GENERAL_MASCOTS, type MascotAsset } from '@/lib/mascots';

const primaryMascotRoutes = new Set([
  '/',
  '/about',
  '/catalog',
  '/catalog/po-zadache',
  '/catalog/proizvoditeli',
  '/contacts',
  '/delivery',
  '/privacy',
  '/search',
]);

const routeSets: Record<string, MascotAsset[]> = {
  '/': [GENERAL_MASCOTS[0], GENERAL_MASCOTS[1]],
  '/catalog': [GENERAL_MASCOTS[2], GENERAL_MASCOTS[3]],
  '/catalog/proizvoditeli': [GENERAL_MASCOTS[4], GENERAL_MASCOTS[5]],
  '/catalog/po-zadache': [GENERAL_MASCOTS[0], GENERAL_MASCOTS[2]],
  '/search': [GENERAL_MASCOTS[3], GENERAL_MASCOTS[5]],
  '/delivery': [GENERAL_MASCOTS[0], GENERAL_MASCOTS[4]],
  '/about': [GENERAL_MASCOTS[1], GENERAL_MASCOTS[2]],
  '/contacts': [GENERAL_MASCOTS[0], GENERAL_MASCOTS[3]],
  '/privacy': [GENERAL_MASCOTS[1], GENERAL_MASCOTS[5]],
};

function categoryFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'catalog' || !CATEGORY_MASCOTS[segments[1]]) return undefined;
  return segments[1];
}

function hasCategoryRunner(pathname: string, categorySlug: string | undefined): boolean {
  if (!categorySlug) return false;
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 2 || segments[2] === 'podrazdel';
}

function MascotCompanion({ mascot, index }: { mascot: MascotAsset; index: number }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(Boolean(imageRef.current?.complete));
  }, [mascot.src]);

  return (
    <div className={`mascot-companion mascot-companion-${index + 1}`}>
      <StaticImage
        ref={imageRef}
        className={`mascot-companion-image${loaded ? ' is-loaded' : ''}`}
        src={mascot.src}
        alt=""
        width={420}
        height={420}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

export function MascotTrail() {
  const pathname = usePathname();
  const categorySlug = categoryFromPath(pathname);
  const categoryMascot = categorySlug ? CATEGORY_MASCOTS[categorySlug] : undefined;
  const supports = routeSets[pathname] ?? GENERAL_MASCOTS;
  const shouldRenderThree = !primaryMascotRoutes.has(pathname) && !hasCategoryRunner(pathname, categorySlug);
  const mascots = categoryMascot
    ? [supports[0], supports[1], categoryMascot]
    : supports;
  const visibleMascots = mascots.filter(Boolean).slice(0, shouldRenderThree ? 3 : 2);

  return (
    <div className="mascot-trail" aria-hidden="true">
      {visibleMascots.map((mascot, index) => (
        <MascotCompanion mascot={mascot} index={index} key={`${pathname}-${mascot.src}-${index}`} />
      ))}
    </div>
  );
}
