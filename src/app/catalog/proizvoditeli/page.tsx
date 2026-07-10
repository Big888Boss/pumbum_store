import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getManufacturerGroups } from '@/lib/catalog/loaders';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Производители — каталог инженерной сантехники',
  description: 'Каталог по производителям и разделам поставщиков: SINIKON, VALTEC, Гидроконтракт, AQUARIO, VIVALDO, АКВАТЕК, ZOTA.',
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
        <div className="container">
          <div className="eyebrow">Производители</div>
          <h1>Каталог по производителям</h1>
          <p className="lead">Разделы поставщиков из полного каталога: позиции, артикулы и группы для быстрого подбора.</p>
          <div className="actions">
            <Link className="btn btn-primary" href="/catalog">Каталог по назначению</Link>
            <Link className="btn btn-secondary" href="/search">Поиск по артикулу</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container manufacturer-grid">
          {manufacturers.map((manufacturer) => (
            <article key={manufacturer.name} className="manufacturer-card">
              <div className={manufacturer.logo ? 'manufacturer-logo' : 'manufacturer-logo manufacturer-logo-fallback'}>
                {manufacturer.logo ? (
                  <Image src={manufacturer.logo} alt={`Логотип ${manufacturer.name}`} width={170} height={70} />
                ) : (
                  <span>{manufacturer.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2>{manufacturer.name}</h2>
                <p>{formatPositions(manufacturer.productCount)} · {formatSections(manufacturer.categoryCount)}</p>
                <ul className="manufacturer-sections">
                  {manufacturer.sections.slice(0, 6).map((section) => (
                    <li key={section}><Link href={`/search?q=${encodeURIComponent(section)}`}>{section}</Link></li>
                  ))}
                  {manufacturer.sections.length > 6 ? <li><Link href={`/search?q=${encodeURIComponent(manufacturer.name)}`}>+{manufacturer.sections.length - 6} разделов</Link></li> : null}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
