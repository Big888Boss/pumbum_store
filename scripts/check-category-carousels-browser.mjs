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
    assert(await carousel.getAttribute('data-carousel-autoplay-ms') === '5000', `${category}: autoplay is not exactly five seconds`);
    const groupLabels = (await carousel.getAttribute('data-carousel-groups'))?.split('|').filter(Boolean) ?? [];
    assert(groupLabels.length === 3 && new Set(groupLabels).size === 3, `${category}: carousel groups are not distinct`);
    const dots = carousel.locator('.category-carousel-dot');
    assert(await dots.count() === 3, `${category}: expected three carousel controls`);
    assert(await carousel.locator('.category-carousel-controls > button:not(.visually-hidden)').count() === 0, `${category}: obsolete previous/pause/next buttons are still rendered`);
    assert(await carousel.locator('button.visually-hidden').count() === 1, `${category}: accessible pause control is missing`);
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

    const heights = [];
    for (let dotIndex = 0; dotIndex < await dots.count(); dotIndex += 1) {
      await dots.nth(dotIndex).click();
      await page.waitForTimeout(500);
      const image = carousel.locator('img.product-photo');
      assert(await image.count() === 1, `${category}: slide ${dotIndex + 1} did not render a product image`);
      await image.evaluate((element) => {
        if (element instanceof HTMLImageElement && !element.complete) {
          return new Promise((resolve) => {
            element.addEventListener('load', resolve, { once: true });
            element.addEventListener('error', resolve, { once: true });
          });
        }
        return undefined;
      });
      const dimensions = await image.evaluate((element) => ({
        width: element instanceof HTMLImageElement ? element.naturalWidth : 0,
        height: element instanceof HTMLImageElement ? element.naturalHeight : 0,
        src: element instanceof HTMLImageElement ? element.currentSrc : '',
      }));
      assert(
        dimensions.width >= 800 && dimensions.height >= 600,
        `${category}: slide ${dotIndex + 1} image is too small (${dimensions.width}x${dimensions.height}, ${dimensions.src})`,
      );
      const box = await carousel.boundingBox();
      assert(box, `${category}: carousel has no bounding box`);
      heights.push(Math.round(box.height));
    }
    assert(Math.max(...heights) - Math.min(...heights) <= 1, `${category}: carousel height jumps between slides (${heights.join(', ')})`);
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
