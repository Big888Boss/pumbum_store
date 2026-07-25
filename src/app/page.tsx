import Link from 'next/link';
import { MetrikaGoalAnchor, MetrikaSearchForm } from '@/components/analytics/MetrikaEvents';
import { EngineeringVisual } from '@/components/layout/EngineeringVisual';
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
            <div className="eyebrow">Инженерный каталог · Саратов</div>
            <h1>Инженерная сантехника высшего класса</h1>
            <p className="lead">Профессиональный подбор оборудования под задачу: точные параметры, совместимость, актуальные цены и наличие подтверждает магазин.</p>
            <div className="actions">
              <Link className="btn btn-primary" href="/catalog">Открыть каталог</Link>
              <Link className="btn btn-secondary" href="/contacts">Консультация</Link>
            </div>
            <MetrikaSearchForm className="search-panel search-panel-compact hero-search" action="/search" location="home_hero">
              <input name="q" type="search" placeholder="Артикул, бренд или характеристика" aria-label="Поиск по каталогу" />
              <button className="btn btn-primary" type="submit">Найти</button>
            </MetrikaSearchForm>
          </div>
          <EngineeringVisual totalProducts={totalProducts} />
        </div>
      </section>

      <section className="stats-section" aria-label="Преимущества магазина">
        <div className="container kpi-row">
          <div className="kpi"><strong>16 лет</strong><span>на рынке Саратова</span></div>
          <div className="kpi"><strong>{totalProducts.toLocaleString('ru-RU')}</strong><span>товарных позиций</span></div>
          <div className="kpi">
            <MetrikaGoalAnchor href="tel:+78452477477" goal={METRIKA_GOALS.phoneClick} goalParams={{ location: 'home_stats' }}>
              <strong>477-477</strong><span>консультация ежедневно</span>
            </MetrikaGoalAnchor>
          </div>
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
