export const siteConfig = {
  name: 'Сантехникъ',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://477477.ru',
  defaultTitle: 'Сантехникъ — инженерная сантехника и отопление',
  defaultDescription: 'Магазин сантехники и инженерных комплектующих в Саратове: каталог товаров, телефон, адрес и контакты.',
  locale: 'ru_RU',
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.siteUrl.replace(/\/$/, '')}${normalizedPath}`;
}
