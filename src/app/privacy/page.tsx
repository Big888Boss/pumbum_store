import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Политика обработки данных — Сантехникъ',
  description: 'Как сайт Сантехникъ обрабатывает контактные данные для консультаций и связи с магазином.',
  path: '/privacy',
  noindex: false,
});

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container narrow">
        <div className="eyebrow">Документы</div>
        <h1>Политика обработки данных</h1>
        <p className="lead">Мы используем контактные данные только для консультаций, обратной связи и подготовки предложения.</p>
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
  );
}
