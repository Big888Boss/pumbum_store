import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { v2PilotProducts } from '../src/data/v2-catalog.ts';

const baseUrl = process.env.TASK130_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3010'}`;
const evidenceDir = 'docs/evidence';
const allowStaticFallback = process.env.TASK130_ALLOW_STATIC_FALLBACK === '1';
const localLibDir = resolve('.playwright-os-libs/root/usr/lib/x86_64-linux-gnu');
const localLibDir2 = resolve('.playwright-os-libs/root/lib/x86_64-linux-gnu');
if (existsSync(localLibDir)) {
  process.env.LD_LIBRARY_PATH = [localLibDir, existsSync(localLibDir2) ? localLibDir2 : '', process.env.LD_LIBRARY_PATH ?? ''].filter(Boolean).join(':');
}
mkdirSync(evidenceDir, { recursive: true });

function tsSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function pathToken(path) {
  return path.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasClass(html, className) {
  return new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["']`).test(html);
}

function htmlHasImageReference(html, publicPath) {
  const token = pathToken(publicPath);
  return new RegExp(token).test(html) || new RegExp(encodeURIComponent(token)).test(html);
}

function boxIssue(name, box, minWidth, minHeight) {
  if (!box) return `${name} has no rendered bounding box`;
  if (box.width < minWidth || box.height < minHeight) return `${name} rendered too small: ${Math.round(box.width)}x${Math.round(box.height)}`;
  return null;
}

function within(outer, inner, tolerance = 3) {
  return inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.x + inner.width <= outer.x + outer.width + tolerance && inner.y + inner.height <= outer.y + outer.height + tolerance;
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { accept: 'text/html' } });
  const html = await response.text();
  return { status: response.status, html };
}

