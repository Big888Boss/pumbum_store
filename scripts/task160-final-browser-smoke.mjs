import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.TASK160_BASE_URL || 'http://127.0.0.1:43177';
const evidenceDir = path.resolve('../docs/evidence');
const forbidden = ['V2', 'legacy_src', 'SKU', 'prototype', 'demo', 'CTA:', 'Как продаём категорию', 'Как продаем категорию', 'Представитель категории', 'AI-photo', 'HTML/CSS логотипы'];
const required = ['Радиаторная арматура для современных систем отопления', 'Комплекты подключения, термостатические клапаны', 'Подобрать комплект', 'Получить консультацию', 'Подходит для', 'Поможем подобрать', 'С этим обычно подбирают'];

async function text(page) {
  return await page.locator('body').innerText();
}
function findForbidden(t) {
  return forbidden.filter((marker) => t.includes(marker));
}
async function assertNoForbidden(page, label) {
  const t = await text(page);
  const found = findForbidden(t);
  if (found.length) throw new Error(`${label}: forbidden markers found: ${found.join(', ')}`);
  return { label, forbiddenFound: found };
}
async function assertCta(page, name) {
  const link = page.getByRole('link', { name, exact: true }).first();
  await link.waitFor({ state: 'visible', timeout: 10000 });
  const href = await link.getAttribute('href');
  const box = await link.boundingBox();
  if (!href || !href.includes('/contacts')) throw new Error(`${name}: expected /contacts href, got ${href}`);
  if (!box || box.width < 20 || box.height < 20) throw new Error(`${name}: bad clickable box ${JSON.stringify(box)}`);
  await link.click();
  await page.waitForURL('**/contacts', { timeout: 10000 });
  await page.goBack({ waitUntil: 'networkidle' });
  return { name, href, box: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) }, clickNavigatedTo: '/contacts' };
}
async function radiatorSmoke(browser, viewport, label) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseURL}/catalog/radiators`, { waitUntil: 'networkidle' });
  const body = await text(page);
  for (const item of required) if (!body.includes(item)) throw new Error(`${label}: missing required text ${item}`);
  const ctas = [];
  ctas.push(await assertCta(page, 'Подобрать комплект'));
  ctas.push(await assertCta(page, 'Получить консультацию'));
  await assertNoForbidden(page, `${label} category`);
  const productCards = await page.locator('.radiator-product-card').count();
  const miniCards = await page.locator('.mini-product-card').count();
  const fallbackText = (await page.locator('.brand-text-chip').first().innerText()).trim();
  if (fallbackText !== 'VIVALDO') throw new Error(`${label}: expected VIVALDO brand text fallback, got ${fallbackText}`);
  if (await page.locator('.radiator-product-card .logo-overlay').count() !== 0) throw new Error(`${label}: hidden radiator logo overlay is still rendered`);
  if (productCards < 1 || miniCards < 1) throw new Error(`${label}: expected product and mini cross-sell cards`);
  const screenshot = path.join(evidenceDir, `task-160-final-${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return { label, url: '/catalog/radiators', viewport, requiredPresent: required, productCards, miniCards, brandTextFallback: fallbackText, hiddenLogoOverlayCount: 0, ctas, screenshot: path.relative(path.resolve('..'), screenshot) };
}
async function routeSmoke(browser, route, label, expectations = {}) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  await assertNoForbidden(page, label);
  const h1 = (await page.locator('h1').first().innerText()).trim();
  const productImages = await page.locator('.product-frame img.product-photo').count();
  const logoOverlays = await page.locator('.logo-overlay').count();
  const brandTextChips = await page.locator('.brand-text-chip').count();
  if (productImages < 1) throw new Error(`${label}: ProductImage frame/photo missing`);
  if (expectations.logoOverlay && logoOverlays < 1) throw new Error(`${label}: expected BrandLogoOverlay`);
  if (expectations.brandFallback && brandTextChips < 1) throw new Error(`${label}: expected brand text fallback`);
  const screenshot = path.join(evidenceDir, `task-160-final-${label.replace(/[^a-z0-9]+/gi, '-')}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return { label, route, h1, productImages, logoOverlays, brandTextChips, screenshot: path.relative(path.resolve('..'), screenshot) };
}

await fs.mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const checks = [];
  checks.push(await radiatorSmoke(browser, { width: 1440, height: 1000 }, 'radiators-desktop-final'));
  checks.push(await radiatorSmoke(browser, { width: 390, height: 900, isMobile: true }, 'radiators-mobile-final'));
  checks.push(await routeSmoke(browser, '/catalog/valves', 'non-radiator-category-valves', { logoOverlay: true }));
  checks.push(await routeSmoke(browser, '/catalog/valves/valtec-vt4410-ne16', 'non-radiator-product-valves', { logoOverlay: true }));
  checks.push(await routeSmoke(browser, '/catalog/radiators/vivaldo-strv-cr', 'radiator-product-fallback', { brandFallback: true }));
  const result = { result: 'PASS', baseURL, generatedAt: new Date().toISOString(), forbiddenMarkersChecked: forbidden, checks };
  await fs.writeFile(path.join(evidenceDir, 'task-160-final-browser-smoke.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
