const baseUrl = (process.env.CSP_BASE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
const expectedMode = process.env.CSP_EXPECT_MODE === 'report-only' ? 'report-only' : 'enforce';
const headerName = expectedMode === 'report-only'
  ? 'content-security-policy-report-only'
  : 'content-security-policy';
const forbiddenHeaderName = expectedMode === 'report-only'
  ? 'content-security-policy'
  : 'content-security-policy-report-only';
const testPath = process.env.CSP_TEST_PATH ?? '/catalog/nasosy-i-vodosnabzhenie/espa-167577';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchPage() {
  const response = await fetch(`${baseUrl}${testPath}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ru-RU,ru;q=0.9',
      'user-agent': 'Mozilla/5.0 pumbum-monitoring/1.0',
    },
    redirect: 'manual',
  });
  const html = await response.text();
  return { response, html };
}

function inspectPage(response, html) {
  assert(response.status === 200, `expected 200, got ${response.status}`);
  const policy = response.headers.get(headerName);
  assert(policy, `missing ${headerName}`);
  assert(!response.headers.has(forbiddenHeaderName), `unexpected ${forbiddenHeaderName}`);
  assert(!policy.includes("'unsafe-inline'"), 'production CSP contains unsafe-inline');
  assert(!policy.includes("'unsafe-eval'"), 'production CSP contains unsafe-eval');
  assert(policy.includes("'strict-dynamic'"), 'CSP is missing strict-dynamic');
  assert(policy.includes("script-src-attr 'none'"), 'CSP does not block script attributes');
  assert(policy.includes("style-src-attr 'unsafe-hashes'"), 'CSP does not restrict style attributes to audited hashes');
  assert(policy.includes("'sha256-/3kWSXHts8LrwfemLzY9W0tOv5I4eLIhrf0pT8cU0WI='"), 'CSP lacks the Next route-announcer container style hash');
  assert(policy.includes("'sha256-2v0wUgRiMnQqfAAERz6WCRNJ9EZeUWOvHSCDVMftC6Q='"), 'CSP lacks the Next route-announcer content style hash');
  assert(policy.includes('wss://mc.yandex.ru'), 'CSP blocks Yandex Metrika WebSocket transport');
  assert(policy.includes('report-uri /api/csp-report'), 'CSP report endpoint is missing');

  const nonceMatch = policy.match(/'nonce-([^']+)'/);
  assert(nonceMatch, 'CSP nonce is missing');
  const nonce = nonceMatch[1];
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  const styleTags = html.match(/<style\b[^>]*>/gi) ?? [];
  assert(scriptTags.length > 0, 'page contains no script tags');

  const missingScriptNonce = scriptTags.filter((tag) => !tag.includes(`nonce="${nonce}"`));
  const missingStyleNonce = styleTags.filter((tag) => !tag.includes(`nonce="${nonce}"`));
  assert(missingScriptNonce.length === 0, `${missingScriptNonce.length} script tags lack the request nonce`);
  assert(missingStyleNonce.length === 0, `${missingStyleNonce.length} style tags lack the request nonce`);
  assert(!/\sstyle\s*=/i.test(html), 'HTML contains inline style attributes');

  return {
    nonce,
    policy,
    scriptTags: scriptTags.length,
    styleTags: styleTags.length,
  };
}

const first = await fetchPage();
const firstInspection = inspectPage(first.response, first.html);
const second = await fetchPage();
const secondInspection = inspectPage(second.response, second.html);
assert(firstInspection.nonce !== secondInspection.nonce, 'nonce was reused across requests');

const reportResponse = await fetch(`${baseUrl}/api/csp-report`, {
  method: 'POST',
  headers: {
    'content-type': 'application/csp-report',
    'user-agent': 'Mozilla/5.0 pumbum-monitoring/1.0',
  },
  body: JSON.stringify({
    'csp-report': {
      'document-uri': `${baseUrl}${testPath}?secret=redacted`,
      'blocked-uri': 'inline',
      'effective-directive': 'script-src-attr',
      disposition: expectedMode === 'report-only' ? 'report' : 'enforce',
    },
  }),
});
assert(reportResponse.status === 204, `CSP report endpoint returned ${reportResponse.status}`);

console.log(JSON.stringify({
  baseUrl,
  mode: expectedMode,
  nonceRotates: true,
  scriptTags: firstInspection.scriptTags,
  styleTags: firstInspection.styleTags,
  inlineStyleAttributes: 0,
  reportEndpointStatus: reportResponse.status,
}, null, 2));
