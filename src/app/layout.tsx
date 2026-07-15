import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = await getCspNonce();
  const company = getCompanyProfile();
  const globalJsonLd = [organizationJsonLd(company), localBusinessJsonLd(company), websiteJsonLd()];

  return (
    <html lang="ru">
      <body>
        <JsonLd data={globalJsonLd} nonce={nonce} />
        <YandexMetrika nonce={nonce} />
        <div className="page-shell">
          <SiteHeader phone={company.phone} />
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
