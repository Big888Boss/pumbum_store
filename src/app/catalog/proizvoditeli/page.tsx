import type { Metadata } from 'next';
import { StaticImage } from '@/components/media/StaticImage';
import Link from 'next/link';
import { PageMascot } from '@/components/layout/PageMascot';
import { getManufacturerGroups } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Производители — каталог инженерной сантехники',
  description: 'Каталог по производителям и разделам поставщиков: SINIKON, VALTEC, Гидроконтракт, AQUARIO, VIVALDO, АКВАТЕК, ZOTA, TIM и ESPA.',
  path: '/catalog/proizvoditeli',
});

function formatPositions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'позиция' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'позиции' : 'позиций';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

function formatSections(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'раздел' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'раздела' : 'разделов';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

export default function ManufacturersPage() {
  const manufacturers = getManufacturerGroups();

  return (
    <>
      <div className="container breadcrumbs"><Link href="/catalog">Каталог</Link> / Производители</div>
      <section className="hero">
        <div className="container hero-grid hero-grid-mascot">
          <div>
            <div className="eyebrow">Производители</div>
            <h1 className="page-title-mobile-compact">Каталог по производителям</h1>
            <p className="lead">Разделы поставщиков из полного каталога: позиции, артикулы и группы для быстрого подбора.</p>
            <div className="actions">
              <Link className="btn btn-primary" href="/catalog">Каталог по назначению</Link>
              <Link className="btn btn-secondary" href="/search">Поиск по артикулу</Link>
            </div>
          </div>
          <PageMascot
            src="/images/mascots/teplovik-manufacturers.webp"
            alt="Тепловик показывает технические каталоги"
            label="Тепловик помогает выбрать производителя"
            variant="manufacturers"
          />
        </div>
      </section>

      <section className="section">
        <div className="container manufacturer-grid">
          {manufacturers.map((manufacturer) => (
            <article key={manufacturer.name} id={manufacturer.slug} className="manufacturer-card">
              <div className={manufacturer.logo ? `manufacturer-logo manufacturer-logo-${manufacturer.slug}` : 'manufacturer-logo manufacturer-logo-fallback'}>
                {manufacturer.logo ? (
                  <StaticImage src={manufacturer.logo} alt={`Логотип ${manufacturer.name}`} width={170} height={70} />
                ) : (
                  <span>{manufacturer.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2><Link href={`/catalog/proizvoditeli/${manufacturer.slug}`}>{manufacturer.name}</Link></h2>
                <p>{formatPositions(manufacturer.productCount)} · {formatSections(manufacturer.categoryCount)}</p>
                <ul className="manufacturer-sections">
                  {manufacturer.sections.slice(0, 6).map((section) => (
                    <li key={section}>
                      <Link href={`/catalog/proizvoditeli/${manufacturer.slug}?group=${encodeURIComponent(section)}`}>{section}</Link>
                    </li>
                  ))}
                  {manufacturer.sections.length > 6 ? <li><span>+{manufacturer.sections.length - 6} разделов</span></li> : null}
                </ul>
                <p className="manufacturer-section-more"><Link href={`/catalog/proizvoditeli/${manufacturer.slug}`}>Все товары производителя</Link></p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
