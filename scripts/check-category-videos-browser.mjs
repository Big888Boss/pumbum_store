import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.CATEGORY_VIDEO_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const outputDir = process.env.CATEGORY_VIDEO_TEST_OUTPUT_DIR ?? '/tmp/pumbum-category-video-browser';
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
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 847 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectRuntimeErrors(page, target) {
  page.on('pageerror', (error) => target.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') target.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith(baseUrl)) return;
    const failure = request.failure()?.errorText ?? 'unknown';
    if (failure === 'net::ERR_ABORTED') return;
    target.push(`requestfailed: ${request.url()} :: ${failure}`);
  });
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const runtimeErrors = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      locale: 'ru-RU',
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: 'Mozilla/5.0 pumbum-category-video-check/1.0 Chrome/130 Safari/537.36',
    });
    const page = await context.newPage();
    collectRuntimeErrors(page, runtimeErrors);

    for (const [index, category] of categories.entries()) {
      await page.goto(`${baseUrl}/catalog/${category}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      const figure = page.locator(`[data-category-video="${category}"]`);
      const video = figure.locator('video');
      const heading = page.locator('#catalog-products .section-head');
      await figure.waitFor({ state: 'visible' });

      const beforeScroll = await video.evaluate((element) => ({
        controls: element.controls,
        poster: element.getAttribute('poster') ?? '',
      }));
      assert(!beforeScroll.controls, `${viewport.name}/${category}: native controls are visible`);
      assert(beforeScroll.poster.endsWith(`/hq-v2/posters/${category}.jpg`), `${viewport.name}/${category}: poster mapping is wrong`);

      const headingBox = await heading.boundingBox();
      const figureBox = await figure.boundingBox();
      assert(headingBox && figureBox, `${viewport.name}/${category}: media geometry is unavailable`);
      const gap = figureBox.y - (headingBox.y + headingBox.height);
      assert(gap >= -5 && gap <= 40, `${viewport.name}/${category}: heading-to-video gap is ${Math.round(gap)}px`);
      assert(figureBox.x >= 0 && figureBox.x + figureBox.width <= viewport.width + 1, `${viewport.name}/${category}: video overflows horizontally`);
      assert(Math.abs((figureBox.width / figureBox.height) - (16 / 9)) < 0.04, `${viewport.name}/${category}: video ratio regressed`);
      if (viewport.name === 'phone') {
        const rightGutter = viewport.width - (figureBox.x + figureBox.width);
        assert(figureBox.x >= 12 && rightGutter >= 12, `${viewport.name}/${category}: video escaped the mobile content gutters (${Math.round(figureBox.x)}px/${Math.round(rightGutter)}px)`);
      } else if (viewport.name === 'tablet') {
        const rightGutter = viewport.width - (figureBox.x + figureBox.width);
        assert(figureBox.x >= 20 && rightGutter >= 20, `${viewport.name}/${category}: video escaped the tablet content gutters (${Math.round(figureBox.x)}px/${Math.round(rightGutter)}px)`);
      } else {
        assert(figureBox.width <= 860, `${viewport.name}/${category}: video exceeded the desktop max width`);
      }

      await figure.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await page.waitForFunction(
        (slug) => {
          const element = document.querySelector(`[data-category-video="${slug}"] video`);
          return element instanceof HTMLVideoElement && element.currentSrc.endsWith(`/videos/categories/hq-v2/${slug}.mp4`);
        },
        category,
        { timeout: 10_000 },
      );
      await page.waitForFunction(
        (slug) => {
          const element = document.querySelector(`[data-category-video="${slug}"] video`);
          return element instanceof HTMLVideoElement && !element.paused && element.currentTime > 0;
        },
        category,
        { timeout: 10_000 },
      );

      const mediaResolution = await video.evaluate((element) => ({
        width: element.videoWidth,
        height: element.videoHeight,
      }));
      assert(mediaResolution.width === 1280 && mediaResolution.height === 720, `${viewport.name}/${category}: expected 1280x720 media, got ${mediaResolution.width}x${mediaResolution.height}`);

      if (index === 0 && viewport.name !== 'tablet') {
        await page.screenshot({ path: join(outputDir, `${viewport.name}-${category}.png`), fullPage: false });
      }

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(
        (slug) => {
          const element = document.querySelector(`[data-category-video="${slug}"] video`);
          return element instanceof HTMLVideoElement && element.paused;
        },
        category,
        { timeout: 4_000 },
      );

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert(!overflow, `${viewport.name}/${category}: page has horizontal overflow`);
      results.push({ viewport: viewport.name, category, gap: Math.round(gap), width: Math.round(figureBox.width) });
    }
    await context.close();
  }

  const reducedContext = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    userAgent: 'Mozilla/5.0 pumbum-category-video-reduced-motion/1.0 Chrome/130 Safari/537.36',
  });
  const reducedPage = await reducedContext.newPage();
  collectRuntimeErrors(reducedPage, runtimeErrors);
  await reducedPage.goto(`${baseUrl}/catalog/vodosnabzhenie`, { waitUntil: 'domcontentloaded' });
  const reducedFigure = reducedPage.locator('[data-category-video="vodosnabzhenie"]');
  await reducedFigure.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await reducedPage.waitForTimeout(800);
  const reducedState = await reducedFigure.locator('video').evaluate((element) => ({
    currentSrc: element.currentSrc,
    paused: element.paused,
    poster: element.getAttribute('poster') ?? '',
  }));
  assert(reducedState.currentSrc === '', 'reduced-motion: video source was attached');
  assert(reducedState.paused, 'reduced-motion: video started playing');
  assert(reducedState.poster.endsWith('/hq-v2/posters/vodosnabzhenie.jpg'), 'reduced-motion: poster is missing');
  await reducedContext.close();

  assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(' | ')}`);
  console.log(JSON.stringify({
    baseUrl,
    categoriesChecked: categories.length,
    viewports: viewports.map(({ name, width, height }) => ({ name, width, height })),
    checks: results.length,
    autoplayInView: true,
    pauseOutOfView: true,
    reducedMotionPosterOnly: true,
    runtimeErrors,
    outputDir,
  }, null, 2));
} finally {
  await browser.close();
}
