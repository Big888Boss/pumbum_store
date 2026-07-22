const baseUrl = (process.env.CATEGORY_TAXONOMY_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
const expectedPhone = '+7 (8452) 477-477';
const categories = [
  ['vodosnabzhenie', 'Водоснабжение', 'ATV 500', /atv|емкост|бак|гидроаккумулятор/i],
  ['kanalizaciya', 'Канализация', '504049.U', /канализац|локальной очистки|душевой лоток|трап/i],
  ['filtraciya', 'Фильтрация', 'Фильтр промывной', /фильтр|сепаратор/i],
  ['nasosy', 'Насосы', 'AUTO ADB-35', /насос/i],
  ['smesiteli-i-sifony', 'Смесители и сифоны', 'Сифон металлический', /сифон|обвязка|слив/i],
  ['otoplenie-i-kotelnaya', 'Отопление и котельная', 'ZOTA «Zuma»', /zota|котел/i],
  ['krepezh-dlya-montazha', 'Крепёж для монтажа', 'Профиль монтажный', /профиль|монтажная шина|хомут|клипса/i],
  ['truby-i-fitingi', 'Трубы и фитинги', 'Труба PEX-b/AL/PERT', /труба|трубопроводная система/i],
  ['armatura-i-komplektuyuschie', 'Арматура и комплектующие', 'Кран шаровой VALTEC BASE', /кран|клапан|вентиль|редуктор/i],
  ['prochee-oborudovanie', 'Прочее оборудование', 'Пресс-инструмент электрический', /инструмент|аппарат/i],
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
  const gridStart = page.body.indexOf('product-list-grid product-list-grid-with-images');
  const firstGridProduct = page.body.slice(gridStart, gridStart + 25_000).match(/<h3>(.*?)<\/h3>/s)?.[1]?.replace(/<[^>]+>/g, '') ?? '';
  assert(gridStart > 0 && firstProductPattern.test(firstGridProduct), `first product is not core for ${slug}: ${firstGridProduct}`);
}

const heating = await get('/catalog/otoplenie-i-kotelnaya');
for (const boiler of ['ZOTA «Zuma»', 'ZOTA «Solid-X»', 'ZOTA «Тополь-ВК»']) {
  assert(heating.body.includes(boiler), `heating carousel item is missing: ${boiler}`);
}
const heatingText = heating.body.replaceAll('<!-- -->', '');
assert(heatingText.includes('Основное оборудование · 1 из 3'), 'heating carousel counter is missing');

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
assert(locations.length === 9293, `expected 9293 sitemap URLs, got ${locations.length}`);
assert(new Set(locations).size === locations.length, 'sitemap contains duplicate URLs');
assert(!locations.some((url) => url.includes('/catalog/nasosy-i-vodosnabzhenie')), 'old pumps category remains in sitemap');
assert(!locations.some((url) => url.includes('/catalog/kanalizaciya-i-vodootvedenie')), 'old sewer category remains in sitemap');

console.log(JSON.stringify({
  baseUrl,
  products: health.catalog.products,
  categories: health.catalog.categories,
  sitemapUrls: locations.length,
  redirects: 3,
  phone: expectedPhone,
}, null, 2));
