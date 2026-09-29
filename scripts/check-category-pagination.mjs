import { performance } from 'node:perf_hooks';

const baseUrl = (process.env.CATEGORY_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const categoryPath = process.env.CATEGORY_TEST_PATH ?? '/catalog/truby-i-fitingi';
const configuredTotal = process.env.CATEGORY_TEST_TOTAL ? Number(process.env.CATEGORY_TEST_TOTAL) : undefined;
const pageSize = Number(process.env.CATEGORY_TEST_PAGE_SIZE ?? '24');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchPage(page, view = 'grid') {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (view === 'list') params.set('view', 'list');
  const url = `${baseUrl}${categoryPath}${params.size ? `?${params}` : ''}`;
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent': 'Mozilla/5.0 pumbum-pagination-check/1.0',
    },
  });
  const html = await response.text();
  assert(response.status === 200, `${url} returned ${response.status}`);
  return { html, latencyMs: performance.now() - startedAt, url };
}

function extractProductLinks(html, marker) {
  return (html.match(/<a\b[^>]*>/gi) ?? [])
    .filter((tag) => tag.includes(`class="${marker}"`))
    .map((tag) => tag.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&'))
    .filter(Boolean);
}

function extractCategoryTotal(html) {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/\s+/g, ' ');
  const match = text.match(/([\d\s]+)\s+позиц(?:ия|ии|ий)\s+в разделе/i);
  return match ? Number(match[1].replace(/\D/g, '')) : undefined;
}

const firstPage = await fetchPage(1);
const expectedTotal = configuredTotal ?? extractCategoryTotal(firstPage.html);
assert(Number.isSafeInteger(expectedTotal) && expectedTotal > 0, 'could not determine the category product total');
const pageCount = Math.ceil(expectedTotal / pageSize);
const seen = new Set();
const latencies = [];
const sizes = [];
let secondPageHtml = '';

for (let page = 1; page <= pageCount; page += 1) {
  const result = page === 1 ? firstPage : await fetchPage(page);
  const links = extractProductLinks(result.html, 'product-list-card product-list-card-with-image');
  const expectedOnPage = Math.min(pageSize, expectedTotal - ((page - 1) * pageSize));
  assert(links.length === expectedOnPage, `${result.url} has ${links.length} product cards, expected ${expectedOnPage}`);
  for (const link of links) {
    assert(!seen.has(link), `duplicate paginated product link: ${link}`);
    seen.add(link);
  }
  latencies.push(result.latencyMs);
  sizes.push(Buffer.byteLength(result.html));
  if (page === 2) secondPageHtml = result.html;
}

assert(seen.size === expectedTotal, `pagination exposes ${seen.size} unique products, expected ${expectedTotal}`);
const robotsTag = (secondPageHtml.match(/<meta\b[^>]*>/gi) ?? []).find((tag) => tag.includes('name="robots"')) ?? '';
assert(robotsTag.includes('noindex') && robotsTag.includes('follow'), 'paginated category must be noindex,follow');

const listResult = await fetchPage(2, 'list');
const listLinks = extractProductLinks(listResult.html, 'product-row');
assert(listLinks.length === pageSize, `list view has ${listLinks.length} rows, expected ${pageSize}`);

latencies.sort((a, b) => a - b);
console.log(JSON.stringify({
  baseUrl,
  categoryPath,
  expectedTotal,
  pageSize,
  pageCount,
  uniqueProducts: seen.size,
  listPageRows: listLinks.length,
  htmlBytes: {
    min: Math.min(...sizes),
    max: Math.max(...sizes),
  },
  latencyMs: {
    min: Math.round(latencies[0]),
    p50: Math.round(latencies[Math.floor(latencies.length / 2)]),
    max: Math.round(latencies[latencies.length - 1]),
  },
}, null, 2));
