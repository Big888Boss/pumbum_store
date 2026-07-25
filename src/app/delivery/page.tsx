import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Доставка и география — Сантехникъ',
  description: 'Доставка инженерной сантехники и отопительного оборудования: самовывоз, отгрузка на объект и проверка комплектации.',
  path: '/delivery',
});

export default function DeliveryPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Доставка и гео</div>
            <h1>Отгрузка под объект: проверяем состав заказа до доставки</h1>
            <p className="lead">Важно не только привезти товар, но и заранее проверить, что труба, краны, насосы и комплектующие подходят друг к другу.</p>
            <div className="actions"><Link className="btn btn-primary" href="/contacts">Уточнить доставку</Link><Link className="btn btn-secondary" href="/catalog">Открыть каталог</Link></div>
          </div>
          <div className="card">
            <h2>Что уточняем</h2>
            <ul>
              <li>адрес и доступность подъезда;</li>
              <li>габариты и вес позиции;</li>
              <li>срочность и удобный интервал;</li>
              <li>нужна ли разбивка по помещениям или этапам монтажа.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container grid grid-3">
          <div className="card"><h2>Самовывоз</h2><p>Подходит для небольших заказов и срочных комплектующих после подтверждения наличия менеджером.</p></div>
          <div className="card"><h2>Доставка по городу</h2><p>Для труб, насосов, арматуры и смешанных инженерных комплектов с проверкой состава заказа.</p></div>
          <div className="card"><h2>Отправка в регион</h2><p>Проверяем состав заказа так, чтобы снизить риск недостающих деталей на объекте.</p></div>
        </div>
      </section>
    </>
  );
}
