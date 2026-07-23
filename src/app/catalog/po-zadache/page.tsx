import type { Metadata } from 'next';
import Link from 'next/link';
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
