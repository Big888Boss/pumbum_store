import type { Category } from '@/entities/category/model';
import type { Product } from '@/entities/product/model';

const updatedAt = '2026-07-22';
const sourceRefs = [{ type: 'legacy' as const, label: '477477.ru catalog purpose taxonomy' }];

export const purposeCategories: Category[] = [
  {
    slug: 'vodosnabzhenie',
    name: 'Водоснабжение',
    h1: 'Водоснабжение',
    title: 'Водоснабжение — баки и оборудование в Саратове',
    description: 'Баки, емкости, гидроаккумуляторы, квартирные станции и оборудование для подачи и хранения воды.',
    intro: 'Оборудование для подачи, хранения и распределения воды: накопительные емкости, гидроаккумуляторы, автоматика и подводка.',
    seoText: 'Для стабильного водоснабжения важны требуемый запас воды, рабочее давление, температура, место установки и способ подключения.',
    buyingGuide: 'Для подбора укажите назначение системы, нужный объем, давление, размеры места установки и параметры подключения.',
    faq: [
      { question: 'Как подобрать объем емкости?', answer: 'Он зависит от расхода воды, числа пользователей, режима наполнения и доступного места для установки.' },
      { question: 'Баки для канализации находятся здесь?', answer: 'Обычные накопительные баки и емкости находятся в водоснабжении, а септики и системы очистки стоков — в канализации.' },
    ],
    priority: 100,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'kanalizaciya',
    name: 'Канализация',
    h1: 'Канализация',
    title: 'Канализация — трубы, фитинги и водоотведение',
    description: 'Внутренняя и наружная канализация, водостоки, трапы, душевые лотки и локальные системы очистки.',
    intro: 'Системы отвода стоков: канализационные трубы и фитинги, водостоки, трапы, душевые лотки и автономная канализация.',
    seoText: 'Для надежного водоотведения важно совместить диаметр, материал, уклон, тип выпуска и условия внутреннего или наружного монтажа.',
    buyingGuide: 'Для подбора нужны схема трассы, диаметр, материал системы, место монтажа и количество фасонных частей.',
    faq: [
      { question: 'Есть ли внутренняя и наружная канализация?', answer: 'Да. В разделе собраны обе системы, а также водостоки, трапы и локальные очистные решения.' },
      { question: 'Можно собрать комплект по схеме?', answer: 'Да. Отправьте схему или список — менеджер проверит диаметры, переходы и комплектность.' },
    ],
    priority: 99,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'filtraciya',
    name: 'Фильтрация',
    h1: 'Фильтрация',
    title: 'Фильтры для воды и инженерных систем',
    description: 'Фильтры механической очистки, промывные фильтры, грязеотделители и комплектующие.',
    intro: 'Оборудование для защиты воды и инженерных систем: механические, косые и промывные фильтры, сепараторы и комплектующие.',
    seoText: 'Фильтр выбирают по назначению, размеру присоединения, пропускной способности, степени очистки и удобству обслуживания.',
    buyingGuide: 'Укажите среду, диаметр подключения, рабочее давление, требуемую очистку и место установки.',
    faq: [
      { question: 'Чем промывной фильтр отличается от косого?', answer: 'Промывной удобнее обслуживать без разборки, а косой — простое решение для грубой механической очистки.' },
      { question: 'Есть фильтры с редуктором?', answer: 'Да. В каталоге есть комбинированные модели с манометром и регулировкой давления.' },
    ],
    priority: 98,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'nasosy',
    name: 'Насосы',
    h1: 'Насосы',
    title: 'Насосы и насосные станции в Саратове',
    description: 'Скважинные, поверхностные, циркуляционные и дренажные насосы, насосные станции и автоматика.',
    intro: 'Насосное оборудование для дома и объекта: станции, скважинные, поверхностные, циркуляционные и дренажные насосы.',
    seoText: 'Насос подбирают по расходу, напору, глубине, типу перекачиваемой воды и режиму работы.',
    buyingGuide: 'Для подбора укажите источник воды, глубину, требуемый расход и напор, длину трассы и режим работы.',
    faq: [
      { question: 'Можно подобрать насос по параметрам?', answer: 'Да. Нужны глубина, расход, напор и условия установки.' },
      { question: 'Есть готовые насосные станции?', answer: 'Да. В разделе представлены станции, насосы и совместимая автоматика.' },
    ],
    priority: 97,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'smesiteli-i-sifony',
    name: 'Смесители и сифоны',
    h1: 'Смесители и сифоны',
    title: 'Смесители, сифоны и комплектующие',
    description: 'Сифоны, сливы, обвязка для ванн, душевые шланги и комплектующие для смесителей.',
    intro: 'Сифоны и сливная арматура, обвязка для ванн, душевые шланги, изливы и комплектующие для сантехнических приборов.',
    seoText: 'При подборе важны тип прибора, диаметр выпуска, наличие перелива, материал и размеры монтажного пространства.',
    buyingGuide: 'Укажите тип раковины, ванны или смесителя, размеры подключения и желаемый материал исполнения.',
    faq: [
      { question: 'Есть сифоны для раковины?', answer: 'Да. Есть бутылочные, сухие и специализированные сливы для разных приборов.' },
      { question: 'Можно подобрать обвязку для ванны?', answer: 'Да. Нужны диаметр выпуска, наличие перелива и доступное место под ванной.' },
    ],
    priority: 96,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'otoplenie-i-kotelnaya',
    name: 'Отопление и котельная',
    h1: 'Отопление и котельная',
    title: 'Отопление и котельная — каталог оборудования',
    description: 'Котлы, коллекторные системы, теплый пол, радиаторная арматура и автоматика отопления.',
    intro: 'Основное оборудование и обвязка отопления: котлы, коллекторы, теплый пол, радиаторные узлы, автоматика и безопасность.',
    seoText: 'Систему отопления комплектуют по тепловой нагрузке, типу котла, схеме контуров, рабочему давлению и способу регулирования.',
    buyingGuide: 'Для подбора нужны площадь и теплопотери объекта, тип топлива, число контуров, схема подключения и параметры теплоносителя.',
    faq: [
      { question: 'Можно подобрать комплект под объект?', answer: 'Да. Отправьте схему или задачу — менеджер проверит котел, контуры, автоматику и обвязку.' },
      { question: 'В разделе есть не только комплектующие?', answer: 'Да. Основное оборудование, включая котлы, выводится первым, а вспомогательные позиции идут дальше.' },
    ],
    priority: 95,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'krepezh-dlya-montazha',
    name: 'Крепёж для монтажа',
    h1: 'Крепёж для монтажа',
    title: 'Крепёж и монтажные системы для сантехники',
    description: 'Хомуты, клипсы, монтажные профили, консоли и крепеж инженерных систем.',
    intro: 'Крепеж для надежного монтажа труб и оборудования: хомуты, клипсы, профили, шины, консоли и соединители.',
    seoText: 'Крепеж выбирают по диаметру и массе трубы, материалу основания, нагрузке, вибрации и условиям эксплуатации.',
    buyingGuide: 'Укажите диаметр трубы, материал стены или перекрытия, длину трассы и расчетную нагрузку.',
    faq: [
      { question: 'Есть крепеж для труб разных диаметров?', answer: 'Да. В разделе собраны хомуты, клипсы и элементы монтажных систем.' },
      { question: 'Можно собрать монтажную раму?', answer: 'Да. Поможем совместить профиль, консоли и соединительные элементы.' },
    ],
    priority: 94,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'truby-i-fitingi',
    name: 'Трубы и фитинги',
    h1: 'Трубы и фитинги',
    title: 'Трубы и фитинги — каталог в Саратове',
    description: 'Полимерные, металлополимерные и нержавеющие трубы, фитинги и соединения.',
    intro: 'Трубы и соединительные системы: полипропилен, PE-X, PE-RT, металлопластик, нержавеющая сталь и совместимые фитинги.',
    seoText: 'Трубу и фитинги подбирают как единую систему по материалу, диаметру, типу соединения, температуре и давлению.',
    buyingGuide: 'Укажите назначение трубопровода, материал, диаметр, температуру, давление и выбранный способ монтажа.',
    faq: [
      { question: 'Фитинги совместимы с любой трубой?', answer: 'Нет. Совместимость проверяют по системе, диаметру и типу соединения.' },
      { question: 'Можно искать по артикулу?', answer: 'Да. Поиск работает по артикулу, серии, бренду и параметрам.' },
    ],
    priority: 93,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'armatura-i-komplektuyuschie',
    name: 'Арматура и комплектующие',
    h1: 'Арматура и комплектующие',
    title: 'Арматура и комплектующие для инженерных систем',
    description: 'Краны, клапаны, редукторы, измерительные приборы и автоматика инженерных систем.',
    intro: 'Запорная, регулирующая и измерительная арматура: шаровые краны, клапаны, редукторы, приборы учета и автоматика.',
    seoText: 'Арматуру выбирают по среде, диаметру, резьбе, рабочему давлению, температуре и требуемой функции узла.',
    buyingGuide: 'Укажите назначение узла, размер подключения, среду, давление, температуру и способ управления.',
    faq: [
      { question: 'Можно подобрать замену по старому артикулу?', answer: 'Да. Пришлите артикул или фото — менеджер проверит совместимые варианты.' },
      { question: 'Есть регулирующая арматура?', answer: 'Да. В разделе есть запорные, регулирующие, защитные и измерительные устройства.' },
    ],
    priority: 92,
    sourceRefs,
    updatedAt,
  },
  {
    slug: 'prochee-oborudovanie',
    name: 'Прочее оборудование',
    h1: 'Прочее оборудование',
    title: 'Инструмент и прочее оборудование для монтажа',
    description: 'Монтажный инструмент, расходные материалы и дополнительные позиции инженерной сантехники.',
    intro: 'Инструмент и дополнительные позиции: пресс-инструмент, ножницы, оборудование для монтажа и расходные материалы.',
    seoText: 'Инструмент подбирают под конкретную трубную систему, профиль соединения, диапазон диаметров и объем работ.',
    buyingGuide: 'Укажите систему труб, размеры, тип соединения и предполагаемый объем монтажных работ.',
    faq: [
      { question: 'Что находится в этом разделе?', answer: 'Инструмент и расходные позиции, которые не относятся к основным товарным системам.' },
      { question: 'Можно подобрать инструмент к фитингам?', answer: 'Да. Важно знать систему, профиль и рабочий диапазон диаметров.' },
    ],
    priority: 91,
    sourceRefs,
    updatedAt,
  },
];

