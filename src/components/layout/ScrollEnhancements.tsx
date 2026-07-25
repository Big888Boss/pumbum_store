'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const revealSelector = [
  '.section > .container',
  '.manufacturer-card',
  '.product-list-card',
  '.cta-panel',
].join(',');

export function ScrollEnhancements() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const syncBackToTop = () => setShowBackToTop(window.scrollY > 720);
    syncBackToTop();
    window.addEventListener('scroll', syncBackToTop, { passive: true });

    const elements = [...document.querySelectorAll<HTMLElement>(revealSelector)];
    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-revealed'));
      return () => window.removeEventListener('scroll', syncBackToTop);
    }

    elements.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.classList.add(`scroll-reveal-delay-${Math.min(index % 5, 4)}`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    });

    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', syncBackToTop);
    };
  }, []);

  return (
    <button
      className={`back-to-top${showBackToTop ? ' is-visible' : ''}`}
      type="button"
      aria-label="Вернуться в начало страницы"
      title="Наверх"
      onClick={() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}
