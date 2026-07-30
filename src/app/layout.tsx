import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ScrollEnhancements } from '@/components/layout/ScrollEnhancements';
import { MascotTrail } from '@/components/layout/MascotTrail';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { StoreLogo } from '@/components/layout/StoreLogo';
import { FooterContacts } from '@/components/layout/FooterContacts';
import { StaticImage } from '@/components/media/StaticImage';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import { JsonLd } from '@/components/seo/JsonLd';
import { getCompanyProfile } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/jsonld';
import { getCspNonce } from '@/lib/security/nonce';
import './globals.css';

export const metadata: Metadata = buildMetadata({
  title: 'Сантехникъ — инженерная сантехника и отопление',
  description: 'Магазин сантехники и инженерных комплектующих в Саратове: каталог товаров, телефон, адрес и контакты.',
  path: '/',
});

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#020618',
};

const themeBootScript = `
try {
  var savedTheme = window.localStorage.getItem('pumbum-theme');
  var theme = savedTheme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
} catch (error) {
  document.documentElement.dataset.theme = 'dark';
}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = await getCspNonce();
  const company = getCompanyProfile();
  const globalJsonLd = [organizationJsonLd(company), localBusinessJsonLd(company), websiteJsonLd()];

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <JsonLd data={globalJsonLd} nonce={nonce} />
        <YandexMetrika nonce={nonce} />
        <div className="page-shell">
          <div className="ambient ambient-left" aria-hidden="true" />
          <div className="ambient ambient-right" aria-hidden="true" />
          <SiteHeader phone={company.phone} />
          <main className="main">
            {children}
            <MascotTrail />
          </main>
          <ScrollEnhancements />
          <footer className="footer">
            <div className="footer-mascot" aria-hidden="true">
              <StaticImage src="/images/mascots/krestovich-footer-seated.webp" alt="" width={1254} height={1254} />
            </div>
            <div className="container footer-grid">
              <div className="footer-brand">
                <Link href="/" aria-label="На главную Сантехникъ"><StoreLogo compact /></Link>
                <p>Магазин сантехники, отопления, труб, фитингов и комплектующих в Саратове.</p>
              </div>
              <div>
                <h3>Контакты</h3>
                <FooterContacts
                  phone={company.phone}
                  email={company.email}
                  address={`${company.address.addressLocality}, ${company.address.streetAddress}`}
                  mapHref={company.sameAs.find((url) => url.includes('yandex.'))}
                />
              </div>
              <div>
                <h3>Магазин</h3>
                <p>Ежедневно 08:00-19:00. Позвоните для консультации, напишите на электронную почту или приезжайте в магазин.</p>
              </div>
              <div>
                <h3>Навигация</h3>
                <nav className="footer-nav" aria-label="Навигация в подвале">
                  <Link href="/catalog">Каталог</Link>
                  <Link href="/catalog/proizvoditeli">Производители</Link>
                  <Link href="/catalog/po-zadache">Подбор по задаче</Link>
                  <Link href="/delivery">Доставка</Link>
                  <Link href="/contacts">Контакты</Link>
                  <Link href="/privacy">Обработка данных</Link>
                </nav>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
