'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackMetrikaPageview } from '@/lib/analytics/metrika';

export function MetrikaRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>();
  const previousUrl = useRef<string>();

  useEffect(() => {
    const query = searchParams.toString();
    const relativeUrl = `${pathname}${query ? `?${query}` : ''}`;
    const absoluteUrl = new URL(relativeUrl, window.location.origin).toString();
    if (lastTrackedUrl.current === absoluteUrl) return;

    const referer = previousUrl.current ?? document.referrer;
    trackMetrikaPageview(absoluteUrl, {
      title: document.title,
      ...(referer ? { referer } : {}),
    });

    lastTrackedUrl.current = absoluteUrl;
    previousUrl.current = absoluteUrl;
    window.__pumbumLastMetrikaPageview = absoluteUrl;
    window.dispatchEvent(new CustomEvent('pumbum:metrika-pageview', { detail: { url: absoluteUrl } }));
  }, [pathname, searchParams]);

  return null;
}
