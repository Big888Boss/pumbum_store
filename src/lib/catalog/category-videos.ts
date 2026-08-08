export type CategoryVideo = {
  slug: string;
  label: string;
  src: string;
  poster: string;
};

const categoryVideos = {
  vodosnabzhenie: 'Ёмкость для хранения воды',
  kanalizaciya: 'Локальная система очистки стоков',
  filtraciya: 'Фильтр с манометром',
  nasosy: 'Насосное оборудование',
  'smesiteli-i-sifony': 'Слив-перелив для ванны',
  'otoplenie-i-kotelnaya': 'Котёл в разрезе',
  'krepezh-dlya-montazha': 'Трубный хомут',
  'truby-i-fitingi': 'Трубы из нержавеющей стали',
  'armatura-i-komplektuyuschie': 'Шаровой кран',
  'prochee-oborudovanie': 'Опрессовочный насос',
} as const;

export function getCategoryVideo(categorySlug: string): CategoryVideo | undefined {
  const label = categoryVideos[categorySlug as keyof typeof categoryVideos];
  if (!label) return undefined;

  return {
    slug: categorySlug,
    label,
    src: `/videos/categories/${categorySlug}.mp4`,
    poster: `/videos/categories/posters/${categorySlug}.jpg`,
  };
}

export const categoryVideoSlugs = Object.freeze(Object.keys(categoryVideos));
