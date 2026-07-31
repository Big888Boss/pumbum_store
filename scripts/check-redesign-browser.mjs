import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.REDESIGN_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const outputDir = process.env.REDESIGN_TEST_OUTPUT_DIR ?? '/tmp/pumbum-redesign-browser';
const categoryMascots = {
  vodosnabzhenie: 'Тепловик',
  kanalizaciya: 'Стыкович',
  filtraciya: 'Фильтрыч',
  nasosy: 'Напорыч',
  'smesiteli-i-sifony': 'Смесевич',
  'otoplenie-i-kotelnaya': 'Бак Хлопотун',
  'krepezh-dlya-montazha': 'Крепыч',
  'truby-i-fitingi': 'Трубыч',
  'armatura-i-komplektuyuschie': 'Арматурыч',
  'prochee-oborudovanie': 'Крестович',
};

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
    const isCancelledImageOnNavigation = errorText === 'net::ERR_ABORTED' && request.resourceType() === 'image';
    if (isCancelledNextPrefetch || isCancelledImageOnNavigation) return;
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

async function revealForScreenshot(page, locator) {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const handle = await locator.elementHandle();
  assert(handle, 'screenshot target is missing');
  await page.waitForFunction((element) => {
    let current = element;
    while (current) {
      if (Number.parseFloat(getComputedStyle(current).opacity) < 0.95) return false;
      current = current.parentElement;
    }
    return true;
  }, handle, { timeout: 4_000 });
  await waitForImages(page);
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const runtimeErrors = [];

try {
  const desktop = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 1280, height: 847 },
    userAgent: 'Mozilla/5.0 pumbum-redesign-browser-check/1.0 Chrome/130 Safari/537.36',
  });
  const page = await desktop.newPage();
  collectRuntimeErrors(page, runtimeErrors);

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForImages(page);
  const homeDark = await inspectPage(page, 'desktop home dark');
  assert(homeDark.theme === 'dark', 'desktop home: dark theme is not the default');
  assert((await page.locator('.category-card').count()) === 10, 'desktop home: expected ten category cards');
  await page.locator('.category-card').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.category-card')].at(-1)?.classList.contains('is-revealed'));
  await page.waitForFunction(() => {
    const card = [...document.querySelectorAll('.category-card')].at(-1);
    return card ? Number.parseFloat(getComputedStyle(card).opacity) > 0.99 : false;
  });
  assert(await page.locator('.mascot-image-home').evaluate((element) => element.classList.contains('is-loaded')), 'desktop home: mascot load-in state is missing');
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
  assert((await page.locator('.mascot-companion, .category-mascot-runner').count()) === 0, 'desktop product: removed mascot layers are still present');
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

  await page.goto(`${baseUrl}/catalog/vodosnabzhenie`, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('a[href^="tel:+78452477477"]').count()) >= 2, 'desktop category: expert call CTAs are missing');
  const sortCheap = page.getByRole('link', { name: 'Сначала дешевле', exact: true }).first();
  assert((await sortCheap.getAttribute('href'))?.endsWith('#catalog-products'), 'desktop sorting: target anchor is missing');
  await sortCheap.click();
  await page.waitForURL((url) => url.searchParams.get('sort') === 'price_asc' && url.hash === '#catalog-products');
  await page.waitForFunction(() => {
    const section = document.querySelector('#catalog-products');
    if (!section) return false;
    const top = section.getBoundingClientRect().top;
    return top >= 70 && top <= 130;
  });
  const filterDrawer = page.locator('details.filter-drawer');
  if (!(await filterDrawer.evaluate((element) => element.open))) {
    await filterDrawer.locator('summary').click();
  }
  const filterForm = filterDrawer.locator('form.filter-panel');
  assert((await filterForm.getAttribute('action'))?.endsWith('#catalog-products'), 'desktop filter: target anchor is missing');
  const firstFilter = filterForm.locator('select').first();
  await firstFilter.selectOption({ index: 1 });
  await filterForm.getByRole('button', { name: 'Показать', exact: true }).click();
  await page.waitForURL((url) => url.hash === '#catalog-products' && [...url.searchParams.keys()].some((key) => key !== 'sort'));
  await page.waitForFunction(() => {
    const section = document.querySelector('#catalog-products');
    if (!section) return false;
    const top = section.getBoundingClientRect().top;
    return top >= 70 && top <= 130;
  });
  await page.goto(`${baseUrl}/catalog/vodosnabzhenie`, { waitUntil: 'domcontentloaded' });
  await waitForImages(page);
  assert((await page.locator('.mascot-companion, .category-mascot-runner').count()) === 0, 'desktop category: removed mascot layers are still present');
  assert((await page.locator('.mascot-figure[data-mascot="Тепловик"]').count()) === 3, 'desktop category: expected three Teplovik placements');
  await assertVisibleImagesLoaded(page, 'desktop category hero');
  const heroMediaBox = await page.locator('.category-hero-media').boundingBox();
  const peekFigureBox = await page.locator('.mascot-figure-peek').boundingBox();
  assert(heroMediaBox && peekFigureBox, 'desktop category hero: placement geometry is unavailable');
  const peekOverlap = peekFigureBox.x + peekFigureBox.width - heroMediaBox.x;
  assert(peekOverlap >= 34 && peekOverlap <= 46, `desktop category hero: peek overlap is ${peekOverlap}px instead of the intended 40px seam`);
  await page.locator('.hero .container').screenshot({ path: join(outputDir, 'category-hero-desktop-dark.png') });
  const adviceCard = page.locator('.category-advice-card');
  await revealForScreenshot(page, adviceCard);
  const adviceBox = await adviceCard.boundingBox();
  const adviceActionsBox = await adviceCard.locator('.info-card-actions').boundingBox();
  assert(adviceBox && adviceActionsBox, 'desktop category advice: action geometry is unavailable');
  const adviceBottomInset = adviceBox.y + adviceBox.height - adviceActionsBox.y - adviceActionsBox.height;
  assert(adviceBottomInset >= 24 && adviceBottomInset <= 30, `desktop category advice: action bottom inset is ${adviceBottomInset}px`);
  await adviceCard.screenshot({ path: join(outputDir, 'category-advice-desktop-dark.png') });
  await page.screenshot({ path: join(outputDir, 'category-advice-context-desktop-dark.png') });
  const relatedHead = page.locator('.category-related-head');
  await revealForScreenshot(page, relatedHead);
  const seatedFigureBox = await relatedHead.locator('.mascot-figure-seated').boundingBox();
  const thirdRelatedCardBox = await page.locator('.category-related-head + .grid-3 > .card').nth(2).boundingBox();
  assert(seatedFigureBox && thirdRelatedCardBox, 'desktop related categories: seating geometry is unavailable');
  const seatedAnchorX = seatedFigureBox.x + seatedFigureBox.width * 0.55;
  const seatedAnchorY = seatedFigureBox.y + seatedFigureBox.height * 0.67;
  assert(Math.abs(seatedAnchorX - thirdRelatedCardBox.x) <= 42, `desktop related categories: seated anchor is ${Math.round(seatedAnchorX - thirdRelatedCardBox.x)}px from the third-card edge`);
  assert(Math.abs(seatedAnchorY - thirdRelatedCardBox.y) <= 24, `desktop related categories: seated vertical anchor is ${Math.round(seatedAnchorY - thirdRelatedCardBox.y)}px from the card seam`);
  await relatedHead.screenshot({ path: join(outputDir, 'category-related-desktop-dark.png') });
  await page.screenshot({ path: join(outputDir, 'category-related-context-desktop-dark.png') });
  await page.locator('#catalog-products').scrollIntoViewIfNeeded();
  const comparisonFilterDrawer = page.locator('details.filter-drawer');
  if (!(await comparisonFilterDrawer.evaluate((element) => element.open))) {
    await comparisonFilterDrawer.locator('summary').click();
  }
  await page.screenshot({ path: join(outputDir, 'category-desktop-dark.png') });
  const pageTwo = page.locator('.catalog-pagination a', { hasText: /^2$/ }).first();
  const pageTwoHref = await pageTwo.getAttribute('href');
  assert(pageTwoHref?.endsWith('#catalog-products'), 'desktop pagination: page two link must target the product section');
  await pageTwo.click();
  await page.waitForURL((url) => url.searchParams.get('page') === '2' && url.hash === '#catalog-products');
  await page.waitForFunction(() => {
    const section = document.querySelector('#catalog-products');
    if (!section) return false;
    const top = section.getBoundingClientRect().top;
    return top >= 70 && top <= 130;
  });
  assert((await page.locator('.product-list-card').count()) === 24, 'desktop pagination: expected 24 cards on page two');

  for (const [categorySlug, mascotName] of Object.entries(categoryMascots)) {
    await page.goto(`${baseUrl}/catalog/${categorySlug}`, { waitUntil: 'domcontentloaded' });
    const figures = page.locator(`.mascot-figure[data-mascot="${mascotName}"]`);
    assert((await figures.count()) === 3, `desktop ${categorySlug}: expected three ${mascotName} placements`);
    assert((await page.locator('.mascot-figure-category').count()) === 3, `desktop ${categorySlug}: category figure class count is wrong`);
    await inspectPage(page, `desktop category mascot ${categorySlug}`);
  }

  await page.goto(`${baseUrl}/catalog/po-zadache`, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('main form[action="/search"]').count()) === 0, 'desktop tasks: redundant global search form is still present');

  for (const route of ['/catalog', '/catalog/proizvoditeli', '/catalog/po-zadache', '/search', '/delivery', '/about', '/contacts', '/privacy']) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await waitForImages(page);
    await inspectPage(page, `desktop retained page scene ${route}`);
    assert((await page.locator('.mascot-companion, .category-mascot-runner').count()) === 0, `desktop ${route}: removed mascot layers are still present`);
    await page.waitForFunction(() => document.querySelector('.mascot-image')?.classList.contains('is-loaded'));
    await assertVisibleImagesLoaded(page, `desktop retained page scene ${route}`);
    if (route === '/catalog/proizvoditeli') {
      assert((await page.locator('.mascot-figure-manufacturer').count()) === 3, 'desktop manufacturers: expected three figures between cards');
      for (const [manufacturerSlug, mascotName] of Object.entries({
        sinikon: 'Стыкович',
        gidrokontrakt: 'Фильтрыч',
        zota: 'Тепловик',
      })) {
        assert(
          (await page.locator(`#${manufacturerSlug} .mascot-figure-manufacturer[data-mascot="${mascotName}"]`).count()) === 1,
          `desktop manufacturers: ${mascotName} must be seated on ${manufacturerSlug}`,
        );
        await revealForScreenshot(page, page.locator(`#${manufacturerSlug}`));
        await page.locator(`#${manufacturerSlug}`).screenshot({ path: join(outputDir, `manufacturer-${manufacturerSlug}-desktop-dark.png`) });
      }
      assert((await page.locator('#valtec .mascot-figure-manufacturer').count()) === 0, 'desktop manufacturers: VALTEC must not host a mascot');
      const sinikonCardBox = await page.locator('#sinikon').boundingBox();
      const sinikonMascotBox = await page.locator('#sinikon .manufacturer-mascot-sinikon').boundingBox();
      assert(sinikonCardBox && sinikonMascotBox, 'desktop manufacturers: SINIKON geometry is unavailable');
      assert(sinikonMascotBox.x <= sinikonCardBox.x + 8, 'desktop manufacturers: Стыкович must straddle the left edge of SINIKON');
      assert(sinikonMascotBox.x >= sinikonCardBox.x - 24, 'desktop manufacturers: Стыкович extends too far beyond SINIKON');
      assert(sinikonMascotBox.y < sinikonCardBox.y - 110, 'desktop manufacturers: Стыкович must sit above the SINIKON top border');
      assert(sinikonMascotBox.y + sinikonMascotBox.height <= sinikonCardBox.y + 96, 'desktop manufacturers: Стыкович hangs too far into SINIKON');
      const zotaMascotBox = await page.locator('#zota .manufacturer-mascot-zota').boundingBox();
      assert(zotaMascotBox, 'desktop manufacturers: ZOTA mascot geometry is unavailable');
      assert(Math.abs((zotaMascotBox.x + zotaMascotBox.width / 2) - 640) <= 48, 'desktop manufacturers: Тепловик must sit near the page center');
      await page.locator('#sinikon').evaluate((element) => {
        const top = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top - 190), behavior: 'instant' });
      });
      await page.screenshot({ path: join(outputDir, 'manufacturer-sinikon-context-desktop-dark.png') });
      await revealForScreenshot(page, page.locator('.manufacturer-grid'));
      await page.locator('.manufacturer-grid').screenshot({ path: join(outputDir, 'manufacturers-grid-desktop-dark.png') });
      await page.screenshot({ path: join(outputDir, 'manufacturers-desktop-dark.png') });
    }
    if (route === '/about') {
      assert((await page.locator('.mascot-figure-about[data-mascot="Крепыч"]').count()) === 1, 'desktop about: content mascot is missing');
      await revealForScreenshot(page, page.locator('.about-layout'));
      await page.locator('.about-layout').screenshot({ path: join(outputDir, 'about-layout-desktop-dark.png') });
      await page.screenshot({ path: join(outputDir, 'about-desktop-dark.png') });
    }
  }
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
  assert((await mobilePage.locator('.mascot-figure[data-mascot="Тепловик"]').count()) === 3, 'mobile category: expected three Teplovik placements');
  const carousel = mobilePage.locator('.category-product-carousel');
  await carousel.waitFor();
  const dots = carousel.locator('.category-carousel-dot');
  const dotCount = await dots.count();
  assert(dotCount >= 2 && dotCount <= 3, 'mobile carousel: expected two or three quality-gated markers');
  const firstDotBox = await dots.first().boundingBox();
  assert(firstDotBox && firstDotBox.width >= 32 && firstDotBox.height >= 32, 'mobile carousel: touch target is too small');
  const initialTitle = await carousel.locator('h2').innerText();
  await mobilePage.waitForTimeout(5_400);
  const nextTitle = await carousel.locator('h2').innerText();
  assert(initialTitle !== nextTitle, 'mobile carousel: autoplay did not advance after five seconds');
  await mobilePage.screenshot({ path: join(outputDir, 'category-mobile-dark.png') });
  const mobileAdviceCard = mobilePage.locator('.category-advice-card');
  await revealForScreenshot(mobilePage, mobileAdviceCard);
  await mobileAdviceCard.screenshot({ path: join(outputDir, 'category-advice-mobile-dark.png') });
  await mobilePage.screenshot({ path: join(outputDir, 'category-advice-context-mobile-dark.png') });
  const mobileRelatedHead = mobilePage.locator('.category-related-head');
  await revealForScreenshot(mobilePage, mobileRelatedHead);
  await mobileRelatedHead.screenshot({ path: join(outputDir, 'category-related-mobile-dark.png') });
  await mobilePage.screenshot({ path: join(outputDir, 'category-related-context-mobile-dark.png') });
  const firstMobileProduct = mobilePage.locator('.product-list-card').first();
  await firstMobileProduct.scrollIntoViewIfNeeded();
  await mobilePage.waitForFunction(() => {
    const element = document.querySelector('.product-list-card');
    if (!element) return false;
    let current = element;
    while (current) {
      if (Number.parseFloat(getComputedStyle(current).opacity) < 0.95) return false;
      current = current.parentElement;
    }
    return true;
  }, null, { timeout: 4_000 });
  assert((await mobilePage.locator('.mascot-companion, .category-mascot-runner').count()) === 0, 'mobile category: removed mascot layers are still present');
  await mobilePage.screenshot({ path: join(outputDir, 'category-mobile-products-dark.png') });

  await mobilePage.goto(`${baseUrl}/catalog/proizvoditeli`, { waitUntil: 'domcontentloaded' });
  assert((await mobilePage.locator('.mascot-figure-manufacturer').count()) === 3, 'mobile manufacturers: expected three figures between cards');
  for (const [manufacturerSlug, mascotName] of Object.entries({
    sinikon: 'Стыкович',
    gidrokontrakt: 'Фильтрыч',
    zota: 'Тепловик',
  })) {
    assert(
      (await mobilePage.locator(`#${manufacturerSlug} .mascot-figure-manufacturer[data-mascot="${mascotName}"]`).count()) === 1,
      `mobile manufacturers: ${mascotName} must remain attached to ${manufacturerSlug}`,
    );
  }
  assert((await mobilePage.locator('#valtec .mascot-figure-manufacturer').count()) === 0, 'mobile manufacturers: VALTEC must not host a mascot');
  await revealForScreenshot(mobilePage, mobilePage.locator('.manufacturer-grid'));
  await mobilePage.locator('.manufacturer-grid').screenshot({ path: join(outputDir, 'manufacturers-grid-mobile-dark.png') });

  await mobilePage.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded' });
  assert((await mobilePage.locator('.mascot-figure-about[data-mascot="Крепыч"]').count()) === 1, 'mobile about: content mascot is missing');
  await revealForScreenshot(mobilePage, mobilePage.locator('.about-layout'));
  await mobilePage.locator('.about-layout').screenshot({ path: join(outputDir, 'about-layout-mobile-dark.png') });

  await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await mobilePage.getByRole('button', { name: 'Переключить цветовую тему' }).click();
  assert(await mobilePage.locator('html').getAttribute('data-theme') === 'light', 'mobile theme toggle did not enable light mode');
  await mobilePage.screenshot({ path: join(outputDir, 'home-mobile-light.png') });
  await mobile.close();

  assert(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join(' | ')}`);

  console.log(JSON.stringify({
    baseUrl,
    viewports: {
      desktop: { width: 1280, height: 847, deviceScaleFactor: 1 },
      mobile: { width: 390, height: 844, deviceScaleFactor: 1 },
    },
    checked: [
      'dark/light theme and persistence',
      'desktop/mobile horizontal overflow',
      'mobile menu',
      'catalog and search',
      'product image and contact CTA',
      'information tabs',
      'scroll reveal and mascot load-in states',
      'previous accepted page mascots retained',
      'rejected companion and runner layers absent',
      'three presentation-directed placements on every category',
      'three manufacturer-card seam mascots',
      'about content mascot',
      'mobile tall-catalog reveal remains visible',
      'direct phone CTAs in category guidance',
      'filter and sorting anchors',
      'task page redundant search removal',
      'pagination anchor and second-page product count',
      'carousel controls and five-second autoplay',
      'browser console, page errors and same-origin request failures',
    ],
    screenshots: outputDir,
    runtimeErrors,
  }, null, 2));
} finally {
  await browser.close();
}
