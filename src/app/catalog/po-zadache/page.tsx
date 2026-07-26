import type { Metadata } from 'next';
import Link from 'next/link';
import { MetrikaSearchForm } from '@/components/analytics/MetrikaEvents';
import { getBuyerTasks } from '@/lib/catalog/buyer-tasks';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Подбор оборудования по задаче',
  description: 'Водоснабжение, отопление, теплый пол, канализация, котельная и монтаж — основные группы товаров для каждой инженерной задачи.',
  path: '/catalog/po-zadache',
});

export default function BuyerTasksPage() {
  return (
    <>
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / По задаче</div>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Подбор по задаче</div>
          <h1>Что нужно сделать</h1>
          <p className="lead">Выберите инженерную задачу — покажем основные группы оборудования без смешивания с каталогом поставщика.</p>
          <MetrikaSearchForm className="search-panel search-panel-compact hero-search" action="/search" location="buyer_tasks">
            <input name="q" type="search" placeholder="Опишите задачу, товар или параметр" aria-label="Поиск оборудования по задаче" />
            <button className="btn btn-primary" type="submit">Найти решение</button>
          </MetrikaSearchForm>
        </div>
      </section>
      <section className="section">
        <div className="container grid grid-3">
          {getBuyerTasks().map((task) => (
            <Link className="card" href={`/catalog/po-zadache/${task.slug}`} key={task.slug}>
              <h2>{task.name}</h2>
              <p>{task.intro}</p>
              <strong>Открыть подборку</strong>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
