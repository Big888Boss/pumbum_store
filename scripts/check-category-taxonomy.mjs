const baseUrl = (process.env.CATEGORY_TAXONOMY_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const navigationConcurrency = Math.max(1, Math.min(8, Number(process.env.CATEGORY_NAVIGATION_CONCURRENCY ?? '3')));
const expectedPhone = '+7 (8452) 477-477';
const categories = [
  ['vodosnabzhenie', 'Водоснабжение', 'ATV 500', /atv|емкост|бак|гидроаккумулятор/i],
  ['kanalizaciya', 'Канализация', 'Труба однораструбная L=1000', /канализац|локальной очистки|душевой лоток|трап/i],
  ['filtraciya', 'Фильтрация', 'Фильтр механической очистки промывной каскадный', /фильтр|сепаратор/i],
  ['nasosy', 'Насосы', 'AUTO ADB-35', /насос/i],
  ['smesiteli-i-sifony', 'Смесители и сифоны', 'Сифон металлический', /сифон|обвязка|слив/i],
  ['otoplenie-i-kotelnaya', 'Отопление и котельная', 'ZOTA «Zuma»', /zota|котел/i],
  ['krepezh-dlya-montazha', 'Крепёж для монтажа', 'Хомуты металлические с резиновой прокладкой', /профиль|монтажная шина|хомут|клипса/i],
  ['truby-i-fitingi', 'Трубы и фитинги', 'Труба из нержавеющей стали', /труба|трубопроводная система/i],
  ['armatura-i-komplektuyuschie', 'Арматура и комплектующие', 'Кран шаровой VALTEC BASE', /кран|клапан|вентиль|редуктор/i],
  ['prochee-oborudovanie', 'Инструмент и расходные материалы', 'Пресс-инструмент электрический', /инструмент|аппарат/i],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: options.redirect ?? 'follow',
    headers: {
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent': 'Mozilla/5.0 pumbum-category-taxonomy-check/1.0',
    },
  });
  return { response, body: await response.text() };
}

const healthResult = await get('/api/health');
assert(healthResult.response.ok, `/api/health returned ${healthResult.response.status}`);
const health = JSON.parse(healthResult.body);
assert(health.catalog?.products === 9276, `expected 9276 products, got ${health.catalog?.products}`);
assert(health.catalog?.publishedProducts === 9276, `expected 9276 published products, got ${health.catalog?.publishedProducts}`);
assert(health.catalog?.categories === 10, `expected 10 categories, got ${health.catalog?.categories}`);

const catalog = await get('/catalog');
assert(catalog.response.ok, `/catalog returned ${catalog.response.status}`);
assert(catalog.body.includes(expectedPhone), 'new phone format is missing from /catalog');
assert(!catalog.body.includes('47-74-77'), 'old phone format is still present on /catalog');

for (const [slug, name, featuredText, firstProductPattern] of categories) {
  assert(catalog.body.includes(`/catalog/${slug}`), `catalog link is missing for ${slug}`);
  const page = await get(`/catalog/${slug}`);
  assert(page.response.ok, `/catalog/${slug} returned ${page.response.status}`);
  assert(page.body.includes(name), `category heading is missing for ${slug}`);
  assert(page.body.includes(featuredText), `representative product is missing for ${slug}: ${featuredText}`);
  assert(page.body.includes(expectedPhone), `new phone format is missing from ${slug}`);
  assert(!page.body.includes('Популярный товар'), `unsupported popularity claim remains in ${slug}`);
  assert(!page.body.includes('Основной товар раздела'), `old featured-product label remains in ${slug}`);
  const groupAttribute = page.body.match(/data-carousel-groups="([^"]+)"/)?.[1] ?? '';
  const carouselGroups = groupAttribute.split('|').filter(Boolean);
  const expectedCarouselSize = slug === 'krepezh-dlya-montazha' ? 2 : 3;
  assert(
    page.body.includes(`data-carousel-size="${expectedCarouselSize}"`),
    `${expectedCarouselSize}-item carousel is missing for ${slug}`,
  );
  assert(
    carouselGroups.length === expectedCarouselSize,
    `carousel group labels are missing for ${slug}: ${groupAttribute}`,
  );
  assert(
    new Set(carouselGroups).size === expectedCarouselSize,
    `carousel repeats a product group for ${slug}: ${groupAttribute}`,
  );
  const gridStart = page.body.indexOf('product-list-grid product-list-grid-with-images');
  const firstGridProduct = page.body.slice(gridStart, gridStart + 25_000).match(/<h3>(.*?)<\/h3>/s)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
  assert(gridStart > 0 && firstProductPattern.test(firstGridProduct), `first product is not core for ${slug}: ${firstGridProduct}`);
}

