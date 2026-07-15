import Link from 'next/link';
import { MetrikaGoalAnchor } from '@/components/analytics/MetrikaEvents';
import { StaticImage } from '@/components/media/StaticImage';
import { ProductImage } from '@/components/product/ProductImage';
import { getAllCategories, getAllProducts, getCategoryShowcaseBySlug } from '@/lib/catalog/loaders';
import { METRIKA_GOALS } from '@/lib/analytics/metrika';

export default function HomePage() {
  const categories = getAllCategories();
  const totalProducts = getAllProducts().length;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Магазин сантехники в Саратове</div>
            <h1>Трубы, фитинги, отопление, насосы и канализация</h1>
            <p className="lead">Сантехникъ на Большой Горной: товары для водоснабжения, отопления, канализации и монтажа инженерных систем.</p>
            <div className="actions">
              <Link className="btn btn-primary" href="/catalog">Открыть каталог</Link>
              <Link className="btn btn-secondary" href="/contacts">Контакты магазина</Link>
            </div>
            <div className="kpi-row" aria-label="Преимущества каталога">
              <div className="kpi"><strong>16 лет</strong><span>на рынке Саратова</span></div>
              <div className="kpi"><strong>{totalProducts.toLocaleString('ru-RU')}</strong><span>товарных позиций</span></div>
              <div className="kpi"><strong>1500+</strong><span>клиентов в месяц</span></div>
            </div>
          </div>
          <aside className="home-contact-panel" aria-label="Контакты магазина">
            <StaticImage className="home-contact-logo" src="/brand-logos/santekhnik-logo.png" alt="Сантехникъ" width={360} height={70} priority />
            <MetrikaGoalAnchor
              href="tel:+78452477477"
              goal={METRIKA_GOALS.phoneClick}
              goalParams={{ location: 'home_contact_panel' }}
            >
              8 (8452) 47-74-77
            </MetrikaGoalAnchor>
            <p>г. Саратов, ул. Большая Горная, 290</p>
            <p>Ежедневно 08:00-19:00</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Категории</div>
              <h2>Категории товаров</h2>
            </div>
            <Link className="btn btn-secondary" href="/catalog">Все категории</Link>
          </div>
          <div className="grid grid-3">
            {categories.map((category) => {
              const showcase = getCategoryShowcaseBySlug(category.slug);
              return (
              <Link key={category.slug} className="card category-card" href={`/catalog/${category.slug}`}>
                {showcase ? <ProductImage src={showcase.image} alt={showcase.alt} /> : null}
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.intro}</p>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

    </>
  );
}
