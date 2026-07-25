export type BuyerTask = {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  guide: string[];
  subcategories: Array<{ categorySlug: string; subcategorySlug: string }>;
};

const buyerTasks: BuyerTask[] = [
  {
    slug: 'voda-iz-skvazhiny',
    name: 'Вода для дома и дачи',
    title: 'Водоснабжение дома и дачи из скважины',
    description: 'Подборка насосов, станций, гидроаккумуляторов, фильтрации и арматуры для водоснабжения дома или дачи.',
    intro: 'Собрали основные группы оборудования для подачи, накопления и подготовки воды.',
    guide: ['Источник, глубина и динамический уровень воды', 'Требуемый расход и напор', 'Объем запаса и способ автоматизации'],
    subcategories: [
      { categorySlug: 'nasosy', subcategorySlug: 'skvazhinnye-nasosy' },
      { categorySlug: 'nasosy', subcategorySlug: 'nasosnye-stancii' },
      { categorySlug: 'vodosnabzhenie', subcategorySlug: 'gidroakkumulyatory' },
      { categorySlug: 'filtraciya', subcategorySlug: 'mehanicheskie-filtry' },
      { categorySlug: 'armatura-i-komplektuyuschie', subcategorySlug: 'sharovye-krany' },
    ],
  },
  {
    slug: 'otoplenie-doma',
    name: 'Отопление дома',
    title: 'Оборудование для отопления дома',
    description: 'Котлы, коллекторы, радиаторная арматура, циркуляционные насосы и безопасность котельной.',
    intro: 'Основные направления для теплогенерации, распределения и регулирования отопления.',
    guide: ['Тепловая нагрузка и вид топлива', 'Число контуров и тип отопительных приборов', 'Рабочие давление, температура и автоматика'],
    subcategories: [
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'kotly' },
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'kollektory' },
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'radiatornaya-armatura' },
      { categorySlug: 'nasosy', subcategorySlug: 'cirkulyacionnye-nasosy' },
      { categorySlug: 'armatura-i-komplektuyuschie', subcategorySlug: 'armatura-bezopasnosti' },
    ],
  },
  {
    slug: 'teplyy-pol',
    name: 'Водяной тёплый пол',
    title: 'Оборудование для водяного тёплого пола',
    description: 'Коллекторы, трубы PE-X и PE-RT, автоматика и арматура для контуров водяного теплого пола.',
    intro: 'Основные группы для распределения, укладки и управления контурами напольного отопления.',
    guide: ['Площадь и шаг укладки', 'Число и длина контуров', 'Температура теплоносителя и способ управления'],
    subcategories: [
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'teplyy-pol' },
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'kollektory' },
      { categorySlug: 'truby-i-fitingi', subcategorySlug: 'pex-i-metallopolimer' },
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'avtomatika-otopleniya' },
    ],
  },
  {
    slug: 'kanalizaciya-dlya-dachi',
    name: 'Канализация для дома и дачи',
    title: 'Канализация и водоотведение для дома и дачи',
    description: 'Внутренняя и наружная канализация, трапы, водостоки и локальная очистка стоков.',
    intro: 'Группы оборудования для приема и отвода стоков внутри здания и за его пределами.',
    guide: ['Схема трассы и диаметры', 'Внутренний или наружный монтаж', 'Число пользователей и условия отвода стоков'],
    subcategories: [
      { categorySlug: 'kanalizaciya', subcategorySlug: 'vnutrennyaya-kanalizaciya' },
      { categorySlug: 'kanalizaciya', subcategorySlug: 'naruzhnaya-kanalizaciya' },
      { categorySlug: 'kanalizaciya', subcategorySlug: 'trapy-i-dushevye-lotki' },
      { categorySlug: 'kanalizaciya', subcategorySlug: 'lokalnaya-ochistka' },
    ],
  },
  {
    slug: 'obvyazka-kotelnoy',
    name: 'Обвязка котельной',
    title: 'Оборудование для обвязки котельной',
    description: 'Коллекторы, циркуляционные насосы, арматура безопасности, редукторы и приборы контроля.',
    intro: 'Подборка основных групп для распределения теплоносителя, защиты и контроля котельной.',
    guide: ['Мощность и схема котельной', 'Число контуров и расчетные расходы', 'Рабочее давление, температура и автоматика'],
    subcategories: [
      { categorySlug: 'otoplenie-i-kotelnaya', subcategorySlug: 'kollektory' },
      { categorySlug: 'nasosy', subcategorySlug: 'cirkulyacionnye-nasosy' },
      { categorySlug: 'armatura-i-komplektuyuschie', subcategorySlug: 'armatura-bezopasnosti' },
      { categorySlug: 'armatura-i-komplektuyuschie', subcategorySlug: 'pribory-ucheta' },
      { categorySlug: 'armatura-i-komplektuyuschie', subcategorySlug: 'reduktory-davleniya' },
    ],
  },
  {
    slug: 'montazh-i-remont',
    name: 'Монтаж и ремонт',
    title: 'Инструмент и материалы для монтажа и ремонта',
    description: 'Пресс-инструмент, труборезы, крепеж, монтажные профили, уплотнители и расходные материалы.',
    intro: 'Основные группы инструмента, крепежа и расходников для монтажных работ.',
    guide: ['Материал и диаметр трубы', 'Тип соединения и профиль инструмента', 'Основание, нагрузка и условия монтажа'],
    subcategories: [
      { categorySlug: 'prochee-oborudovanie', subcategorySlug: 'press-instrument' },
      { categorySlug: 'prochee-oborudovanie', subcategorySlug: 'rezka-i-podgotovka-trub' },
      { categorySlug: 'krepezh-dlya-montazha', subcategorySlug: 'homuty' },
      { categorySlug: 'krepezh-dlya-montazha', subcategorySlug: 'montazhnye-profili' },
      { categorySlug: 'prochee-oborudovanie', subcategorySlug: 'uplotniteli-i-rashodniki' },
    ],
  },
];

export function getBuyerTasks(): BuyerTask[] {
  return buyerTasks;
}

export function getBuyerTaskBySlug(slug: string): BuyerTask | undefined {
  return buyerTasks.find((task) => task.slug === slug);
}
