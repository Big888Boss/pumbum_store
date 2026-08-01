'use client';

import Link from 'next/link';
import { Menu, Phone } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { MetrikaGoalAnchor } from '@/components/analytics/MetrikaEvents';
import { StoreLogo } from '@/components/layout/StoreLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { METRIKA_GOALS } from '@/lib/analytics/metrika';

type SiteHeaderProps = {
  phone: string;
};

const navigation = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/catalog/proizvoditeli', label: 'Производители' },
  { href: '/search', label: 'Поиск' },
  { href: '/delivery', label: 'Доставка' },
  { href: '/about', label: 'О компании' },
  { href: '/contacts', label: 'Контакты' },
] as const;

function HeaderNavigation({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return (
    <nav className={className} aria-label="Основная навигация">
      {navigation.map((item) => <Link href={item.href} key={item.href} onClick={onNavigate}>{item.label}</Link>)}
    </nav>
  );
}

function HeaderPhone({ phone, location, className }: { phone: string; location: string; className: string }) {
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
  return (
    <MetrikaGoalAnchor
      className={className}
      href={phoneHref}
      goal={METRIKA_GOALS.phoneClick}
      goalParams={{ location }}
    >
      <Phone aria-hidden="true" />
      <strong>{phone}</strong>
    </MetrikaGoalAnchor>
  );
}

export function SiteHeader({ phone }: SiteHeaderProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = useCallback(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMenu]);

  return (
    <header className="header">
      <div className="container header-row">
        <Link href="/" className="logo" aria-label="На главную Сантехникъ">
          <StoreLogo />
        </Link>

        <HeaderNavigation className="nav nav-desktop" />
        <div className="header-actions">
          <ThemeToggle />
          <HeaderPhone phone={phone} location="header" className="phone-link phone-link-desktop" />
          <details className="mobile-menu" ref={menuRef}>
            <summary className="mobile-menu-toggle"><Menu aria-hidden="true" /><span>Меню</span></summary>
            <div className="mobile-menu-panel">
              <HeaderNavigation className="mobile-menu-nav" onNavigate={closeMenu} />
              <HeaderPhone phone={phone} location="mobile_menu" className="phone-link mobile-menu-phone" />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
