import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { getManufacturerGroups } from '@/lib/catalog/loaders';

export const metadata: Metadata = buildMetadata({
  title: 'О магазине — Сантехникъ',
  description: 'Сантехникъ в Саратове: центр инженерной сантехники, официальный дилер SINIKON, товары для водоснабжения, отопления и канализации.',
  path: '/about',
});

function formatPositions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'позиция' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'позиции' : 'позиций';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}

export default function AboutPage() {
  const manufacturers = getManufacturerGroups().slice(0, 12);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">О компании</div>
          <h1>Магазин инженерной сантехники в Саратове</h1>
          <p className="lead">Сантехникъ работает с 2010 года и помогает подбирать комплектующие для водоснабжения, отопления, канализации и монтажа инженерных систем.</p>
        </div>
      </section>
      <section className="section">
        <div className="container about-layout">
          <article className="card about-copy">
            <h2>О магазине</h2>
            <p>Магазин «Сантехникъ» — специализированный центр инженерной сантехники на Большой Горной. Основной профиль: системные решения для водоснабжения, отопления и внутренней канализации.</p>
            <p>Мы работаем с частными клиентами, монтажниками и строительными организациями. В каталоге собраны трубы, фитинги, насосное оборудование, баки, арматура, комплектующие для обвязки и канализационные системы.</p>
            <p>Сантехникъ является официальным дилером SINIKON в Саратове. По товарам, где важны совместимость, наличие и комплектация, лучше уточнить позицию у магазина перед покупкой.</p>

            <h2>Основные направления</h2>
            <ul>
              <li>системы внутренней и наружной канализации;</li>
              <li>трубы, фитинги и соединительные элементы;</li>
              <li>насосы, гидроаккумуляторы и расширительные баки;</li>
              <li>отопление, котельная обвязка и теплый пол;</li>
              <li>запорная арматура и монтажные комплектующие.</li>
            </ul>

            <h2>Гарантия и поставщики</h2>
            <p>Магазин работает с официальными поставщиками и передает гарантию производителя на реализуемую продукцию. Если нужна замена или аналог, менеджер подберет позицию по артикулу, размеру или назначению.</p>
          </article>

          <aside className="about-side">
            <div className="card about-fact">
              <span>Работаем с</span>
              <strong>2010 года</strong>
              <p>16+ лет на рынке Саратова.</p>
            </div>
            <div className="card about-fact">
              <span>Адрес</span>
              <strong>Большая Горная, 290</strong>
              <p>410005, Саратов. Можно приехать в магазин или уточнить товар по телефону.</p>
            </div>
            <div className="card about-fact">
              <span>Режим работы</span>
              <strong>08:00-19:00</strong>
              <p>Ежедневно, без выходных.</p>
            </div>
            <div className="card about-fact">
              <span>Реквизиты</span>
              <strong>ООО «Вирадо»</strong>
              <p>ОГРН 1106453006879, ИНН 6453113652, КПП 645201001.</p>
            </div>
          </aside>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Производители и поставщики</h2></div>
          <div className="grid grid-3">
            {manufacturers.map((manufacturer) => (
              <Link className="card brand-card" href={`/search?q=${encodeURIComponent(manufacturer.name)}`} key={manufacturer.name}>
                {manufacturer.logo ? (
                  <Image src={manufacturer.logo} alt={`Логотип ${manufacturer.name}`} width={180} height={70} />
                ) : (
                  <div className="manufacturer-logo"><span>{manufacturer.name.slice(0, 2).toUpperCase()}</span></div>
                )}
                <h3>{manufacturer.name}</h3>
                <p>{formatPositions(manufacturer.productCount)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
