export type MascotAsset = {
  src: string;
  name: string;
};

export const CATEGORY_MASCOTS: Record<string, MascotAsset> = {
  vodosnabzhenie: { src: '/images/mascots/bak-hlopotun-trail.webp', name: 'Бак Хлопотун' },
  kanalizaciya: { src: '/images/mascots/stykovich-guide.webp', name: 'Стыкович' },
  filtraciya: { src: '/images/mascots/filtrych-guide.webp', name: 'Фильтрыч' },
  nasosy: { src: '/images/mascots/naporych-guide.webp', name: 'Напорыч' },
  'smesiteli-i-sifony': { src: '/images/mascots/smesevich-guide.webp', name: 'Смесевич' },
  'otoplenie-i-kotelnaya': { src: '/images/mascots/teplovik-trail.webp', name: 'Тепловик' },
  'krepezh-dlya-montazha': { src: '/images/mascots/krepych-guide.webp', name: 'Крепыч' },
  'truby-i-fitingi': { src: '/images/mascots/trubych-guide.webp', name: 'Трубыч' },
  'armatura-i-komplektuyuschie': { src: '/images/mascots/armaturych-guide.webp', name: 'Арматурыч' },
  'prochee-oborudovanie': { src: '/images/mascots/krestovich-trail.webp', name: 'Крестович' },
};

export const GENERAL_MASCOTS: MascotAsset[] = [
  { src: '/images/mascots/kaplya-guide.webp', name: 'Капля' },
  { src: '/images/mascots/skvazhinnik-guide.webp', name: 'Скважинник' },
  { src: '/images/mascots/krepych-guide.webp', name: 'Крепыч' },
  { src: '/images/mascots/smesevich-guide.webp', name: 'Смесевич' },
  { src: '/images/mascots/armaturych-guide.webp', name: 'Арматурыч' },
  { src: '/images/mascots/filtrych-guide.webp', name: 'Фильтрыч' },
];

export function getCategoryMascot(categorySlug: string | undefined): MascotAsset | undefined {
  return categorySlug ? CATEGORY_MASCOTS[categorySlug] : undefined;
}