const CATEGORY = {
  water: 'vodosnabzhenie',
  sewer: 'kanalizaciya',
  filter: 'filtraciya',
  pump: 'nasosy',
  mixer: 'smesiteli-i-sifony',
  heating: 'otoplenie-i-kotelnaya',
  fastener: 'krepezh-dlya-montazha',
  pipe: 'truby-i-fitingi',
  valve: 'armatura-i-komplektuyuschie',
  other: 'prochee-oborudovanie',
} as const;

function normalized(value: string | undefined): string {
  return (value ?? '').toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
}

function getTopSection(product: Product): string {
  return normalized((product.specs['Подраздел'] ?? '').split('/')[0]?.trim());
}

function getProductText(product: Product): string {
  return normalized([
    product.name,
    product.shortDescription,
    product.purpose,
    product.specs['Подраздел'],
    product.specs['Группа'],
    product.specs['Тип'],
  ].join(' '));
}

function isSupplier(product: Product, supplier: string): boolean {
  return product.supplier === supplier
    || product.brand === supplier
    || normalized(product.brandName) === supplier;
}

function classifyValtec(product: Product): string {
  const section = getTopSection(product);
  const text = getProductText(product);

  if (/насосн/.test(section)) return CATEGORY.pump;
  if (/фильтр/.test(section) || /(^|\s)фильтр\s|грязеотдел|шламоотдел/.test(text)) return CATEGORY.filter;
  if (/крепеж|модульн.*монтаж/.test(section)) return CATEGORY.fastener;
  if (/инструмент/.test(section) || /пресс-инструмент|пресс-клещ|насадка|ножниц|резак|калибратор|размотчик/.test(text)) return CATEGORY.other;
  if (/подводка гибкая/.test(section)) return CATEGORY.water;
  if (/коллекторн|тепл.*пол|радиаторн|отоплен|теплоизоляц/.test(section)) return CATEGORY.heating;
  if (/баки мембранные/.test(section)) return /гидроаккум|водоснаб/.test(text) ? CATEGORY.water : CATEGORY.heating;
  if (/квартирные станции/.test(section)) return /отопительного контура/.test(text) ? CATEGORY.heating : CATEGORY.water;
  if (/трубопроводная арматура|регулирующая арматура|арматура безопасности|контрольно-измерительные|приборы учета|диспетчеризац|газоснабжения/.test(section)) return CATEGORY.valve;
  if (/элементы автоматики/.test(section)) return /отоплен|тепл|радиатор|термо/.test(text) ? CATEGORY.heating : CATEGORY.valve;

  if (/valtec рекомендует/.test(section)) {
    if (/насос/.test(text)) return CATEGORY.pump;
    if (/радиатор|отоплен|тепл.*пол|термо|коллектор/.test(text)) return CATEGORY.heating;
    if (/бак|водоснаб|гвс|хвс/.test(text)) return CATEGORY.water;
    if (/кран|клапан|вентил|редуктор|манометр|счетчик|арматур/.test(text)) return CATEGORY.valve;
    if (/труб|фитинг|муфт|угольник|тройник|соедин/.test(text)) return CATEGORY.pipe;
    return CATEGORY.other;
  }

  if (/системы металлополимер|системы полипропилен|нержавеющей стали|резьбовые и ремонтные соединения/.test(section)) {
    if (/кран|клапан|вентил|редуктор|манометр|арматур/.test(text)) return CATEGORY.valve;
    return CATEGORY.pipe;
  }
  return CATEGORY.other;
}

