import type { Metadata } from 'next';
import { PageMascot } from '@/components/layout/PageMascot';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Политика обработки данных — Сантехникъ',
  description: 'Как сайт Сантехникъ обрабатывает контактные данные для консультаций и связи с магазином.',
  path: '/privacy',
  noindex: false,
});

export default function PrivacyPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid hero-grid-mascot">
          <div>
            <div className="eyebrow">Документы</div>
            <h1>Политика обработки данных</h1>
            <p className="lead">Мы используем контактные данные только для консультаций, обратной связи и подготовки предложения.</p>
          </div>
          <PageMascot
            src="/images/mascots/teplovik-privacy.webp"
            alt="Тепловик держит защитный щит"
            label="Тепловик объясняет защиту контактных данных"
            variant="privacy"
          />
        </div>
      </section>
      <section className="section privacy-section">
        <div className="container narrow">
          <div className="card">
            <h2>Что собираем</h2>
            <p>Имя, телефон или email и текст обращения, если пользователь связывается с магазином.</p>
            <h2>Зачем</h2>
            <p>Чтобы связаться с покупателем, уточнить задачу, проверить совместимость позиций и подготовить предложение.</p>
            <h2>Передача и удаление</h2>
            <p>Данные передаются только сотрудникам, которые отвечают на обращение. По запросу покупателя удаляем контактные данные, если они больше не нужны для выполнения обращения.</p>
          </div>
        </div>
      </section>
    </>
  );
}
