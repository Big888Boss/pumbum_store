import { chromium } from 'playwright';

const baseUrl = (process.env.COLLECTION_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertCollectionControls(page, { brandFilter }) {
  const collection = page.locator('[data-catalog-collection]');
  await collection.waitFor();
  assert(await collection.locator('#collection-search').count() === 1, 'collection search is missing');
  assert(await collection.locator('.filter-drawer').count() === 1, 'collection filters are missing');
  assert(await collection.locator('a', { hasText: 'Сначала дешевле' }).count() === 1, 'ascending price sort is missing');
  assert(await collection.locator('a', { hasText: 'Сначала дороже' }).count() === 1, 'descending price sort is missing');
  assert(await collection.locator('a', { hasText: 'Список без фото' }).count() === 1, 'list view switch is missing');
  assert(
    await collection.locator('select[name="brand"]').count() === (brandFilter ? 1 : 0),
    brandFilter ? 'brand filter is missing' : 'manufacturer page repeats the brand filter',
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ru-RU',
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 pumbum-collection-check/1.0 Chrome/130 Safari/537.36',
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/catalog/proizvoditeli`, { waitUntil: 'domcontentloaded' });
  const cards = page.locator('.manufacturer-card');
  const manufacturerCardCount = await cards.count();
  assert(manufacturerCardCount >= 8, 'manufacturer cards are missing');
  const firstCard = cards.first();
  const sectionLinks = firstCard.locator('.manufacturer-sections a[href*="?group="]');
  assert(await sectionLinks.count() > 0, 'manufacturer section labels are not clickable');
  const sectionHref = await sectionLinks.first().getAttribute('href');
  assert(sectionHref && sectionHref.includes('/catalog/proizvoditeli/') && sectionHref.includes('group='), 'manufacturer group link is malformed');
  const cardGap = await cards.evaluateAll((elements) => {
    if (elements.length < 2) return 0;
    const first = elements[0].getBoundingClientRect();
    const second = elements[1].getBoundingClientRect();
    return Math.round(second.top - first.bottom);
  });
  assert(cardGap >= 20, `manufacturer cards are too close (${cardGap}px)`);

  await page.goto(`${baseUrl}/catalog/proizvoditeli/valtec`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('.hero .manufacturer-logo').count() === 0, 'manufacturer logo is repeated in the detail hero');
  assert(await page.locator('.hero .eyebrow').count() === 0, 'manufacturer eyebrow is repeated in the detail hero');
  await assertCollectionControls(page, { brandFilter: false });
  const manufacturerGroups = page.locator('.catalog-groups a');
  assert(await manufacturerGroups.count() > 0, 'manufacturer group navigation is missing');
  const manufacturerGroupHref = await manufacturerGroups.first().getAttribute('href');
  assert(manufacturerGroupHref?.includes('group='), 'manufacturer group navigation does not preserve a group filter');

  await page.goto(`${baseUrl}/catalog/proizvoditeli/valtec?view=list&sort=price_asc`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('.product-rows .product-row').count() > 0, 'manufacturer list view is empty');
  assert(await page.locator('meta[name="robots"]').getAttribute('content').then((value) => value?.includes('noindex')), 'stateful manufacturer page is indexable');

  await page.goto(`${baseUrl}/catalog/po-zadache/voda-iz-skvazhiny`, { waitUntil: 'domcontentloaded' });
  await assertCollectionControls(page, { brandFilter: true });
  const taskGroupLinks = page.locator('.hero .badges a[href*="?group="]');
  assert(await taskGroupLinks.count() >= 4, 'task group labels are not clickable');

  await page.goto(`${baseUrl}/catalog/po-zadache/voda-iz-skvazhiny?q=насос&view=list&sort=price_desc`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('.product-rows .product-row').count() > 0, 'task search/list view is empty');
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  assert(robots?.includes('noindex') && robots.includes('follow'), 'stateful task page does not use noindex,follow');
  assert(await page.locator('.active-filters', { hasText: 'Поиск: насос' }).count() === 1, 'task search state is not visible');

  assert(pageErrors.length === 0, `browser page errors: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({
    baseUrl,
    manufacturerCards: manufacturerCardCount,
    manufacturerCardGapPx: cardGap,
    manufacturerTagsClickable: true,
    manufacturerControls: true,
    taskControls: true,
    statefulPagesNoindexFollow: true,
    pageErrors,
  }, null, 2));
} finally {
  await browser.close();
}