const heating = await get('/catalog/otoplenie-i-kotelnaya');
for (const group of ['Котлы', 'Коллекторы и коллекторные группы', 'Радиаторная арматура']) {
  assert(heating.body.includes(group), `heating carousel direction is missing: ${group}`);
}
assert(heating.body.replaceAll('<!-- -->', '').includes('Рекомендуемые товары · 1 из 3'), 'heating carousel counter is missing');

for (const [path, asset] of [
  ['/catalog/kanalizaciya', '/images/category-showcase/sinikon-sewer-pipe-detail.png'],
  ['/catalog/krepezh-dlya-montazha', '/images/category-showcase/sinikon-clamp-km038-detail.png'],
  ['/catalog/truby-i-fitingi', '/images/category-showcase/valtec-stainless-pipe-detail.png'],
]) {
  const page = await get(path);
  assert(page.body.includes(asset), `${path} does not use ${asset}`);
}

for (const [source, destination] of [
  ['/catalog/nasosy-i-vodosnabzhenie', '/catalog/nasosy'],
  ['/catalog/kanalizaciya-i-vodootvedenie', '/catalog/kanalizaciya'],
  ['/catalog/otoplenie-i-kotelnaya/latunnye-aksialnye-fitingi-fa160001', '/catalog/truby-i-fitingi/latunnye-aksialnye-fitingi-fa160001'],
]) {
  const moved = await get(source, { redirect: 'manual' });
  assert(moved.response.status === 308, `${source} expected 308, got ${moved.response.status}`);
  assert(new URL(moved.response.headers.get('location'), baseUrl).pathname === destination, `${source} redirects to unexpected location`);
}

const sitemap = await get('/sitemap.xml');
assert(sitemap.response.ok, `/sitemap.xml returned ${sitemap.response.status}`);
const locations = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(locations.length > 9293, `expected new navigation routes in sitemap, got ${locations.length}`);
assert(new Set(locations).size === locations.length, 'sitemap contains duplicate URLs');
assert(locations.filter((url) => url.includes('/podrazdel/')).length >= 30, 'too few buyer subcategory routes in sitemap');
assert(locations.filter((url) => url.includes('/catalog/po-zadache/')).length === 6, 'buyer task routes are incomplete');
assert(locations.filter((url) => /\/catalog\/proizvoditeli\/[^/]+$/.test(url)).length === 9, 'manufacturer routes are incomplete');
assert(!locations.some((url) => url.includes('/catalog/nasosy-i-vodosnabzhenie')), 'old pumps category remains in sitemap');
assert(!locations.some((url) => url.includes('/catalog/kanalizaciya-i-vodootvedenie')), 'old sewer category remains in sitemap');

const navigationLocations = locations.filter((url) => (
  url.includes('/podrazdel/')
  || url.includes('/catalog/po-zadache/')
  || /\/catalog\/proizvoditeli\/[^/]+$/.test(url)
));
for (let index = 0; index < navigationLocations.length; index += navigationConcurrency) {
  const batch = navigationLocations.slice(index, index + navigationConcurrency);
  const results = await Promise.all(batch.map((url) => get(new URL(url).pathname)));
  results.forEach(({ response, body }, resultIndex) => {
    const url = batch[resultIndex];
    assert(response.ok, `${url} returned ${response.status}`);
    assert(body.includes('<h1'), `${url} has no page heading`);
    assert(body.includes('product-list-card product-list-card-with-image'), `${url} has no product cards`);
  });
}

console.log(JSON.stringify({
  baseUrl,
  products: health.catalog.products,
  categories: health.catalog.categories,
  sitemapUrls: locations.length,
  redirects: 3,
  buyerSubcategories: locations.filter((url) => url.includes('/podrazdel/')).length,
  buyerTasks: 6,
  manufacturers: 9,
  navigationRoutesChecked: navigationLocations.length,
  navigationConcurrency,
  phone: expectedPhone,
}, null, 2));
