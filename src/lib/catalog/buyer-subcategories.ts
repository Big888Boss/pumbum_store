import type { Product } from '@/entities/product/model';

export type BuyerSubcategory = {
  categorySlug: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  selectionGuide: string;
  patterns: RegExp[];
};

const definitions: BuyerSubcategory[] = [
  {
    categorySlug: 'vodosnabzhenie',
    slug: 'emkosti-dlya-vody',
    name: 'Емкости для воды',
    title: 'Емкости и накопительные баки для воды в Саратове',
    description: 'Накопительные емкости и баки для хранения воды в системах водоснабжения дома, дачи и объекта.',
    intro: 'Емкости для хранения запаса воды и организации стабильного водоснабжения.',
    selectionGuide: 'Сравните полезный объем, форму, габариты, место установки и размеры подключений.',
    patterns: [/емкост|бак для воды|накопительн.*бак|\batv\b|\bath\b|\batp\b|\batq\b/],
  },
  {
    categorySlug: 'vodosnabzhenie',
    slug: 'gidroakkumulyatory',
    name: 'Гидроаккумуляторы',
    title: 'Гидроаккумуляторы и мембранные баки',
    description: 'Гидроаккумуляторы и мембранные баки для поддержания давления и защиты насосного оборудования.',
    intro: 'Баки для стабилизации давления, снижения числа включений насоса и создания рабочего запаса воды.',
    selectionGuide: 'Учитывайте объем, рабочее давление, исполнение мембраны и способ установки.',
    patterns: [/гидроаккум|мембранн.*бак/],
  },
  {
    categorySlug: 'vodosnabzhenie',
    slug: 'gibkaya-podvodka',
    name: 'Гибкая подводка для воды',
    title: 'Гибкая подводка для воды',
    description: 'Гибкие подводки для подключения сантехнического и инженерного оборудования.',
    intro: 'Подводки для компактного подключения приборов и оборудования к водопроводу.',
    selectionGuide: 'Проверьте длину, диаметр, тип резьбы, рабочее давление и температуру.',
    patterns: [/гибк.*подвод|подводка гибкая|шланг.*вод/],
  },
  {
    categorySlug: 'vodosnabzhenie',
    slug: 'zashchita-ot-protechek',
    name: 'Защита от протечек',
    title: 'Системы защиты от протечек воды',
    description: 'Датчики, контроллеры и исполнительные устройства для автоматической защиты от протечек.',
    intro: 'Автоматика, которая обнаруживает протечку и помогает перекрыть подачу воды.',
    selectionGuide: 'Уточните число зон контроля, тип кранов, питание и способ управления.',
    patterns: [/защит.*протеч|контрол.*протеч|датчик.*вод/],
  },
  {
    categorySlug: 'kanalizaciya',
    slug: 'naruzhnaya-kanalizaciya',
    name: 'Наружная канализация',
    title: 'Наружная канализация — трубы и фитинги',
    description: 'Трубы и фасонные части для наружных канализационных сетей и отвода стоков.',
    intro: 'Элементы наружной канализации для прокладки трасс вне здания.',
    selectionGuide: 'Подбирайте одну систему по диаметру, классу жесткости, глубине и схеме трассы.',
    patterns: [/наружн.*канализац|нпвх|оранжев.*канализац|sinekon standard outdoor/],
  },
  {
    categorySlug: 'kanalizaciya',
    slug: 'vnutrennyaya-kanalizaciya',
    name: 'Внутренняя канализация',
    title: 'Внутренняя канализация — трубы и фитинги',
    description: 'Трубы, отводы, тройники и переходы для внутренней канализации.',
    intro: 'Системы отвода бытовых стоков внутри здания, включая малошумные решения.',
    selectionGuide: 'Проверьте диаметр, тип раструба, шумовые требования и схему подключения приборов.',
    patterns: [/внутренн.*канализац|комфорт плюс|бесшумн.*канализац|сер(ая|ые).*канализац/],
  },
  {
    categorySlug: 'kanalizaciya',
    slug: 'trapy-i-dushevye-lotki',
    name: 'Трапы и душевые лотки',
    title: 'Трапы и душевые лотки',
    description: 'Трапы, душевые лотки и элементы точечного или линейного водоотведения.',
    intro: 'Решения для отвода воды из душевых, технических помещений и мокрых зон.',
    selectionGuide: 'Учитывайте длину, выпуск, монтажную высоту, пропускную способность и тип решетки.',
    patterns: [/душев.*лоток|трап|линейн.*водоотвод|лоток evolux/],
  },
  {
    categorySlug: 'kanalizaciya',
    slug: 'vodostoki',
    name: 'Водостоки',
    title: 'Внутренние водостоки и комплектующие',
    description: 'Воронки, трубы и комплектующие для организованного отвода дождевой и талой воды.',
    intro: 'Элементы водосточной системы для кровли и внутренних стояков.',
    selectionGuide: 'Проверьте тип кровли, диаметр выпуска, производительность и способ подключения.',
    patterns: [/водосток|водосточн|воронк.*кровл/],
  },
  {
    categorySlug: 'kanalizaciya',
    slug: 'lokalnaya-ochistka',
    name: 'Локальная очистка стоков',
    title: 'Автономная канализация и локальная очистка',
    description: 'Септики и системы локальной очистки стоков для частного дома и дачи.',
    intro: 'Оборудование для автономного приема и очистки хозяйственно-бытовых стоков.',
    selectionGuide: 'Для подбора нужны число пользователей, режим проживания, грунт и условия отвода очищенной воды.',
    patterns: [/септик|локальн.*очист|автономн.*канализац|сточн.*вод/],
  },
  {
    categorySlug: 'filtraciya',
    slug: 'promyvnye-filtry',
    name: 'Промывные фильтры',
    title: 'Промывные фильтры для воды',
    description: 'Промывные фильтры с удобным обслуживанием для систем водоснабжения и отопления.',
    intro: 'Фильтры, которые очищаются промывкой без полной разборки корпуса.',
    selectionGuide: 'Сравните размер подключения, тонкость фильтрации, расход и наличие манометра.',
    patterns: [/промывн.*фильтр|фильтр.*промыв/],
  },
  {
    categorySlug: 'filtraciya',
    slug: 'mehanicheskie-filtry',
    name: 'Механические фильтры',
    title: 'Фильтры механической очистки воды',
    description: 'Косые, прямые и сетчатые фильтры для защиты трубопроводной арматуры и оборудования.',
    intro: 'Компактные фильтры для задержания механических примесей.',
    selectionGuide: 'Проверьте размер резьбы, направление потока, материал корпуса и доступ для обслуживания.',
    patterns: [/фильтр механическ|фильтр косой|фильтр прямой|сетчат.*фильтр|грязевик/],
  },
  {
    categorySlug: 'filtraciya',
    slug: 'gryazeotdeliteli',
    name: 'Грязе- и шламоотделители',
    title: 'Грязеотделители и сепараторы для инженерных систем',
    description: 'Грязеотделители, шламоотделители и сепараторы для защиты оборудования.',
    intro: 'Оборудование для удаления загрязнений и воздуха из циркуляционных контуров.',
    selectionGuide: 'Учитывайте диаметр, расход, рабочее давление, температуру и место монтажа.',
    patterns: [/грязеотдел|шламоотдел|сепаратор.*гряз|дешламатор/],
  },
  {
    categorySlug: 'filtraciya',
    slug: 'komplektuyushchie-filtrov',
    name: 'Комплектующие для фильтров',
    title: 'Комплектующие и сменные элементы для фильтров',
    description: 'Сетки, колбы, картриджи и другие комплектующие для обслуживания фильтров.',
    intro: 'Сменные и монтажные элементы для фильтрационного оборудования.',
    selectionGuide: 'Сверьте модель фильтра, размер, материал и совместимость по артикулу.',
    patterns: [/картридж|сетка.*фильтр|колба.*фильтр|комплектующ.*фильтр|фильтр-дозатор/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'skvazhinnye-nasosy',
    name: 'Скважинные насосы',
    title: 'Скважинные насосы в Саратове',
    description: 'Погружные скважинные насосы для водоснабжения дома, дачи и объекта.',
    intro: 'Насосы для подъема воды из скважин с учетом глубины и требуемого напора.',
    selectionGuide: 'Нужны глубина скважины, динамический уровень, дебит, расход и длина трассы.',
    patterns: [/скважинн.*насос|погружн.*скваж/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'nasosnye-stancii',
    name: 'Насосные станции',
    title: 'Насосные станции для водоснабжения',
    description: 'Готовые и частотно-регулируемые насосные станции для дома и объекта.',
    intro: 'Комплектные станции для автоматической подачи воды и поддержания давления.',
    selectionGuide: 'Сравните производительность, напор, объем бака, автоматику и уровень шума.',
    patterns: [/насосн.*станц|станция.*насосн|частотн.*станц|инверторн.*станц/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'cirkulyacionnye-nasosy',
    name: 'Циркуляционные насосы',
    title: 'Циркуляционные насосы для отопления',
    description: 'Циркуляционные насосы для отопительных, котельных и рециркуляционных контуров.',
    intro: 'Насосы для движения теплоносителя в замкнутых инженерных системах.',
    selectionGuide: 'Проверьте расход, напор, монтажную длину, подключение и диапазон температур.',
    patterns: [/циркуляционн.*насос/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'poverhnostnye-nasosy',
    name: 'Поверхностные насосы',
    title: 'Поверхностные насосы для воды',
    description: 'Поверхностные насосы для подачи чистой воды и комплектации насосных установок.',
    intro: 'Насосы, которые устанавливаются вне источника воды.',
    selectionGuide: 'Учитывайте высоту всасывания, расход, напор, диаметр и режим работы.',
    patterns: [/поверхностн.*насос/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'drenazhnye-nasosy',
    name: 'Дренажные насосы',
    title: 'Дренажные и фекальные насосы',
    description: 'Дренажные и фекальные насосы для отвода воды и перекачивания стоков.',
    intro: 'Насосы для осушения, отвода загрязненной воды и дренажных задач.',
    selectionGuide: 'Сравните допустимый размер частиц, расход, напор, глубину погружения и автоматику.',
    patterns: [/дренажн.*насос|фекальн.*насос|\bdrainex\b/],
  },
  {
    categorySlug: 'nasosy',
    slug: 'kolodeznye-nasosy',
    name: 'Колодезные насосы',
    title: 'Колодезные насосы для водоснабжения',
    description: 'Погружные насосы для подачи воды из колодцев и неглубоких источников.',
    intro: 'Насосы для забора воды из колодцев и открытых резервуаров.',
    selectionGuide: 'Укажите глубину, уровень воды, требуемый расход и длину напорной линии.',
    patterns: [/колодезн.*насос/],
  },
  {
    categorySlug: 'smesiteli-i-sifony',
    slug: 'sifony',
    name: 'Сифоны',
    title: 'Сифоны для раковин и моек',
    description: 'Бутылочные, трубные и специальные сифоны для сантехнических приборов.',
    intro: 'Сифоны для подключения раковин, моек и другого сантехнического оборудования.',
    selectionGuide: 'Проверьте диаметр выпуска, подключение к канализации, наличие перелива и доступное место.',
    patterns: [/сифон/],
  },
  {
    categorySlug: 'smesiteli-i-sifony',
    slug: 'slivy-i-obvyazki',
    name: 'Сливы и обвязки',
    title: 'Сливы и обвязки для ванн и раковин',
    description: 'Сливы, выпуски, донные клапаны и обвязки для сантехнических приборов.',
    intro: 'Элементы выпуска воды и подключения ванн, раковин и моек.',
    selectionGuide: 'Учитывайте диаметр, перелив, тип управления и монтажные размеры.',
    patterns: [/обвязк|слив|выпуск|донн.*клапан/],
  },
  {
    categorySlug: 'smesiteli-i-sifony',
    slug: 'dushevye-komplektuyushchie',
    name: 'Душевые комплектующие',
    title: 'Душевые шланги, изливы и комплектующие',
    description: 'Шланги, изливы и другие комплектующие для смесителей и душевого оборудования.',
    intro: 'Комплектующие для ремонта и подключения душевого оборудования.',
    selectionGuide: 'Сверьте длину, размер резьбы, материал и конструкцию смесителя.',
    patterns: [/шланг.*душ|душев.*шланг|излив|аэратор|лейк/],
  },
  {
    categorySlug: 'otoplenie-i-kotelnaya',
    slug: 'kotly',
    name: 'Котлы',
    title: 'Котлы для отопления дома',
    description: 'Газовые, электрические и твердотопливные котлы для систем отопления.',
    intro: 'Основное теплогенерирующее оборудование для дома и объекта.',
    selectionGuide: 'Для подбора нужны тепловая нагрузка, вид топлива, число контуров и схема дымоудаления.',
    patterns: [/(^|\s)кот(е|ё)л(ы|а|ом|ов)?(\s|$)|электрокот|газов.*настенн.*zota/],
  },
  {
    categorySlug: 'otoplenie-i-kotelnaya',
    slug: 'kollektory',
    name: 'Коллекторы и коллекторные группы',
    title: 'Коллекторы и коллекторные группы отопления',
    description: 'Коллекторы, распределительные блоки и коллекторные группы для отопления и теплого пола.',
    intro: 'Узлы распределения теплоносителя по контурам инженерной системы.',
    selectionGuide: 'Учитывайте число выходов, расход, диаметр, наличие расходомеров и автоматики.',
    patterns: [/коллектор/],
  },
  {
    categorySlug: 'otoplenie-i-kotelnaya',
    slug: 'radiatornaya-armatura',
    name: 'Радиаторная арматура',
    title: 'Радиаторная арматура и узлы подключения',
    description: 'Клапаны, комплекты и узлы подключения радиаторов отопления.',
    intro: 'Арматура для подключения, регулирования и обслуживания радиаторных приборов.',
    selectionGuide: 'Проверьте схему подключения, резьбу, диаметр и необходимость терморегулирования.',
    patterns: [/радиатор/],
  },
  {
    categorySlug: 'otoplenie-i-kotelnaya',
    slug: 'teplyy-pol',
    name: 'Водяной теплый пол',
    title: 'Оборудование для водяного теплого пола',
    description: 'Узлы, автоматика и комплектующие для контуров водяного теплого пола.',
    intro: 'Компоненты распределения и регулирования напольного отопления.',
    selectionGuide: 'Нужны площадь, число контуров, шаг укладки, температура теплоносителя и схема управления.',
    patterns: [/тепл(ый|ого).*пол|напольн.*отоплен/],
  },
  {
    categorySlug: 'otoplenie-i-kotelnaya',
    slug: 'avtomatika-otopleniya',
    name: 'Автоматика отопления',
    title: 'Автоматика и управление отоплением',
    description: 'Термостаты, приводы, контроллеры и другие элементы управления отоплением.',
    intro: 'Устройства для поддержания температуры и управления контурами.',
    selectionGuide: 'Сверьте тип управления, питание, исполнительные устройства и схему подключения.',
    patterns: [/термостат|электропривод|контроллер|автоматик.*отоп|управлен.*отоп/],
  },
  {
    categorySlug: 'krepezh-dlya-montazha',
    slug: 'homuty',
    name: 'Хомуты для труб',
    title: 'Хомуты для крепления труб',
    description: 'Металлические и пластиковые хомуты для монтажа трубопроводов.',
    intro: 'Хомуты для надежной фиксации труб разных диаметров.',
    selectionGuide: 'Проверьте диаметр, нагрузку, наличие прокладки, шпильки и тип основания.',
    patterns: [/хомут/],
  },
  {
    categorySlug: 'krepezh-dlya-montazha',
    slug: 'montazhnye-profili',
    name: 'Монтажные профили и консоли',
    title: 'Монтажные профили, шины и консоли',
    description: 'Профили, шины, консоли и соединители для сборки монтажных конструкций.',
    intro: 'Элементы для сборки рам, опор и подвесных монтажных систем.',
    selectionGuide: 'Учитывайте расчетную нагрузку, длину пролета, тип соединителя и условия монтажа.',
    patterns: [/монтажн.*профил|монтажн.*шин|консол|система модульного монтажа/],
  },
  {
    categorySlug: 'krepezh-dlya-montazha',
    slug: 'klipsy-i-krepleniya',
    name: 'Клипсы и крепления',
    title: 'Клипсы и крепления для труб',
    description: 'Клипсы, фиксаторы и крепления для труб и инженерного оборудования.',
    intro: 'Компактные элементы крепления для открытого и скрытого монтажа.',
    selectionGuide: 'Сверьте диаметр трубы, материал основания, шаг крепления и условия эксплуатации.',
    patterns: [/клипс|креплен|фиксатор|держатель|скоба/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'nerzhaveyushchaya-stal',
    name: 'Нержавеющие трубы и фитинги',
    title: 'Трубы и фитинги из нержавеющей стали',
    description: 'Нержавеющие трубы, пресс-фитинги и соединения для инженерных систем.',
    intro: 'Коррозионностойкие трубопроводные системы из нержавеющей стали.',
    selectionGuide: 'Подбирайте трубу и фитинги одной системы по диаметру, профилю прессования и рабочим параметрам.',
    patterns: [/нержавеющ/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'polipropilen',
    name: 'Полипропиленовые трубы и фитинги',
    title: 'Полипропиленовые трубы и фитинги',
    description: 'Трубы и фитинги из полипропилена для водоснабжения и отопления.',
    intro: 'Полипропиленовые системы для сварного монтажа трубопроводов.',
    selectionGuide: 'Проверьте тип армирования, диаметр, серию давления и температурный режим.',
    patterns: [/полипропилен|\bppr\b/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'pex-i-metallopolimer',
    name: 'PE-X и металлополимерные системы',
    title: 'Трубы PE-X, PE-RT и металлополимерные системы',
    description: 'Трубы PE-X, PE-RT, металлопластик и совместимые соединения.',
    intro: 'Гибкие трубопроводные системы для воды, отопления и теплого пола.',
    selectionGuide: 'Сверьте материал, диаметр, толщину стенки и тип совместимого соединения.',
    patterns: [/\bpe-?x\b|\bpex\b|\bpe-?rt\b|металлополимер|металлопласт/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'aksialnye-fitingi',
    name: 'Аксиальные фитинги',
    title: 'Аксиальные фитинги и соединения',
    description: 'Аксиальные фитинги для монтажа труб с надвижной гильзой.',
    intro: 'Фитинги для надежных неразъемных аксиальных соединений.',
    selectionGuide: 'Сверьте систему трубы, диаметр, материал фитинга и требуемый монтажный инструмент.',
    patterns: [/аксиальн/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'rezbovye-soedineniya',
    name: 'Резьбовые соединения',
    title: 'Резьбовые фитинги и ремонтные соединения',
    description: 'Муфты, ниппели, сгоны, футорки и другие резьбовые соединения.',
    intro: 'Разборные соединительные элементы для монтажа и ремонта трубопроводов.',
    selectionGuide: 'Проверьте наружную и внутреннюю резьбу, размер, материал и рабочую среду.',
    patterns: [/резьбов|ниппел|футорк|сгон|американк|контргайк|бочонок/],
  },
  {
    categorySlug: 'truby-i-fitingi',
    slug: 'gazovye-soedineniya',
    name: 'Газовые фитинги и подводка',
    title: 'Газовые фитинги и подводка',
    description: 'Сильфонная подводка, фитинги и соединительные элементы для газовых систем.',
    intro: 'Специализированные соединения и подводки для газового оборудования.',
    selectionGuide: 'Сверьте назначение, тип резьбы, длину, сертификацию и требования проекта.',
    patterns: [/газов|сильфон/],
  },
  {
    categorySlug: 'armatura-i-komplektuyuschie',
    slug: 'sharovye-krany',
    name: 'Шаровые краны',
    title: 'Шаровые краны для воды и инженерных систем',
    description: 'Шаровые краны разных диаметров и исполнений для перекрытия потока.',
    intro: 'Запорная арматура для быстрого открытия и перекрытия трубопровода.',
    selectionGuide: 'Учитывайте среду, диаметр, резьбу, давление, материал и тип рукоятки.',
    patterns: [/шаров.*кран|кран шаровой|мини-кран/],
  },
  {
    categorySlug: 'armatura-i-komplektuyuschie',
    slug: 'reguliruyushchaya-armatura',
    name: 'Регулирующая арматура',
    title: 'Регулирующая и балансировочная арматура',
    description: 'Регулирующие и балансировочные клапаны для инженерных систем.',
    intro: 'Арматура для настройки расхода, давления и режима работы системы.',
    selectionGuide: 'Проверьте функцию, диапазон регулирования, размер подключения и рабочие параметры.',
    patterns: [/регулирующ|балансиров|вентил|термостат.*клапан/],
  },
  {
    categorySlug: 'armatura-i-komplektuyuschie',
    slug: 'armatura-bezopasnosti',
    name: 'Арматура безопасности',
    title: 'Арматура безопасности для инженерных систем',
    description: 'Предохранительные и обратные клапаны, воздухоотводчики и защитные устройства.',
    intro: 'Устройства для защиты оборудования и поддержания безопасного режима.',
    selectionGuide: 'Сверьте давление срабатывания, диаметр, температуру и назначение системы.',
    patterns: [/предохран|обратн.*клапан|воздухоотвод|группа безопасности/],
  },
  {
    categorySlug: 'armatura-i-komplektuyuschie',
    slug: 'reduktory-davleniya',
    name: 'Редукторы давления',
    title: 'Редукторы и регуляторы давления воды',
    description: 'Редукторы для снижения и стабилизации давления в трубопроводе.',
    intro: 'Арматура для защиты оборудования от избыточного давления.',
    selectionGuide: 'Учитывайте входное и выходное давление, расход, диаметр и наличие манометра.',
    patterns: [/редуктор|регулятор давления/],
  },
  {
    categorySlug: 'armatura-i-komplektuyuschie',
    slug: 'pribory-ucheta',
    name: 'Приборы учета и контроля',
    title: 'Приборы учета, манометры и контроль',
    description: 'Счетчики, манометры и измерительные приборы для инженерных систем.',
    intro: 'Оборудование для контроля давления, температуры и расхода.',
    selectionGuide: 'Проверьте измеряемый параметр, диапазон, класс точности и способ подключения.',
    patterns: [/прибор.*учет|счетчик|манометр|термометр/],
  },
  {
    categorySlug: 'prochee-oborudovanie',
    slug: 'press-instrument',
    name: 'Пресс-инструмент',
    title: 'Пресс-инструмент для монтажа труб',
    description: 'Ручной и электрический пресс-инструмент для монтажа фитингов.',
    intro: 'Инструмент для выполнения контролируемых пресс-соединений.',
    selectionGuide: 'Сверьте профиль прессования, диапазон диаметров, усилие и совместимые насадки.',
    patterns: [/пресс-инструмент|пресс-клещ|опрессовочн.*инструмент|пресс-машин/],
  },
  {
    categorySlug: 'prochee-oborudovanie',
    slug: 'rezka-i-podgotovka-trub',
    name: 'Резка и подготовка труб',
    title: 'Инструмент для резки и подготовки труб',
    description: 'Ножницы, труборезы, калибраторы и инструмент для подготовки трубы.',
    intro: 'Инструмент для точной резки, зачистки и калибровки перед соединением.',
    selectionGuide: 'Проверьте материал трубы, диапазон диаметров и требуемую операцию.',
    patterns: [/ножниц|труборез|резак|калибратор|зачист/],
  },
  {
    categorySlug: 'prochee-oborudovanie',
    slug: 'svarochnyy-instrument',
    name: 'Сварочный инструмент',
    title: 'Сварочный инструмент для полимерных труб',
    description: 'Сварочные аппараты и насадки для монтажа полимерных трубопроводов.',
    intro: 'Оборудование для раструбной сварки труб и фитингов.',
    selectionGuide: 'Сверьте систему, диапазон диаметров, мощность и комплект насадок.',
    patterns: [/сварочн.*аппарат|паяльник.*труб|насадк.*свар/],
  },
  {
    categorySlug: 'prochee-oborudovanie',
    slug: 'uplotniteli-i-rashodniki',
    name: 'Уплотнители и расходники',
    title: 'Уплотнители и расходные материалы для монтажа',
    description: 'Фум-лента, нить, уплотнительные кольца и другие монтажные расходники.',
    intro: 'Материалы для герметизации соединений и выполнения монтажных работ.',
    selectionGuide: 'Подбирайте материал по типу соединения, рабочей среде, температуре и давлению.',
    patterns: [/фум|уплотн|лента.*гермет|нить.*сантех|кольц.*резин/],
  },
];

function normalize(value: string | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

const productTextCache = new WeakMap<Product, string>();
const productSubcategoryCache = new WeakMap<Product, BuyerSubcategory | null>();

function getProductText(product: Product): string {
  const cached = productTextCache.get(product);
  if (cached) return cached;
  const text = normalize([
    product.name,
    product.shortDescription,
    product.purpose,
    product.specs['Раздел'],
    product.specs['Подраздел'],
    product.specs['Группа'],
    product.specs['Тип'],
    product.specs.type,
    product.specs.group,
  ].join(' '));
  productTextCache.set(product, text);
  return text;
}

export function getBuyerSubcategories(): BuyerSubcategory[] {
  return definitions;
}

export function getBuyerSubcategoriesByCategory(categorySlug: string): BuyerSubcategory[] {
  return definitions.filter((definition) => definition.categorySlug === categorySlug);
}

export function getBuyerSubcategoryBySlug(categorySlug: string, subcategorySlug: string): BuyerSubcategory | undefined {
  return definitions.find((definition) => (
    definition.categorySlug === categorySlug
    && definition.slug === subcategorySlug
  ));
}

export function getBuyerSubcategoryForProduct(product: Product): BuyerSubcategory | undefined {
  const cached = productSubcategoryCache.get(product);
  if (cached !== undefined) return cached ?? undefined;
  const text = getProductText(product);
  const definition = getBuyerSubcategoriesByCategory(product.categorySlug)
    .find((definition) => definition.patterns.some((pattern) => pattern.test(text)));
  productSubcategoryCache.set(product, definition ?? null);
  return definition;
}

export function productMatchesBuyerSubcategory(product: Product, definition: BuyerSubcategory): boolean {
  return getBuyerSubcategoryForProduct(product)?.slug === definition.slug;
}

export function getBuyerSubcategoryProducts(products: Product[], definition: BuyerSubcategory): Product[] {
  return products.filter((product) => productMatchesBuyerSubcategory(product, definition));
}

export function getBuyerGroupLabel(product: Product): string | undefined {
  return getBuyerSubcategoryForProduct(product)?.name;
}
