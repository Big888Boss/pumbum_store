import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:3031').replace(/\/$/, '');
const outputDir = process.env.OUTPUT_DIR ?? '/tmp/pumbum-category-hero-corrections';
const categories = {
  vodosnabzhenie: { desktopOverlap: 52 },
  filtraciya: { desktopOverlap: 30 },
  nasosy: { desktopOverlap: 30 },
  'smesiteli-i-sifony': { desktopOverlap: 52 },
  'krepezh-dlya-montazha': {
    desktopOverlap: 30,
    slide: 1,
    image: '/images/carousel-products/tim-zsr-2501-5002-clean-v2.webp',
  },
  'truby-i-fitingi': {
    desktopOverlap: 44,
    slide: 1,
    image: '/images/carousel-products/valtec-vtp-700-al25-clean-v4.webp',
    desktopMascot: '/images/mascots/pose-v5/trubych-peek-right-v5.webp',
  },
  'prochee-oborudovanie': {
    desktopOverlap: 44,
    desktopMascot: '/images/mascots/pose-v5/krestovich-peek-right-v5.webp',
  },
};
const viewports = {
  desktop: { width: 1280, height: 847 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {};

try {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport,
      locale: 'ru-RU',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    report[viewportName] = {};

    for (const [category, expectation] of Object.entries(categories)) {
      const runtimeErrors = [];
      const requestErrors = [];
      const onPageError = (error) => runtimeErrors.push(error.message);
      const onRequestFailed = (request) => {
        const failure = request.failure()?.errorText ?? '';
        const isCancelledPrefetch = failure.includes('ERR_ABORTED') && request.url().includes('_rsc=');
        if (new URL(request.url()).origin === new URL(baseUrl).origin && !isCancelledPrefetch) {
          requestErrors.push(`${request.method()} ${request.url()} ${failure}`);
        }
      };
      page.on('pageerror', onPageError);
      page.on('requestfailed', onRequestFailed);

      await page.goto(`${baseUrl}/catalog/${category}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      const carousel = page.locator('.category-product-carousel');
      await carousel.waitFor();
      await carousel.hover();
      if (Number.isInteger(expectation.slide)) {
        await carousel.locator('.category-carousel-dot').nth(expectation.slide).click();
      }
      await page.waitForFunction(() => [...document.images].filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight * 1.8;
      }).every((image) => image.complete && image.naturalWidth > 0));
      await page.waitForTimeout(900);

      const state = await carousel.evaluate((element) => {
        const mascot = element.querySelector('.mascot-figure-peek');
        const frame = element.querySelector('.product-frame');
        const wide = element.querySelector('.mascot-pose-wide');
        const narrow = element.querySelector('.mascot-pose-narrow');
        const mascotBox = mascot?.getBoundingClientRect();
        const frameBox = frame?.getBoundingClientRect();
        return {
          category: element.getAttribute('data-category'),
          image: element.querySelector('.product-photo')?.getAttribute('src') ?? '',
          mascotBox: mascotBox ? {
            x: mascotBox.x,
            y: mascotBox.y,
            width: mascotBox.width,
            height: mascotBox.height,
            right: mascotBox.right,
            bottom: mascotBox.bottom,
          } : null,
          frameBox: frameBox ? {
            x: frameBox.x,
            y: frameBox.y,
            width: frameBox.width,
            height: frameBox.height,
          } : null,
          wideSrc: wide?.querySelector('img')?.getAttribute('src') ?? '',
          wideDisplay: wide ? getComputedStyle(wide).display : '',
          narrowSrc: narrow?.querySelector('img')?.getAttribute('src') ?? '',
          narrowDisplay: narrow ? getComputedStyle(narrow).display : '',
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });

      assert.equal(state.category, category);
      assert.ok(state.mascotBox && state.frameBox, `${viewportName}/${category}: missing geometry`);
      assert.equal(state.horizontalOverflow, false, `${viewportName}/${category}: horizontal overflow`);
      assert.deepEqual(runtimeErrors, [], `${viewportName}/${category}: page errors`);
      assert.deepEqual(requestErrors, [], `${viewportName}/${category}: request errors`);
      if (expectation.image) assert.equal(state.image, expectation.image);

      if (viewportName === 'desktop') {
        const overlap = Math.round(state.mascotBox.right - state.frameBox.x);
        assert.ok(Math.abs(overlap - expectation.desktopOverlap) <= 5, `${category}: expected about ${expectation.desktopOverlap}px overlap, got ${overlap}px`);
        assert.equal(state.wideDisplay, 'block');
        assert.equal(state.narrowDisplay, 'none');
        if (expectation.desktopMascot) assert.equal(state.wideSrc, expectation.desktopMascot);
        report[viewportName][category] = { ...state, overlap };
      } else {
        assert.equal(state.wideDisplay, 'none');
        assert.equal(state.narrowDisplay, 'block');
        assert.ok(state.mascotBox.x >= 0, `${viewportName}/${category}: mascot starts outside viewport`);
        assert.ok(state.mascotBox.right <= viewport.width, `${viewportName}/${category}: mascot ends outside viewport`);
        assert.ok(state.mascotBox.bottom >= state.frameBox.y - 8, `${viewportName}/${category}: mascot floats above frame`);
        report[viewportName][category] = state;
      }

      await page.locator('.hero .container').first().screenshot({ path: `${outputDir}/${viewportName}-${category}.png` });
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
    }
    await context.close();
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
