import { chromium } from 'playwright';

const baseUrl = (process.env.CAROUSEL_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const categories = [
  'vodosnabzhenie',
  'kanalizaciya',
  'filtraciya',
  'nasosy',
  'smesiteli-i-sifony',
  'otoplenie-i-kotelnaya',
  'krepezh-dlya-montazha',
  'truby-i-fitingi',
  'armatura-i-komplektuyuschie',
  'prochee-oborudovanie',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ru-RU',
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 pumbum-carousel-check/1.0 Chrome/130 Safari/537.36',
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  for (const [index, category] of categories.entries()) {
    await page.goto(`${baseUrl}/catalog/${category}`, { waitUntil: 'domcontentloaded' });
    const carousel = page.locator('.category-product-carousel');
    await carousel.waitFor();
    assert(await carousel.getAttribute('data-carousel-size') === '3', `${category}: carousel size is not 3`);
    const groupLabels = (await carousel.getAttribute('data-carousel-groups'))?.split('|').filter(Boolean) ?? [];
    assert(groupLabels.length === 3 && new Set(groupLabels).size === 3, `${category}: carousel groups are not distinct`);
    const dots = carousel.locator('.category-carousel-dot');
    assert(await dots.count() === 3, `${category}: expected three carousel controls`);
    const dotBox = await dots.first().locator('xpath=..').boundingBox();
    const markerStyle = await dots.first().evaluate((element) => {
      const pseudo = getComputedStyle(element, '::before');
      return { width: pseudo.width, height: pseudo.height, borderRadius: pseudo.borderRadius };
    });
    assert(dotBox && dotBox.width >= 32 && dotBox.height >= 32, `${category}: carousel touch target is too small`);
    assert(markerStyle.width === '9px' && markerStyle.height === '9px' && markerStyle.borderRadius === '50%', `${category}: carousel marker styling regressed`);

    if (index === 0) {
      const initialTitle = await carousel.locator('h2').textContent();
      await page.waitForTimeout(5400);
      const nextTitle = await carousel.locator('h2').textContent();
      assert(initialTitle && nextTitle && initialTitle !== nextTitle, 'carousel did not advance after five seconds');
    }
  }
  assert(pageErrors.length === 0, `browser page errors: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({
    baseUrl,
    categoriesChecked: categories.length,
    productsPerCarousel: 3,
    distinctGroups: true,
    autoplayMs: 5000,
    mobileTouchTargetPx: 32,
    markerPx: 9,
    pageErrors,
  }, null, 2));
} finally {
  await browser.close();
}
