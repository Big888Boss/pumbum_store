'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const routeTargetSelectors: Record<string, string[]> = {
  '/': ['.category-card'],
  '/catalog': ['.category-card'],
  '/catalog/proizvoditeli': ['.manufacturer-card'],
  '/catalog/po-zadache': ['main .grid-3 > .card'],
  '/search': ['.product-list-card', '.search-panel', '.notice'],
  '/delivery': ['.delivery-options > .card', '.delivery-checklist'],
  '/about': ['.about-fact', '.brand-card', '.about-copy'],
  '/contacts': ['.contact-card', '.map-card'],
  '/privacy': ['main .card'],
};

const placements = ['inside', 'ledge', 'peek'] as const;
type MascotPlacement = (typeof placements)[number];

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

function targetSelectorsForPath(pathname: string, categorySlug: string | undefined): string[] {
  if (routeTargetSelectors[pathname]) return routeTargetSelectors[pathname];
  if (categorySlug) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[2] !== 'podrazdel') {
      return ['.pdp-visual-card', 'main .section .card', '.mini-product-card'];
    }
    return ['main .info-card', '.product-list-card:nth-child(n+3)', '.mini-product-card'];
  }
  if (pathname.startsWith('/catalog/proizvoditeli/')) return ['.product-list-card', 'main .info-card'];
  if (pathname.startsWith('/catalog/po-zadache/')) return ['.product-list-card', 'main .info-card'];
  return ['.product-list-card', 'main .card', '.mini-product-card'];
}

function collectTargets(pathname: string, categorySlug: string | undefined): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  for (const selector of targetSelectorsForPath(pathname, categorySlug)) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (!nodes.includes(node) && !node.closest('footer')) nodes.push(node);
    });
  }
  return nodes;
}

function spreadTargets(nodes: HTMLElement[], count: number): HTMLElement[] {
  if (nodes.length === 0 || count === 0) return [];
  if (nodes.length === 1) return Array.from({ length: count }, () => nodes[0]);
  if (count === 2) return [nodes[Math.floor((nodes.length - 1) * 0.28)], nodes[Math.ceil((nodes.length - 1) * 0.76)]];
  return [nodes[0], nodes[Math.floor((nodes.length - 1) / 2)], nodes[nodes.length - 1]].slice(0, count);
}

function MascotCompanion({ mascot, index, placement }: { mascot: MascotAsset; index: number; placement: MascotPlacement }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(Boolean(imageRef.current?.complete));
  }, [mascot.src]);

  return (
    <div className={`mascot-companion mascot-companion-${index + 1} mascot-companion-${placement}`}>
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
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const categorySlug = categoryFromPath(pathname);
  const categoryMascot = categorySlug ? CATEGORY_MASCOTS[categorySlug] : undefined;
  const supports = routeSets[pathname] ?? GENERAL_MASCOTS;
  const shouldRenderThree = !primaryMascotRoutes.has(pathname) && !hasCategoryRunner(pathname, categorySlug);
  const mascots = categoryMascot
    ? [supports[0], supports[1], categoryMascot]
    : supports;
  const visibleMascots = mascots.filter(Boolean).slice(0, shouldRenderThree ? 3 : 2);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const resolve = () => {
      if (cancelled) return;
      const nextTargets = spreadTargets(collectTargets(pathname, categorySlug), visibleMascots.length);
      setTargets(nextTargets);
      if (nextTargets.length < visibleMascots.length) retryTimer = setTimeout(resolve, 180);
    };
    const frame = requestAnimationFrame(() => requestAnimationFrame(resolve));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (retryTimer) clearTimeout(retryTimer);
      setTargets([]);
    };
  }, [categorySlug, pathname, visibleMascots.length]);

  useEffect(() => {
    const classesByTarget = new Map<HTMLElement, string[]>();
    targets.forEach((target, index) => {
      const placement = placements[index % placements.length];
      const classes = ['mascot-card-host', `mascot-card-host-${placement}`];
      target.classList.add(...classes);
      classesByTarget.set(target, [...(classesByTarget.get(target) ?? []), ...classes]);
    });
    return () => classesByTarget.forEach((classes, target) => target.classList.remove(...classes));
  }, [targets]);

  return (
    <div className="mascot-trail" aria-hidden="true">
      {visibleMascots.map((mascot, index) => targets[index] ? createPortal(
        <MascotCompanion mascot={mascot} index={index} placement={placements[index % placements.length]} />,
        targets[index],
        `${pathname}-${mascot.src}-${index}`,
      ) : null)}
    </div>
  );
}
