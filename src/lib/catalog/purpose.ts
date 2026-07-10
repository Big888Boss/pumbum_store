import type { Category } from '@/entities/category/model';
import type { Product } from '@/entities/product/model';

export const purposeCategories: Category[] = [
  {
    slug: 'otoplenie-i-kotelnaya',
    name: 'Отопление и котельная',
    h1: 'Отопление и котельная',
    title: 'Отопление и котельная - каталог товаров',
    description: 'Котлы, радиаторная арматура, теплый пол, коллекторные системы и комплектующие для отопления.',
    intro: 'Раздел для комплектации отопления: котельное оборудование, теплый пол, радиаторные узлы, коллекторы, автоматика и обвязка.',
    seoText: 'Котлы, терморегулирование, теплый пол, коллекторные узлы и комплектующие для систем отопления.',
    buyingGuide: 'Для подбора нужны тип системы, тепловая нагрузка, подключение, размеры, рабочее давление и список совместимых комплектующих.',
    faq: [
      { question: 'Можно подобрать комплект под объект?', answer: 'Да. Отправьте список материалов или задачу, менеджер проверит совместимость и подготовит предложение.' },
      { question: 'Цены и наличие актуальны на сайте?', answer: 'Цена и наличие подтверждаются перед заказом, чтобы в счете были актуальные позиции.' },
    ],
    priority: 100,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
  {
    slug: 'nasosy-i-vodosnabzhenie',
    name: 'Насосы и водоснабжение',
    h1: 'Насосы и водоснабжение',
    title: 'Насосы и водоснабжение - каталог товаров',
    description: 'Насосы, насосные станции, скважинные решения, баки и оборудование для подачи воды.',
    intro: 'Раздел для подачи воды: поверхностные, скважинные, дренажные, циркуляционные насосы, станции и комплектующие.',
    seoText: 'Насосное оборудование и решения для водоснабжения частных домов, объектов и инженерных систем.',
    buyingGuide: 'Для подбора нужны источник воды, расход, напор, глубина, режим работы и требования к автоматике.',
    faq: [
      { question: 'Можно подобрать насос по параметрам?', answer: 'Да. Укажите глубину, требуемый расход, напор и условия установки.' },
      { question: 'Можно заказать аналоги?', answer: 'Да. Если позиции нет в наличии, подберем совместимый вариант по характеристикам.' },
    ],
    priority: 95,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
  {
    slug: 'kanalizaciya-i-vodootvedenie',
    name: 'Канализация и водоотведение',
    h1: 'Канализация и водоотведение',
    title: 'Канализация и водоотведение - каталог товаров',
    description: 'Внутренняя и наружная канализация, водостоки, емкости и комплектующие для водоотведения.',
    intro: 'Раздел для канализации и водоотведения: трубы, фитинги, водостоки, трапы, емкости и элементы локальной очистки.',
    seoText: 'Системы внутренней и наружной канализации, водостоки и комплектующие для монтажа.',
    buyingGuide: 'Для подбора нужны диаметр, назначение системы, место монтажа, уклон, материал и количество фасонных частей.',
    faq: [
      { question: 'Есть ли трубы и фасонные части?', answer: 'Да. В разделе собраны трубы, фитинги и комплектующие для внутренней и наружной канализации.' },
      { question: 'Можно собрать спецификацию?', answer: 'Да. Отправьте схему или список, мы проверим комплектность.' },
    ],
    priority: 90,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
  {
    slug: 'truby-i-fitingi',
    name: 'Трубы и фитинги',
    h1: 'Трубы и фитинги',
    title: 'Трубы и фитинги - каталог товаров',
    description: 'Металлополимерные, полипропиленовые, PE-X и PE-RT трубы, фитинги и монтажные соединения.',
    intro: 'Раздел для трубопроводов: трубы, фитинги, резьбовые соединения, монтажные элементы и подводка.',
    seoText: 'Трубы, фитинги и соединительные системы для водоснабжения, отопления и монтажа инженерных сетей.',
    buyingGuide: 'Для подбора нужны материал трубы, диаметр, тип соединения, температура, давление и условия монтажа.',
    faq: [
      { question: 'Можно искать по артикулу?', answer: 'Да. Используйте поиск по артикулу, серии, диаметру или бренду.' },
      { question: 'Фитинги совместимы со всеми трубами?', answer: 'Нет. Совместимость проверяется по системе, размеру и типу соединения.' },
    ],
    priority: 85,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
  {
    slug: 'armatura-i-komplektuyuschie',
    name: 'Арматура и комплектующие',
    h1: 'Арматура и комплектующие',
    title: 'Арматура и комплектующие - каталог товаров',
    description: 'Краны, клапаны, фильтры, редукторы, измерительные приборы и комплектующие для инженерных систем.',
    intro: 'Раздел для запорной, регулирующей и измерительной арматуры: краны, клапаны, фильтры, редукторы и приборы.',
    seoText: 'Арматура и комплектующие для водоснабжения, отопления, учета и защиты инженерных систем.',
    buyingGuide: 'Для подбора нужны диаметр, резьба, среда, давление, температура и назначение узла.',
    faq: [
      { question: 'Можно подобрать замену по старому артикулу?', answer: 'Да. Укажите артикул или фото, менеджер проверит совместимые варианты.' },
      { question: 'Есть ли комплектующие к узлам?', answer: 'Да. В каталоге есть краны, клапаны, фильтры, приборы и расходные элементы.' },
    ],
    priority: 80,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
  {
    slug: 'prochee-oborudovanie',
    name: 'Прочее оборудование',
    h1: 'Прочее оборудование',
    title: 'Прочее оборудование - каталог товаров',
    description: 'Инструмент, крепеж, расходные материалы и позиции, которые не входят в основные разделы.',
    intro: 'Раздел для инструмента, крепежа, расходных материалов и дополнительных позиций инженерной сантехники.',
    seoText: 'Дополнительное оборудование, инструмент, крепеж и расходные материалы для комплектации заказа.',
    buyingGuide: 'Для подбора укажите задачу, артикул, размеры и основной комплект оборудования.',
    faq: [
      { question: 'Что попадает в этот раздел?', answer: 'Позиции, которые нужны для монтажа и комплектации, но не относятся к основным группам каталога.' },
      { question: 'Можно перенести позицию в другой раздел?', answer: 'Да. Каталог нормализуется, и спорные позиции можно уточнить по назначению.' },
    ],
    priority: 75,
    sourceRefs: [{ type: 'legacy', label: '477477.ru/catalog purpose navigation' }],
    updatedAt: '2026-06-29',
  },
];

// Keep this aligned with legacy_src/lib/catalogNavigation.ts buckets, even where
// the legacy keyword matching looks counterintuitive.
const directSourceMap: Record<string, string> = {
  aquario: 'nasosy-i-vodosnabzhenie',
  gidrokontrakt: 'nasosy-i-vodosnabzhenie',
  aquatec: 'kanalizaciya-i-vodootvedenie',
  'vnutrennie-vodostoki': 'kanalizaciya-i-vodootvedenie',
  'truby-pe-x-pe-rt': 'truby-i-fitingi',
  'vnutrennyaya-kanalizaciya': 'otoplenie-i-kotelnaya',
  'latunnye-aksialnye-fitingi': 'otoplenie-i-kotelnaya',
  vivaldo: 'prochee-oborudovanie',
};

const valtecTopSectionMap: Record<string, string> = {
  'Насосное оборудование': 'nasosy-i-vodosnabzhenie',
  'Инструмент': 'truby-i-fitingi',
  'Крепеж и расходные материалы': 'truby-i-fitingi',
  'Резьбовые и ремонтные соединения для трубопроводов': 'truby-i-fitingi',
  'Системы трубопроводов из нержавеющей стали': 'truby-i-fitingi',
  'Трубопроводная арматура': 'truby-i-fitingi',
  'Регулирующая арматура': 'armatura-i-komplektuyuschie',
  'Арматура безопасности': 'armatura-i-komplektuyuschie',
  'Контрольно-измерительные приборы': 'armatura-i-komplektuyuschie',
  'Системы диспетчеризации': 'armatura-i-komplektuyuschie',
  'Системы модульного монтажа': 'armatura-i-komplektuyuschie',
  'Шаровые краны для газоснабжения': 'armatura-i-komplektuyuschie',
  'Подводка гибкая': 'prochee-oborudovanie',
  'Фильтры': 'prochee-oborudovanie',
};

const zotaHeatingSections = new Set(['Газовые настенные котлы', 'Твердотопливные котлы']);

function getTopSection(product: Product): string {
  return (product.specs['Подраздел'] ?? '').split('/')[0]?.trim() ?? '';
}

export function getPurposeCategorySlug(product: Product): string {
  const topSection = getTopSection(product);
  if (product.categorySlug === 'naruzhnaya-kanalizaciya') {
    return topSection === 'Инструмент и крепеж' ? 'truby-i-fitingi' : 'kanalizaciya-i-vodootvedenie';
  }
  if (product.categorySlug === 'zota') {
    return zotaHeatingSections.has(topSection) ? 'otoplenie-i-kotelnaya' : 'prochee-oborudovanie';
  }
  if (directSourceMap[product.categorySlug]) return directSourceMap[product.categorySlug];
  if (product.categorySlug === 'valtec') return valtecTopSectionMap[topSection] ?? 'otoplenie-i-kotelnaya';
  return 'prochee-oborudovanie';
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
