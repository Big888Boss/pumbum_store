'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const revealSelector = [
  '.section > .container',
  '.cta-panel',
  '.category-card',
  '.product-list-card',
  '.product-row',
  '.manufacturer-card',
  '.contact-card',
  '.mini-product-card',
  '.category-product-carousel',
].join(',');

const revealCardSelector = [
  '.category-card',
  '.product-list-card',
  '.product-row',
  '.manufacturer-card',
  '.contact-card',
  '.mini-product-card',
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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.08,
    });

    const registered = new WeakSet<HTMLElement>();
    let revealIndex = 0;
    const registerElement = (element: HTMLElement) => {
      if (registered.has(element)) return;
      registered.add(element);
      element.classList.add('scroll-reveal');
      if (element.matches(revealCardSelector)) element.classList.add('scroll-reveal-card');
      element.classList.add(`scroll-reveal-delay-${Math.min(revealIndex % 5, 4)}`);
      revealIndex += 1;
      observer.observe(element);
    };
    const registerTree = (root: ParentNode | HTMLElement) => {
      if (root instanceof HTMLElement && root.matches(revealSelector)) registerElement(root);
      root.querySelectorAll<HTMLElement>(revealSelector).forEach(registerElement);
    };

    registerTree(document);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) registerTree(node);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
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
