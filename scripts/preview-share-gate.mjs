import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import http from 'node:http';

const listenHost = process.env.PREVIEW_SHARE_HOST ?? '127.0.0.1';
const listenPort = Number(process.env.PREVIEW_SHARE_PORT ?? '3026');
const tailnetHost = process.env.PREVIEW_TAILNET_HOST ?? '';
const tailnetPort = Number(process.env.PREVIEW_TAILNET_PORT ?? '3027');
const upstream = new URL(process.env.PREVIEW_SHARE_UPSTREAM ?? 'http://127.0.0.1:3025');
const accessToken = process.env.PREVIEW_SHARE_TOKEN ?? '';
const sessionMaxAgeSeconds = Number(process.env.PREVIEW_SHARE_SESSION_SECONDS ?? '86400');
const cookieName = '__Host-pumbum_preview';
const attempts = new Map();

if (accessToken.length < 32) {
  throw new Error('PREVIEW_SHARE_TOKEN must contain at least 32 characters');
}
if (!Number.isInteger(listenPort) || listenPort < 1024 || listenPort > 65535) {
  throw new Error('PREVIEW_SHARE_PORT must be a valid unprivileged TCP port');
}

const expectedSession = createHash('sha256')
  .update(`pumbum-preview-v1:${accessToken}`)
  .digest('base64url');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function securityHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    ...extra,
  };
}

function parseCookies(header = '') {
  return new Map(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf('=');
        return separator === -1
          ? [item, '']
          : [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
      }),
  );
}

function hasSession(request) {
  return safeEqual(parseCookies(request.headers.cookie).get(cookieName) ?? '', expectedSession);
}

function clientKey(request) {
  return request.socket.remoteAddress ?? 'unknown';
}

function canAttempt(request) {
  const now = Date.now();
  const key = clientKey(request);
  const current = attempts.get(key);
  if (!current || now - current.startedAt > 15 * 60 * 1000) {
    attempts.set(key, { count: 1, startedAt: now });
    return true;
  }
  current.count += 1;
  return current.count <= 12;
}

function renderGate(response, statusCode = 401, message = 'Откройте персональную ссылку-приглашение.') {
  const nonce = randomBytes(18).toString('base64url');
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Закрытый просмотр — Сантехникъ</title>
  <style nonce="${nonce}">
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030917;color:#f3f7ff}
    main{width:min(92vw,560px);padding:40px;border:1px solid #33425f;border-radius:24px;background:#0b1425;box-shadow:0 30px 80px #0008}
    p{color:#9eabc2;line-height:1.65}
    small{display:block;margin-top:24px;color:#64728b}
  </style>
</head>
<body>
  <main>
    <h1>Закрытый просмотр</h1>
    <p id="status">${message}</p>
    <small>Тестовая версия не индексируется и доступна только по приглашению.</small>
  </main>
  <script nonce="${nonce}">
    (() => {
      const status = document.getElementById('status');
      const token = new URLSearchParams(location.hash.slice(1)).get('access');
      history.replaceState(null, '', location.pathname + location.search);
      if (!token) return;
      status.textContent = 'Проверяем приглашение…';
      fetch('/__preview_access', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({token})
      }).then((result) => {
        if (!result.ok) throw new Error('denied');
        location.replace('/');
      }).catch(() => {
        status.textContent = 'Ссылка недействительна или устарела.';
      });
    })();
  </script>
</body>
</html>`;

  response.writeHead(statusCode, securityHeaders({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  }));
  response.end(html);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error('request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function proxyRequest(request, response, scheme = 'https') {
  const forwardedFor = request.headers['x-forwarded-for'] ?? request.socket.remoteAddress ?? '';
  const proxy = http.request({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port,
    method: request.method,
    path: request.url,
    headers: {
      ...request.headers,
      host: request.headers.host ?? upstream.host,
      'x-forwarded-for': forwardedFor,
      'x-forwarded-host': request.headers.host ?? '',
      'x-forwarded-proto': scheme,
    },
  }, (upstreamResponse) => {
    const headers = {
      ...upstreamResponse.headers,
      'cache-control': 'no-store, max-age=0',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    };
    if (typeof headers.location === 'string' && headers.location.startsWith(upstream.origin)) {
      headers.location = `${scheme}://${request.headers.host}${headers.location.slice(upstream.origin.length)}`;
    }
    response.writeHead(upstreamResponse.statusCode ?? 502, headers);
    upstreamResponse.pipe(response);
  });

  proxy.setTimeout(30_000, () => proxy.destroy(new Error('upstream timeout')));
  proxy.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    }
    response.end('Preview temporarily unavailable');
  });
  request.pipe(proxy);
}

const server = http.createServer(async (request, response) => {
  if (request.url === '/__preview_gate_health') {
    response.writeHead(200, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
    response.end('{"status":"ok"}');
    return;
  }

  if (request.url === '/__preview_access' && request.method === 'POST') {
    if (!canAttempt(request)) {
      response.writeHead(429, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
      response.end('{"status":"rate_limited"}');
      return;
    }
    try {
      const body = await readJson(request);
      if (!safeEqual(String(body.token ?? ''), accessToken)) {
        response.writeHead(403, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
        response.end('{"status":"denied"}');
        return;
      }
      attempts.delete(clientKey(request));
      response.writeHead(204, securityHeaders({
        'Set-Cookie': `${cookieName}=${expectedSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`,
      }));
      response.end();
    } catch {
      response.writeHead(400, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
      response.end('{"status":"invalid_request"}');
    }
    return;
  }

  if (!hasSession(request)) {
    renderGate(response);
    return;
  }

  proxyRequest(request, response);
});

server.headersTimeout = 15_000;
server.requestTimeout = 35_000;
server.keepAliveTimeout = 5_000;
server.listen(listenPort, listenHost, () => {
  console.log(`preview share gate listening on http://${listenHost}:${listenPort}`);
});

const tailnetServer = tailnetHost
  ? http.createServer((request, response) => proxyRequest(request, response, 'http'))
  : undefined;
if (tailnetServer) {
  tailnetServer.headersTimeout = 15_000;
  tailnetServer.requestTimeout = 35_000;
  tailnetServer.keepAliveTimeout = 5_000;
  tailnetServer.listen(tailnetPort, tailnetHost, () => {
    console.log(`preview tailnet proxy listening on http://${tailnetHost}:${tailnetPort}`);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (tailnetServer) tailnetServer.close();
    server.close(() => process.exit(0));
  });
}
