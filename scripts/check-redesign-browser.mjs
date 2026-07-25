import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.REDESIGN_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const outputDir = process.env.REDESIGN_TEST_OUTPUT_DIR ?? '/tmp/pumbum-redesign-browser';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectPage(page, label) {
  const state = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    theme: document.documentElement.dataset.theme ?? 'dark',
  }));
  assert(state.h1, `${label}: H1 is missing`);
  assert(!state.horizontalOverflow, `${label}: horizontal overflow detected`);
  return state;
}

function collectRuntimeErrors(page, target) {
  page.on('pageerror', (error) => target.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') target.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.startsWith(baseUrl)) return;
    const errorText = request.failure()?.errorText ?? 'unknown';
    const isCancelledNextPrefetch = errorText === 'net::ERR_ABORTED' && new URL(url).searchParams.has('_rsc');
    if (isCancelledNextPrefetch) return;
    target.push(`requestfailed: ${url} :: ${errorText}`);
  });
}

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    })
    .every((image) => image.complete), null, { timeout: 20_000 });
}

async function assertVisibleImagesLoaded(page, label) {
  const broken = await page.locator('img:visible').evaluateAll((images) => images
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.getAttribute('src') ?? 'unknown'));
  assert(broken.length === 0, `${label}: broken visible images: ${broken.join(', ')}`);
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const runtimeErrors = [];