function classifyTim(product: Product): string {
  const section = getTopSection(product);
  const text = getProductText(product);

  if (/фильтр|грязеотдел|шламоотдел|сепаратор воздуха и грязи/.test(section)) return CATEGORY.filter;
  if (/лоток|трап|дренажн.*канал|водоотвод трубы|желоба и направление/.test(section) || /запчасти.*лотк/.test(text)) return CATEGORY.sewer;
  if (/котел|радиатор|термо|тепл.*пол|коллектор|группа безопасности|гидравлическ.*раздел|расширительн.*бак|воздухоотвод|смесительные узлы|быстрого монтажа без насоса|регулировочный короб|клапан и сервопривод/.test(section)) return CATEGORY.heating;
  if (/для твердотопливного котла|набор кранов для газового котла/.test(text)) return CATEGORY.heating;
  if (/смесител|сифон|обвязка для ванны|слив для раковины|шланг для душа|излив|кран-букс|профили для ванны|бордюрная лента/.test(section)) return CATEGORY.mixer;
  if (/насос/.test(section)) return CATEGORY.pump;
  if (/гидроаккум|бак для гвс|реле давления|реле сухого хода|блок автоматики|оголовок скваж|поплавок|мембрана для гидроаккум|фланец для гидроаккум|адаптер для установки насоса|система защиты от протеч|клапан поплавков|гибкая подводка для воды|кран незамерзающ|кран водоразборн|врезка для бочки/.test(section)) return CATEGORY.water;
  if (/хомут|креплен|клипса|монтажн.*профил|планка установ|фиксатор|червячн|отражатель/.test(section)) return CATEGORY.fastener;
  if (/инструмент|ножниц|опрессов|насадка|размотчик|фум|уплотнительн.*кольц|лента|сварочн.*аппарат/.test(section)) return CATEGORY.other;
  if (/кран|клапан|вентил|редуктор|манометр|арматур|система автоматического контроля|регулятор давления/.test(section)) return CATEGORY.valve;
  if (/труб|фитинг|штуцер|уголок|тройник|крестовин|муфт|ниппел|бочонок|переходник|футор|контргайк|сгон|американк|удлинитель|заглушк|пробк|компенсатор|цанг|подводка.*газ|шланг.*газ|диэлектрик|эксцентрик/.test(section)) return CATEGORY.pipe;
  return CATEGORY.other;
}

