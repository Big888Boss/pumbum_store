import Link from 'next/link';

const tabs = [
  { href: '/about', label: 'О магазине', key: 'about' },
  { href: '/delivery', label: 'Доставка', key: 'delivery' },
  { href: '/contacts', label: 'Контакты', key: 'contacts' },
] as const;

export function InfoTabs({ active }: { active: (typeof tabs)[number]['key'] }) {
  return (
    <nav className="info-tabs" aria-label="Информация для покупателей">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          className={tab.key === active ? 'is-active' : ''}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
