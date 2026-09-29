import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = (process.env.REDESIGN_TEST_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const outputDir = process.env.REDESIGN_TEST_OUTPUT_DIR ?? '/tmp/pumbum-manufacturer-responsive-browser';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boxesIntersect(a, b, inset = 0) {
  return a.x < b.x + b.width - inset
    && a.x + a.width > b.x + inset
    && a.y < b.y + b.height - inset
    && a.y + a.height > b.y + inset;
}

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    })
    .every((image) => image.complete), null, { timeout: 20_000 });
}

async function inspectViewport(browser, name, viewport) {
  const context = await browser.newContext({
    locale: 'ru-RU',
    viewport,
    deviceScaleFactor: 1,
    userAgent: `Mozilla/5.0 pumbum-manufacturer-${name}-check/1.0 Chrome/130 Safari/537.36`,
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  const response = await page.goto(`${baseUrl}/catalog/proizvoditeli`, { waitUntil: 'domcontentloaded' });
  assert(response?.status() === 200, `${name}: manufacturers returned HTTP ${response?.status() ?? 'unknown'}: ${(await page.locator('body').innerText()).slice(0, 160)}`);
  await page.evaluate(() => document.fonts.ready);
  await waitForImages(page);
  await page.locator('.manufacturer-card').evaluateAll((elements) => elements.forEach((element) => element.classList.add('is-revealed')));
  await page.waitForFunction(() => [...document.querySelectorAll('.manufacturer-card')].every((element) => {
    const style = getComputedStyle(element);
    return Number.parseFloat(style.opacity) > 0.99 && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  }));

  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    cards: [...document.querySelectorAll('.manufacturer-card')].map((element) => {
      const rect = element.getBoundingClientRect();
      return { id: element.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  }));
  assert(!layout.overflow, `${name}: horizontal overflow detected`);
  assert(layout.cards.length >= 8, `${name}: manufacturer cards are missing`);

  const verticalGaps = layout.cards.slice(0, -1).map((card, index) => (
    layout.cards[index + 1].y - (card.y + card.height)
  ));
  const referenceGap = verticalGaps.find((gap) => gap > 0) ?? 0;
  for (const gap of verticalGaps) {
    assert(Math.abs(gap - referenceGap) <= 2, `${name}: uneven card gap ${Math.round(gap)}px vs ${Math.round(referenceGap)}px`);
  }
  assert(referenceGap >= 14 && referenceGap <= 18, `${name}: card gap is ${Math.round(referenceGap)}px`);

  const placements = [
    { host: 'sinikon', selector: '.manufacturer-mascot-sinikon', edge: 'top-left', mascot: 'Стыкович' },
    { host: 'gidrokontrakt', selector: '.manufacturer-mascot-3', edge: 'bottom-right', mascot: 'Фильтрыч' },
    { host: 'zota', selector: '.manufacturer-mascot-zota', edge: 'bottom-right', mascot: 'Тепловик' },
  ];
  const geometry = [];

  for (const placement of placements) {
    const card = page.locator(`#${placement.host}`);
    const mascot = card.locator(placement.selector);
    assert((await mascot.count()) === 1, `${name}: ${placement.mascot} is not attached to ${placement.host}`);
    const cardBox = await card.boundingBox();
    const mascotBox = await mascot.boundingBox();
    const logoBox = await card.locator('.manufacturer-logo').boundingBox();
    const allProductsBox = await card.locator('.manufacturer-section-more a').boundingBox();
    assert(cardBox && mascotBox && logoBox && allProductsBox, `${name}: ${placement.host} geometry is unavailable`);
    await card.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await card.screenshot({ path: join(outputDir, `${name}-${placement.host}.png`) });
    if (name !== 'desktop') {
      assert(!boxesIntersect(mascotBox, allProductsBox, 2), `${name}: ${placement.mascot} covers “Все товары производителя”`);
    }

    if (placement.edge === 'top-left') {
      const leftOffset = mascotBox.x - cardBox.x;
      const overlap = mascotBox.y + mascotBox.height - cardBox.y;
      const minimumLeftOffset = name === 'desktop' ? -24 : 0;
      assert(leftOffset >= minimumLeftOffset && leftOffset <= 16, `${name}: Стыкович left offset is ${Math.round(leftOffset)}px`);
      assert(mascotBox.y < cardBox.y, `${name}: Стыкович is not above SINIKON`);
      assert(overlap >= 34 && overlap <= 96, `${name}: Стыкович overlap is ${Math.round(overlap)}px`);
      assert(boxesIntersect(mascotBox, logoBox), `${name}: Стыкович legs do not hang into the SINIKON logo surface; mascot=${JSON.stringify(mascotBox)} logo=${JSON.stringify(logoBox)}`);
    } else {
      const rightOffset = cardBox.x + cardBox.width - (mascotBox.x + mascotBox.width);
      const seamOverlap = mascotBox.y + mascotBox.height - (cardBox.y + cardBox.height);
      if (name !== 'desktop') {
        assert(rightOffset >= -4 && rightOffset <= 16, `${name}: ${placement.mascot} right offset is ${Math.round(rightOffset)}px`);
      }
      assert(mascotBox.y < cardBox.y + cardBox.height, `${name}: ${placement.mascot} is not seated on the lower border`);
      assert(seamOverlap >= 48 && seamOverlap <= 80, `${name}: ${placement.mascot} seam overlap is ${Math.round(seamOverlap)}px`);
    }
    geometry.push({ ...placement, cardBox, mascotBox });

  }

  await page.screenshot({ path: join(outputDir, `${name}-full.png`), fullPage: true });
  assert(runtimeErrors.length === 0, `${name}: runtime errors: ${runtimeErrors.join(' | ')}`);
  await context.close();
  return { name, viewport, referenceGap, geometry };
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const [name, viewport] of [
    ['desktop', { width: 1280, height: 847 }],
    ['tablet', { width: 820, height: 1180 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    results.push(await inspectViewport(browser, name, viewport));
  }
  console.log(JSON.stringify({ baseUrl, outputDir, results }, null, 2));
} finally {
  await browser.close();
}