export function getPurposeCategorySlug(product: Product): string {
  const text = getProductText(product);

  if (isSupplier(product, 'aquario') || isSupplier(product, 'gidrokontrakt') || isSupplier(product, 'espa')) return CATEGORY.pump;
  if (isSupplier(product, 'vivaldo') || isSupplier(product, 'zota')) return CATEGORY.heating;
  if (isSupplier(product, 'aquatec')) {
    return /канализац|сточн|локальн.*очист|септик/.test(text) ? CATEGORY.sewer : CATEGORY.water;
  }
  if (isSupplier(product, 'sinikon')) {
    if (product.categorySlug === 'truby-pe-x-pe-rt' || product.categorySlug === 'latunnye-aksialnye-fitingi') return CATEGORY.pipe;
    if (product.categorySlug === 'naruzhnaya-kanalizaciya' && /инструмент|крепеж|хомут|фиксатор/.test(text)) return CATEGORY.fastener;
    return CATEGORY.sewer;
  }
  if (isSupplier(product, 'valtec')) return classifyValtec(product);
  if (isSupplier(product, 'tim')) return classifyTim(product);
  return CATEGORY.other;
}

const corePatterns: Record<string, RegExp[]> = {
  [CATEGORY.water]: [/емкост|бак для воды|гидроаккумулятор/, /квартирная станция|система защиты от протеч/, /автоматик|реле давления|подводка/],
  [CATEGORY.sewer]: [/система локальной очистки|автономная канализация|труб.*канализац/, /трубы и фитинги|водосток|душевой лоток|трап/, /отвод|тройник|муфта/],
  [CATEGORY.filter]: [/фильтр промывной|фильтр механической|сепаратор/, /фильтр косой|фильтр прямой/, /комплектующ/],
  [CATEGORY.pump]: [/насосная станция/, /скважинный насос|поверхностный насос|циркуляционный насос|дренажный насос/, /насос/],
  [CATEGORY.mixer]: [/сифон|обвязка для ванны/, /слив для раковины|донный клапан/, /шланг для душа|излив/],
  [CATEGORY.heating]: [/газовые настенные котлы|электрокотлы|твердотопливные котлы|автоматические котлы|полуавтоматические котлы/, /котел|коллекторная группа|коллекторный блок/, /теплый пол|радиатор|гидравлический разделитель/],
  [CATEGORY.fastener]: [/монтажн.*профил|монтажная шина|консоль/, /хомут|креплен|клипса/, /соединитель профиля/],
  [CATEGORY.pipe]: [/^труба| трубы |трубопровод/, /фитинг|муфта|тройник|уголок/, /переходник|ниппель|сгон/],
  [CATEGORY.valve]: [/шаровой кран|кран шаровой/, /редуктор|клапан|вентиль/, /манометр|прибор учета/],
  [CATEGORY.other]: [/пресс-инструмент|сварочный аппарат|опрессовочный аппарат/, /инструмент|ножницы|размотчик/, /насадка|расходн/],
};

