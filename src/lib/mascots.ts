export type MascotAsset = {
  src: string;
  name: string;
};

export const CATEGORY_MASCOTS: Record<string, MascotAsset> = {
  vodosnabzhenie: { src: '/images/mascots/teplovik-trail.webp', name: 'Тепловик' },
  kanalizaciya: { src: '/images/mascots/stykovich-guide.webp', name: 'Стыкович' },
  filtraciya: { src: '/images/mascots/filtrych-guide.webp', name: 'Фильтрыч' },
  nasosy: { src: '/images/mascots/naporych-guide.webp', name: 'Напорыч' },
  'smesiteli-i-sifony': { src: '/images/mascots/smesevich-guide.webp', name: 'Смесевич' },
  'otoplenie-i-kotelnaya': { src: '/images/mascots/bak-hlopotun-trail.webp', name: 'Бак Хлопотун' },
  'krepezh-dlya-montazha': { src: '/images/mascots/krepych-guide.webp', name: 'Крепыч' },
  'truby-i-fitingi': { src: '/images/mascots/trubych-guide.webp', name: 'Трубыч' },
  'armatura-i-komplektuyuschie': { src: '/images/mascots/armaturych-guide.webp', name: 'Арматурыч' },
  'prochee-oborudovanie': { src: '/images/mascots/krestovich-trail.webp', name: 'Крестович' },
};

export const MANUFACTURER_MASCOTS: MascotAsset[] = [
  { src: '/images/mascots/skvazhinnik-guide.webp', name: 'Скважинник' },
  { src: '/images/mascots/kaplya-guide.webp', name: 'Капля' },
  { src: '/images/mascots/krepych-guide.webp', name: 'Крепыч' },
];

export const ABOUT_MASCOT: MascotAsset = {
  src: '/images/mascots/kaplya-guide.webp',
  name: 'Капля',
};

export function getCategoryMascot(categorySlug: string): MascotAsset | undefined {
  return CATEGORY_MASCOTS[categorySlug];
}
