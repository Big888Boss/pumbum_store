const baseUrl = process.env.SEO_CRAWL_BASE_URL ?? 'http://127.0.0.1:3010';

async function fetchText(path) {
  const response = await fetch(new URL(path, baseUrl));
  return {
    path,
    status: response.status,
    text: await response.text(),
    contentType: response.headers.get('content-type') ?? '',
  };
}

function getTag(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? '';
}

function getAllJsonLd(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

const sitemap = await fetchText('/sitemap.xml');
if (sitemap.status !== 200) {
  throw new Error(`sitemap.xml returned ${sitemap.status}`);
}

const urls = [...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
const paths = Array.from(new Set(['/', '/robots.txt', '/sitemap.xml', ...urls]));
const findings = [];

for (const path of paths) {
  const result = await fetchText(path);
  if (result.status >= 400) findings.push({ path, severity: 'error', issue: `HTTP ${result.status}` });
  if (path.endsWith('.xml') || path.endsWith('.txt')) continue;

  const title = getTag(result.text, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = getTag(result.text, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canonical = getTag(result.text, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const h1Count = [...result.text.matchAll(/<h1\b/gi)].length;
  const jsonLd = getAllJsonLd(result.text);

  if (!title) findings.push({ path, severity: 'error', issue: 'missing title' });
  if (!description) findings.push({ path, severity: 'error', issue: 'missing meta description' });
  if (!canonical) findings.push({ path, severity: 'error', issue: 'missing canonical' });
  if (h1Count !== 1) findings.push({ path, severity: 'error', issue: `expected one H1, got ${h1Count}` });
  if (jsonLd.length === 0) findings.push({ path, severity: 'warning', issue: 'missing JSON-LD' });
  for (const block of jsonLd) {
    if (block.includes('"price":"0"') || block.includes('"price":0')) {
      findings.push({ path, severity: 'error', issue: 'fake zero price in JSON-LD' });
    }
  }
}

if (findings.length > 0) {
  console.log(JSON.stringify({ baseUrl, checked: paths.length, findings }, null, 2));
  const hasError = findings.some((finding) => finding.severity === 'error');
  process.exit(hasError ? 1 : 0);
}

console.log(JSON.stringify({ baseUrl, checked: paths.length, findings: [] }, null, 2));