try {
  const desktop = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 pumbum-redesign-browser-check/1.0 Chrome/130 Safari/537.36',
  });
  const page = await desktop.newPage();
  collectRuntimeErrors(page, runtimeErrors);

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForImages(page);
  const homeDark = await inspectPage(page, 'desktop home dark');
  assert(homeDark.theme === 'dark', 'desktop home: dark theme is not the default');
  assert((await page.locator('.category-card').count()) === 10, 'desktop home: expected ten category cards');
  await assertVisibleImagesLoaded(page, 'desktop home dark');
  await page.screenshot({ path: join(outputDir, 'home-desktop-dark.png') });

  const themeToggle = page.getByRole('button', { name: 'Переключить цветовую тему' });
  await themeToggle.click();
  assert(await page.locator('html').getAttribute('data-theme') === 'light', 'desktop theme toggle did not enable light mode');
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert(await page.locator('html').getAttribute('data-theme') === 'light', 'desktop light theme did not persist');
  await page.screenshot({ path: join(outputDir, 'home-desktop-light.png') });
  await themeToggle.click();

  await page.goto(`${baseUrl}/catalog`, { waitUntil: 'domcontentloaded' });
  const catalog = await inspectPage(page, 'desktop catalog');
  assert(catalog.h1 === 'Каталог товаров по назначению', 'desktop catalog: unexpected H1');
  assert((await page.locator('.category-card').count()) === 10, 'desktop catalog: expected ten category cards');
  await page.screenshot({ path: join(outputDir, 'catalog-desktop-dark.png') });

  await page.getByRole('searchbox').fill('ESPA');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await page.waitForURL(`${baseUrl}/search?q=ESPA`);
  assert((await page.locator('.product-list-card').count()) === 36, 'desktop search: expected first 36 ESPA results');
  const firstProductHref = await page.locator('.product-list-card').first().getAttribute('href');
  assert(firstProductHref, 'desktop search: first product link is missing');
  await page.goto(new URL(firstProductHref, baseUrl).href, { waitUntil: 'domcontentloaded' });
  await waitForImages(page);
  await assertVisibleImagesLoaded(page, 'desktop product');
  assert((await page.locator('a[href^="/contacts?"]').count()) >= 1, 'desktop product: contact CTA is missing');
  await page.screenshot({ path: join(outputDir, 'product-desktop-dark.png') });

  await page.goto(`${baseUrl}/delivery`, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('.info-tabs a').count()) === 3, 'desktop delivery: information tabs are incomplete');
  await page.locator('.info-tabs a[href="/contacts"]').click();
  await page.waitForURL(`${baseUrl}/contacts`);
  await page.waitForFunction(() => document.querySelector('.info-tabs a[aria-current="page"]')?.textContent?.trim() === 'Контакты');
  assert((await page.locator('.info-tabs a[aria-current="page"]').textContent())?.trim() === 'Контакты', 'desktop contacts: active tab is wrong');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(outputDir, 'contacts-desktop-dark.png') });
  await desktop.close();

  const mobile = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 pumbum-redesign-mobile-check/1.0 Chrome/130 Mobile Safari/537.36',
  });
  const mobilePage = await mobile.newPage();
  collectRuntimeErrors(mobilePage, runtimeErrors);

  await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForImages(mobilePage);
  const mobileHome = await inspectPage(mobilePage, 'mobile home dark');
  assert(mobileHome.theme === 'dark', 'mobile home: dark theme is not the default');
  const menuButton = mobilePage.locator('.mobile-menu-toggle');
  assert(await menuButton.isVisible(), 'mobile home: menu control is not visible');
  await assertVisibleImagesLoaded(mobilePage, 'mobile home dark');
  await mobilePage.screenshot({ path: join(outputDir, 'home-mobile-dark.png') });

  await menuButton.click();
  assert(await mobilePage.locator('.mobile-menu').evaluate((element) => element.open), 'mobile menu did not open');
  const mobileCatalogLink = mobilePage.locator('.mobile-menu-nav a[href="/catalog"]');
  assert(await mobileCatalogLink.isVisible(), 'mobile menu: catalog link is not visible');
  await mobilePage.screenshot({ path: join(outputDir, 'home-mobile-menu-open.png') });
  await mobileCatalogLink.click();
  await mobilePage.waitForURL(`${baseUrl}/catalog`);
  await inspectPage(mobilePage, 'mobile catalog');
  await mobilePage.screenshot({ path: join(outputDir, 'catalog-mobile-dark.png') });

  await mobilePage.goto(`${baseUrl}/catalog/vodosnabzhenie`, { waitUntil: 'domcontentloaded' });
  const carousel = mobilePage.locator('.category-product-carousel');
  await carousel.waitFor();
  const dots = carousel.locator('.category-carousel-dot');
  assert((await dots.count()) === 3, 'mobile carousel: expected three markers');
  const firstDotBox = await dots.first().boundingBox();
  assert(firstDotBox && firstDotBox.width >= 32 && firstDotBox.height >= 32, 'mobile carousel: touch target is too small');
  const initialTitle = await carousel.locator('h2').innerText();
  await mobilePage.waitForTimeout(5_400);
  const nextTitle = await carousel.locator('h2').innerText();
  assert(initialTitle !== nextTitle, 'mobile carousel: autoplay did not advance after five seconds');
  await mobilePage.screenshot({ path: join(outputDir, 'category-mobile-dark.png') });

  await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await mobilePage.getByRole('button', { name: 'Переключить цветовую тему' }).click();
  assert(await mobilePage.locator('html').getAttribute('data-theme') === 'light', 'mobile theme toggle did not enable light mode');
  await mobilePage.screenshot({ path: join(outputDir, 'home-mobile-light.png') });
  await mobile.close();

  assert(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join(' | ')}`);

  console.log(JSON.stringify({
    baseUrl,
    viewports: {
      desktop: { width: 1280, height: 720, deviceScaleFactor: 1 },
      mobile: { width: 390, height: 844, deviceScaleFactor: 1 },
    },
    checked: [
      'dark/light theme and persistence',
      'desktop/mobile horizontal overflow',
      'mobile menu',
      'catalog and search',
      'product image and contact CTA',
      'information tabs',
      'carousel controls and five-second autoplay',
      'browser console, page errors and same-origin request failures',
    ],
    screenshots: outputDir,
    runtimeErrors,
  }, null, 2));
} finally {
  await browser.close();
}
