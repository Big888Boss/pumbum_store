import legacyRedirects from '../../../content/generated/legacy-route-redirects.json';

type LegacyRedirectFile = {
  routes?: Record<string, string>;
  articles?: Record<string, string>;
};

const redirects = legacyRedirects as LegacyRedirectFile;
const catalogRoutes = redirects.routes ?? {};
const articleRoutes = redirects.articles ?? {};
const purposeCategoryRedirects: Record<string, string> = {
  '/catalog/nasosy-i-vodosnabzhenie': '/catalog/nasosy',
  '/catalog/kanalizaciya-i-vodootvedenie': '/catalog/kanalizaciya',
};

function normalizeSegment(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

export function getLegacyCatalogRedirect(segments: string[]): string | undefined {
  const path = `/catalog/${segments.map(normalizeSegment).join('/')}`;
  return purposeCategoryRedirects[path] ?? catalogRoutes[path];
}

export function getLegacyArticleRedirect(article: string): string | undefined {
  return articleRoutes[normalizeSegment(article)];
}
