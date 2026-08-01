export type MascotAsset = {
  src: string;
  narrowSrc?: string;
  name: string;
};

export type CategoryMascotAsset = {
  name: string;
  peekSrc: string;
  topPeekSrc: string;
  thoughtfulSrc: string;
  seatedSrc: string;
};

const poseAsset = (name: string, fileName: string): MascotAsset => ({
  src: `/images/mascots/pose-v2/${fileName}.webp`,
  name,
});

export const CATEGORY_MASCOTS: Record<string, CategoryMascotAsset> = {
  vodosnabzhenie: {
    name: 'Тепловик',
    peekSrc: '/images/mascots/pose-v2/teplovik-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/teplovik-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/teplovik-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/teplovik-seated-v2.webp',
  },
  kanalizaciya: {
    name: 'Стыкович',
    peekSrc: '/images/mascots/pose-v2/stykovich-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/stykovich-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/stykovich-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/stykovich-seated-v2.webp',
  },
  filtraciya: {
    name: 'Фильтрыч',
    peekSrc: '/images/mascots/pose-v2/filtrych-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/filtrych-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/filtrych-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/filtrych-seated-v2.webp',
  },
  nasosy: {
    name: 'Напорыч',
    peekSrc: '/images/mascots/pose-v2/naporych-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/naporych-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/naporych-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/naporych-seated-v2.webp',
  },
  'smesiteli-i-sifony': {
    name: 'Смесевич',
    peekSrc: '/images/mascots/pose-v2/smesevich-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/smesevich-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/smesevich-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/smesevich-seated-v2.webp',
  },
  'otoplenie-i-kotelnaya': {
    name: 'Бак Хлопотун',
    peekSrc: '/images/mascots/pose-v2/bak-hlopotun-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/bak-hlopotun-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/bak-hlopotun-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/bak-hlopotun-seated-v2.webp',
  },
  'krepezh-dlya-montazha': {
    name: 'Крепыч',
    peekSrc: '/images/mascots/pose-v2/krepych-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/krepych-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/krepych-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/krepych-seated-v2.webp',
  },
  'truby-i-fitingi': {
    name: 'Трубыч',
    peekSrc: '/images/mascots/pose-v2/trubych-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/trubych-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/trubych-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/trubych-seated-v2.webp',
  },
  'armatura-i-komplektuyuschie': {
    name: 'Арматурыч',
    peekSrc: '/images/mascots/pose-v2/armaturych-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/armaturych-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/armaturych-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/armaturych-seated-v2.webp',
  },
  'prochee-oborudovanie': {
    name: 'Крестович',
    peekSrc: '/images/mascots/pose-v2/krestovich-peek-v2.webp',
    topPeekSrc: '/images/mascots/pose-v4/krestovich-top-peek-v4.webp',
    thoughtfulSrc: '/images/mascots/pose-v2/krestovich-thoughtful-v2.webp',
    seatedSrc: '/images/mascots/pose-v2/krestovich-seated-v2.webp',
  },
};

export const MANUFACTURER_MASCOTS: MascotAsset[] = [
  poseAsset('Тепловик', 'teplovik-seated-v2'),
  poseAsset('Стыкович', 'stykovich-seated-v2'),
  poseAsset('Фильтрыч', 'filtrych-seated-v2'),
];

export const ABOUT_MASCOT: MascotAsset = poseAsset('Крепыч', 'krepych-thoughtful-v2');

export function getCategoryMascot(categorySlug: string): CategoryMascotAsset | undefined {
  return CATEGORY_MASCOTS[categorySlug];
}

export function getCategoryMascotPose(
  mascot: CategoryMascotAsset,
  pose: 'peek' | 'thoughtful' | 'seated',
): MascotAsset {
  const src = pose === 'peek' ? mascot.peekSrc : pose === 'thoughtful' ? mascot.thoughtfulSrc : mascot.seatedSrc;
  return {
    src,
    narrowSrc: pose === 'peek' ? mascot.topPeekSrc : undefined,
    name: mascot.name,
  };
}
