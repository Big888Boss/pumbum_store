import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import { getCompanyProfile } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonld';
import './globals.css';

export const metadata: Metadata = buildMetadata({
  title: 'Сантехникъ — инженерная сантехника и отопление',
  description: 'Магазин сантехники и инженерных комплектующих в Саратове: каталог товаров, телефон, адрес и контакты.',
  path: '/',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const company = getCompanyProfile();
  const globalJsonLd = [organizationJsonLd(company), localBusinessJsonLd(company), websiteJsonLd()];
  const phoneHref = `tel:${company.phone.replace(/[^\d+]/g, '')}`;

  return (
    <html lang="ru">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(globalJsonLd) }} />
        <YandexMetrika />
        <div className="page-shell">
          <header className="header">
            <div className="container header-row">
              <Link href="/" className="logo" aria-label="На главную Сантехникъ">
                <Image src="/brand-logos/santekhnik-logo.png" alt="Сантехникъ" width={264} height={52} priority />
              </Link>
              <nav className="nav" aria-label="Основная навигация">
                <Link href="/catalog">Каталог</Link>
                <Link href="/catalog/proizvoditeli">Производители</Link>
                <Link href="/search">Поиск</Link>
                <Link href="/delivery">Доставка</Link>
                <Link href="/about">О компании</Link>
                <Link href="/contacts">Контакты</Link>
              </nav>
              <a className="phone-link" href={phoneHref}>
                <span>Телефон магазина</span>
                <strong>{company.phone}</strong>
              </a>
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="container footer-grid">
              <div>
                <h3>Сантехникъ</h3>
                <p>Магазин сантехники, отопления, труб, фитингов и комплектующих в Саратове.</p>
              </div>
              <div>
                <h3>Контакты</h3>
                <p>{company.phone}<br />{company.email}<br />{company.address.addressLocality}, {company.address.streetAddress}</p>
              </div>
              <div>
                <h3>Магазин</h3>
                <p>Ежедневно 08:00-19:00. Можно позвонить, написать или приехать в магазин.</p>
              </div>
              <div>
                <h3>Производители</h3>
                <p><Link href="/catalog/proizvoditeli">Производители и поставщики</Link></p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
