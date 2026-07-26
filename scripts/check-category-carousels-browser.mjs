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
const carouselSizes = {};
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  for (const [index, category] of categories.entries()) {
    await page.goto(`${baseUrl}/catalog/${category}`, { waitUntil: 'domcontentloaded' });
    const carousel = page.locator('.category-product-carousel');
    await carousel.waitFor();
    const carouselSize = Number(await carousel.getAttribute('data-carousel-size'));
    carouselSizes[category] = carouselSize;
    assert(carouselSize >= 2 && carouselSize <= 3, `${category}: expected two or three quality-gated products`);
    const groupLabels = (await carousel.getAttribute('data-carousel-groups'))?.split('|').filter(Boolean) ?? [];
    assert(groupLabels.length === carouselSize && new Set(groupLabels).size === carouselSize, `${category}: carousel groups are not distinct`);
    const dots = carousel.locator('.category-carousel-dot');
    assert(await dots.count() === carouselSize, `${category}: carousel control count is wrong`);
    const dotBox = await dots.first().locator('xpath=..').boundingBox();
    const markerStyle = await dots.first().evaluate((element) => {
      const pseudo = getComputedStyle(element, '::before');
      return { width: pseudo.width, height: pseudo.height, borderRadius: pseudo.borderRadius };
    });
    assert(dotBox && dotBox.width >= 32 && dotBox.height >= 32, `${category}: carousel touch target is too small`);
    assert(markerStyle.width === '8px' && markerStyle.height === '8px' && markerStyle.borderRadius === '50%', `${category}: carousel marker styling regressed`);

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
    carouselSizes,
    distinctGroups: true,
    autoplayMs: 5000,
    mobileTouchTargetPx: 32,
    markerPx: 8,
    pageErrors,
  }, null, 2));
} finally {
  await browser.close();
}