async function runStaticDomFallback(reason) {
  const results = [];
  for (const product of v2PilotProducts) {
    const url = `${baseUrl}/catalog/${product.category}/${product.slug}`;
    const { status, html } = await fetchHtml(url);
    const issues = [];
    if (status !== 200) issues.push(`HTTP ${status}`);
    if (!hasClass(html, 'product-frame')) issues.push('missing .product-frame in generated HTML');
    if (!hasClass(html, 'product-photo')) issues.push('missing img.product-photo in generated HTML');
    if (!hasClass(html, 'logo-overlay')) issues.push('missing .logo-overlay in generated HTML');
    if (!htmlHasImageReference(html, product.image)) issues.push(`generated HTML lacks product image reference ${product.image}`);
    if (!htmlHasImageReference(html, product.logo)) issues.push(`generated HTML lacks brand logo reference ${product.logo}`);
    if (!/<img\b[^>]*class=["'][^"']*\bproduct-photo\b[^"']*["'][^>]*>/s.test(html) && !/<img\b[^>]*src=["'][^"']*images\/generated-v2[^"']*["'][^>]*class=["'][^"']*\bproduct-photo\b[^"']*["'][^>]*>/s.test(html)) {
      issues.push('no generated HTML <img> with product-photo class');
    }
    if (!/<div\b[^>]*class=["'][^"']*\blogo-overlay\b[^"']*["'][^>]*>[\s\S]*?<img\b[\s\S]*?<\/div>/s.test(html)) {
      issues.push('no logo img nested inside .logo-overlay container in generated HTML');
    }
    results.push({ category: product.category, slug: product.slug, url, status, htmlBytes: html.length, productImage: product.image, logo: product.logo, issues });
  }
  const doc = {
    checkedAt: new Date().toISOString(),
    mode: 'static-dom-fallback',
    baseUrl,
    productCount: v2PilotProducts.length,
    summary: 'Fallback verification against generated Next.js HTML. This mode is only allowed when TASK130_ALLOW_STATIC_FALLBACK=1; acceptance smoke must use real Playwright Chromium screenshots.',
    playwrightFailure: String(reason?.stack ?? reason ?? 'not attempted'),
    results,
    issues: results.flatMap((r) => r.issues.map((issue) => `${r.category}/${r.slug}: ${issue}`)),
  };
  const evidence = `${evidenceDir}/task-130-overlay-fallback-${tsSlug()}.json`;
  writeFileSync(evidence, JSON.stringify(doc, null, 2));
  writeFileSync(`${evidenceDir}/task-130-overlay-fallback-latest.json`, JSON.stringify(doc, null, 2));
  if (doc.issues.length) {
    process.exit(1);
  }
}

async function runPlaywright() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function assertProduct(page, product, viewportName) {
    const url = `${baseUrl}/catalog/${product.category}/${product.slug}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const title = await page.locator('h1').innerText();
    const frame = page.locator('.product-frame').first();
    const photo = frame.locator('img.product-photo').first();
    const overlay = frame.locator('.logo-overlay').first();
    const logo = overlay.locator('img').first();
    await frame.waitFor({ state: 'visible' });
    await photo.waitFor({ state: 'visible' });
    await overlay.waitFor({ state: 'visible' });
    await logo.waitFor({ state: 'visible' });

    const [frameBox, photoBox, overlayBox, logoBox] = await Promise.all([frame.boundingBox(), photo.boundingBox(), overlay.boundingBox(), logo.boundingBox()]);
    const photoSrc = await photo.getAttribute('src');
    const logoSrc = await logo.getAttribute('src');
    const overlayStyles = await overlay.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        pointerEvents: style.pointerEvents,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    });
    const logoStyles = await logo.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        objectFit: style.objectFit,
      };
    });
    const screenshot = `${evidenceDir}/task-130-browser-${viewportName}-${product.category}-${product.slug}-${tsSlug()}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });

    const issues = [];
    const frameIssue = boxIssue('product frame', frameBox, viewportName === 'mobile' ? 260 : 360, viewportName === 'mobile' ? 190 : 260);
    const photoIssue = boxIssue('product photo', photoBox, viewportName === 'mobile' ? 220 : 300, viewportName === 'mobile' ? 160 : 220);
    const overlayIssue = boxIssue('logo overlay', overlayBox, viewportName === 'mobile' ? 58 : 82, viewportName === 'mobile' ? 24 : 32);
    const logoIssue = boxIssue('brand logo', logoBox, viewportName === 'mobile' ? 34 : 48, viewportName === 'mobile' ? 10 : 14);
    for (const issue of [frameIssue, photoIssue, overlayIssue, logoIssue]) if (issue) issues.push(issue);

    if (!photoSrc?.includes(product.image.replace(/^\//, ''))) issues.push(`photo src mismatch: ${photoSrc}`);
    if (!logoSrc?.includes(product.logo.replace(/^\//, ''))) issues.push(`logo src mismatch: ${logoSrc}`);
    if (overlayStyles.display === 'none') issues.push('logo overlay display none');
    if (overlayStyles.visibility === 'hidden') issues.push('logo overlay hidden');
    if (Number(overlayStyles.opacity) < 0.9) issues.push(`logo overlay opacity too low: ${overlayStyles.opacity}`);
    if (overlayStyles.position !== 'absolute') issues.push(`logo overlay CSS position expected absolute, got ${overlayStyles.position}`);
    if (overlayStyles.pointerEvents !== 'none') issues.push(`logo overlay should be non-interactive, got pointer-events ${overlayStyles.pointerEvents}`);
    if (!overlayStyles.backgroundColor.includes('255')) issues.push(`logo overlay background should be light/opaque, got ${overlayStyles.backgroundColor}`);
    if (logoStyles.display === 'none' || logoStyles.visibility === 'hidden') issues.push('nested logo image not visible');
    if (Number(logoStyles.opacity) < 0.9) issues.push(`nested logo opacity too low: ${logoStyles.opacity}`);

    if (frameBox && overlayBox && !within(frameBox, overlayBox)) issues.push('logo overlay is not fully inside product frame');
    if (frameBox && logoBox && !within(frameBox, logoBox)) issues.push('brand logo is not fully inside product frame');
    if (photoBox && overlayBox && !intersects(photoBox, overlayBox)) issues.push('logo overlay does not sit above/intersect the product photo area');
    if (frameBox && overlayBox) {
      const distanceFromRight = frameBox.x + frameBox.width - (overlayBox.x + overlayBox.width);
      const distanceFromTop = overlayBox.y - frameBox.y;
      if (distanceFromRight < 4 || distanceFromRight > 32) issues.push(`logo overlay unexpected right offset: ${Math.round(distanceFromRight)}px`);
      if (distanceFromTop < 4 || distanceFromTop > 32) issues.push(`logo overlay unexpected top offset: ${Math.round(distanceFromTop)}px`);
    }
    if (overlayBox && logoBox && !within(overlayBox, logoBox)) issues.push('brand logo is not fully inside overlay container');

    results.push({ viewport: viewportName, category: product.category, slug: product.slug, url, title, screenshot, photoSrc, logoSrc, frameBox, photoBox, overlayBox, logoBox, overlayStyles, logoStyles, issues });
  }

  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1100 },
      { name: 'mobile', width: 390, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      for (const product of v2PilotProducts) await assertProduct(page, product, viewport.name);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const doc = {
    checkedAt: new Date().toISOString(),
    mode: 'playwright-chromium',
    baseUrl,
    productCount: v2PilotProducts.length,
    screenshotCount: results.length,
    localLibraryDirUsed: existsSync(localLibDir) ? localLibDir : null,
    summary: 'Real Playwright Chromium screenshots from running Next.js server. Each product page asserts .product-frame, img.product-photo, .logo-overlay, nested logo visibility, computed CSS, and rendered bounding boxes/relative geometry.',
    results,
    issues: results.flatMap((r) => r.issues.map((issue) => `${r.viewport}/${r.category}/${r.slug}: ${issue}`)),
  };
  const evidence = `${evidenceDir}/task-130-browser-smoke-${tsSlug()}.json`;
  writeFileSync(evidence, JSON.stringify(doc, null, 2));
  writeFileSync(`${evidenceDir}/task-130-browser-smoke.json`, JSON.stringify(doc, null, 2));
  if (doc.issues.length) {
    process.exit(1);
  }
}

try {
  await runPlaywright();
} catch (error) {
  if (!allowStaticFallback) {
    process.exit(1);
  }
  await runStaticDomFallback(error);
}
