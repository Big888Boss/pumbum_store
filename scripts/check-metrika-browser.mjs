import { chromium } from 'playwright';

const baseUrl = (process.env.METRIKA_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const productPath = process.env.METRIKA_TEST_PRODUCT_PATH ?? '/catalog/nasosy-i-vodosnabzhenie/espa-167577';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readCalls(page) {
  return page.evaluate(() => window.__metrikaTestCalls ?? []);
}

async function waitForCall(page, method, name, count = 1) {
  await page.waitForFunction(
    ({ expectedMethod, expectedName, expectedCount }) => (
      (window.__metrikaTestCalls ?? []).filter((call) => call[1] === expectedMethod && (expectedName === undefined || call[2] === expectedName)).length >= expectedCount
    ),
    { expectedMethod: method, expectedName: name, expectedCount: count },
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ru-RU',
  userAgent: 'Mozilla/5.0 pumbum-metrika-check/1.0 Chrome/130 Safari/537.36',
});

await context.route(/https:\/\/mc\.yandex\.(ru|com)\//, (route) => route.abort());
await context.addInitScript(() => {
  window.__metrikaTestCalls = [];
  window.ym = (...args) => window.__metrikaTestCalls.push(args);
});

const page = await context.newPage();
const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForCall(page, 'init');
  await waitForCall(page, 'hit');
  let calls = await readCalls(page);
  assert(calls.filter((call) => call[1] === 'hit').length === 1, 'home pageview was duplicated');

  const catalogNav = page.locator('nav.nav-desktop a[href="/catalog"]');
  await catalogNav.click();
  await page.waitForURL(`${baseUrl}/catalog`);
  await waitForCall(page, 'hit', undefined, 2);
  calls = await readCalls(page);
  assert(calls.filter((call) => call[1] === 'hit').length === 2, 'SPA catalog pageview was duplicated');

  const catalogSearch = page.locator('form.search-panel');
  await catalogSearch.locator('input[name="q"]').fill('privacy-check');
  await catalogSearch.evaluate((form) => form.addEventListener('submit', (event) => event.preventDefault(), { once: true, capture: true }));
  await catalogSearch.locator('button[type="submit"]').click();
  await waitForCall(page, 'reachGoal', 'search_submit');
  calls = await readCalls(page);
  const searchGoal = calls.find((call) => call[1] === 'reachGoal' && call[2] === 'search_submit');
  assert(searchGoal?.[3]?.query_length === 13, 'search goal has an incorrect query length');
  assert(!Object.hasOwn(searchGoal?.[3] ?? {}, 'query'), 'search goal leaked the raw query');

  const phone = page.locator('a.phone-link-desktop');
  await phone.evaluate((link) => link.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
  await phone.click();
  await waitForCall(page, 'reachGoal', 'click_phone');

  await page.goto(`${baseUrl}${productPath}`, { waitUntil: 'domcontentloaded' });
  await waitForCall(page, 'hit');
  await waitForCall(page, 'reachGoal', 'view_product');
  const orderLink = page.locator('a.btn.btn-primary[href^="/contacts?"]');
  await orderLink.evaluate((link) => link.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
  await orderLink.click();
  await waitForCall(page, 'reachGoal', 'click_order');

  await page.goto(`${baseUrl}/contacts`, { waitUntil: 'domcontentloaded' });
  await waitForCall(page, 'hit');
  const email = page.locator('a.btn[href^="mailto:"]');
  await email.evaluate((link) => link.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
  await email.click();
  await waitForCall(page, 'reachGoal', 'click_email');

  console.log(JSON.stringify({
    baseUrl,
    yandexRequestsBlocked: true,
    initialPageviewCount: 1,
    spaNavigationPageviewCount: 1,
    verifiedGoals: ['search_submit', 'click_phone', 'click_email', 'view_product', 'click_order'],
    rawSearchQuerySent: false,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    calls: await readCalls(page),
    state: await page.evaluate(() => ({
      initialized: window.__pumbumMetrikaInitialized,
      lastPageview: window.__pumbumLastMetrikaPageview,
      pending: window.__pumbumMetrikaPending,
      readyState: document.readyState,
    })),
    consoleMessages,
    pageErrors,
    failedRequests,
  }, null, 2));
  throw error;
} finally {
  await browser.close();
}