export function getCategoryProductPriority(product: Product): number {
  const text = getProductText(product);
  const name = normalized(product.name);
  const patterns = corePatterns[product.categorySlug] ?? [];
  const patternScore = patterns.findIndex((pattern) => pattern.test(text));
  const coreScore = patternScore === -1 ? 0 : (patterns.length - patternScore) * 100;
  const imageScore = product.dataQuality.hasRealImage ? 15 : 0;
  const qualityScore = Math.min(product.dataQuality.score ?? 0, 100) / 10;
  const primaryPatterns: Record<string, RegExp> = {
    [CATEGORY.water]: /^(atv|ath|atp|atq|combi)|емкост|бак для воды|гидроаккумулятор/,
    [CATEGORY.sewer]: /система локальной очистки|автономная канализация|труб.*канализац|душевой лоток|трап/,
    [CATEGORY.filter]: /^фильтр|сепаратор/,
    [CATEGORY.pump]: /насосная станция|насос/,
    [CATEGORY.mixer]: /^сифон|обвязка для ванны|слив для раковины/,
    [CATEGORY.heating]: /^zota «|(^|\s)котел(\s|$)|(^|\s)котлы(\s|$)/,
    [CATEGORY.fastener]: /монтажн.*профил|монтажная шина|^хомут|^клипса/,
    [CATEGORY.pipe]: /^труба|трубопроводная система/,
    [CATEGORY.valve]: /^кран|^клапан|^вентиль|^редуктор/,
    [CATEGORY.other]: /пресс-инструмент|сварочный аппарат|опрессовочный аппарат/,
  };
  const primaryBonus = primaryPatterns[product.categorySlug]?.test(name) ? 600 : 0;
  const accessoryPenalty = /комплект золоудаления|комплектующ|запчаст|насадка|мембрана|фланец|уплотн|заглушка|пробка|гайка|адаптер для/.test(name) ? 500 : 0;
  return primaryBonus + coreScore + imageScore + qualityScore - accessoryPenalty;
}

export function normalizeProductCategory(product: Product): Product {
  const nextCategorySlug = getPurposeCategorySlug(product);
  if (product.categorySlug === nextCategorySlug) return product;
  return {
    ...product,
    categorySlug: nextCategorySlug,
    specs: {
      ...product.specs,
      'Исходный раздел': product.specs['Раздел'] ?? product.categorySlug,
    },
  };
}
