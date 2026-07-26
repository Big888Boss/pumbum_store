import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoTabs } from '@/components/layout/InfoTabs';
import { PageMascot } from '@/components/layout/PageMascot';
import { MetrikaGoalAnchor } from '@/components/analytics/MetrikaEvents';
import { getCompanyProfile, getProductBySlug } from '@/lib/catalog/loaders';
import { METRIKA_GOALS } from '@/lib/analytics/metrika';
import { buildMetadata } from '@/lib/seo/metadata';

type PageProps = { searchParams: Promise<{ category?: string; sku?: string; message?: string; sent?: string; error?: string }> };

export const metadata: Metadata = buildMetadata({
  title: 'Контакты — Сантехникъ',
  description: 'Контакты магазина Сантехникъ: телефон, email, адрес, режим работы и карта проезда в Саратове.',
  path: '/contacts',
});

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const company = getCompanyProfile();
  const selectedProduct = params.category && params.sku ? getProductBySlug(params.category, params.sku) : undefined;
  const email = company.email ?? 'Virado@bk.ru';
  const phoneHref = `tel:${company.phone.replace(/[^\d+]/g, '')}`;
  const emailHref = `mailto:${email}`;
  const routeHref = 'https://yandex.ru/maps/?rtext=~51.54513,46.020494&rtt=auto';
  const mapSrc = 'https://yandex.ru/map-widget/v1/?ll=46.020494%2C51.545130&z=16&pt=46.020494%2C51.545130%2Cpm2rdm';

  return (
    <>
      <section className="hero">
        <div className="container hero-grid hero-grid-mascot">
          <div>
            <div className="eyebrow">Контакты</div>
            <h1>Связаться с магазином</h1>
            <p className="lead">Позвоните, напишите на email или приезжайте в магазин на Большой Горной. По артикулу быстрее проверим цену, наличие и совместимые позиции.</p>
            {selectedProduct ? <p className="hero-context">Выбранная позиция: <strong>{selectedProduct.brandName} · {selectedProduct.sku ?? selectedProduct.vendorCode}</strong></p> : null}
            <div className="actions">
              <MetrikaGoalAnchor className="btn btn-primary" href={phoneHref} goal={METRIKA_GOALS.phoneClick} goalParams={{ location: 'contacts_hero' }}>Позвонить</MetrikaGoalAnchor>
              <MetrikaGoalAnchor className="btn btn-secondary" href={emailHref} goal={METRIKA_GOALS.emailClick} goalParams={{ location: 'contacts_hero' }}>Написать на email</MetrikaGoalAnchor>
            </div>
            <InfoTabs active="contacts" />
          </div>
          <PageMascot
            src="/images/mascots/bak-hlopotun-contacts.webp"
            alt="Бак Хлопотун отвечает на звонок"
            label="Бак Хлопотун приглашает связаться с магазином"
            variant="contacts"
          />
        </div>
      </section>
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-card">
            <h2>Контакты</h2>
            <dl className="contact-list">
              <div>
                <dt>Телефон</dt>
                <dd><MetrikaGoalAnchor href={phoneHref} goal={METRIKA_GOALS.phoneClick} goalParams={{ location: 'contacts_details' }}>{company.phone}</MetrikaGoalAnchor></dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd><MetrikaGoalAnchor href={emailHref} goal={METRIKA_GOALS.emailClick} goalParams={{ location: 'contacts_details' }}>{email}</MetrikaGoalAnchor></dd>
              </div>
              <div>
                <dt>Адрес</dt>
                <dd>{company.address.addressLocality}, {company.address.streetAddress}, {company.address.postalCode}</dd>
              </div>
              <div>
                <dt>Режим работы</dt>
                <dd>Ежедневно: 08:00-19:00</dd>
              </div>
            </dl>
            <div className="actions">
              <MetrikaGoalAnchor className="btn btn-primary" href={phoneHref} goal={METRIKA_GOALS.phoneClick} goalParams={{ location: 'contacts_card' }}>Позвонить</MetrikaGoalAnchor>
              <a className="btn btn-secondary" href={routeHref} target="_blank" rel="noreferrer">Построить маршрут</a>
            </div>
          </div>
          <div className="map-card">
            <iframe
              src={mapSrc}
              title="Карта проезда к магазину Сантехникъ"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
