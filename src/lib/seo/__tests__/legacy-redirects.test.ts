import { describe, expect, it } from 'vitest';
import { getLegacyArticleRedirect, getLegacyCatalogRedirect } from '@/lib/seo/legacy-redirects';
import legacyRedirects from '../../../../content/generated/legacy-route-redirects.json';

type LegacyRedirectFile = { routes?: Record<string, string>; articles?: Record<string, string> };
const file = legacyRedirects as LegacyRedirectFile;
const routes = file.routes ?? {};
const articles = file.articles ?? {};

describe('getLegacyCatalogRedirect', () => {
  it('redirects legacy manufacturer roots to the manufacturers page', () => {
    expect(getLegacyCatalogRedirect(['aquario'])).toBe('/catalog/proizvoditeli#aquario');
  });

  it('maps every generated legacy route to its target', () => {
    const entries = Object.entries(routes);
    expect(entries.length).toBeGreaterThan(0);
    for (const [path, target] of entries.slice(0, 200)) {
      const segments = path.replace(/^\/catalog\//, '').split('/');
      expect(getLegacyCatalogRedirect(segments), path).toBe(target);
    }
  });

  it('prefers purpose-category redirects over generated routes', () => {
    expect(getLegacyCatalogRedirect(['nasosy-i-vodosnabzhenie'])).toBe('/catalog/nasosy');
    expect(getLegacyCatalogRedirect(['kanalizaciya-i-vodootvedenie'])).toBe('/catalog/kanalizaciya');
  });

  it('normalizes case and whitespace in segments', () => {
    expect(getLegacyCatalogRedirect([' AQUARIO '])).toBe('/catalog/proizvoditeli#aquario');
  });

  it('returns undefined for unknown paths', () => {
    expect(getLegacyCatalogRedirect(['definitely-unknown-segment-xyz'])).toBeUndefined();
    expect(getLegacyCatalogRedirect([])).toBeUndefined();
  });
});

describe('getLegacyArticleRedirect', () => {
  it('maps known legacy article ids to product URLs', () => {
    const [article, target] = Object.entries(articles)[0];
    expect(getLegacyArticleRedirect(article)).toBe(target);
    expect(getLegacyArticleRedirect(` ${article.toUpperCase()} `)).toBe(target);
  });

  it('returns undefined for unknown articles', () => {
    expect(getLegacyArticleRedirect('no-such-article-000')).toBeUndefined();
  });
});
