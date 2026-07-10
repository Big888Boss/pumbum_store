import { NextRequest, NextResponse } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number;
};

type Penalty = {
  blockedUntil: number;
  reason: string;
};

const buckets = new Map<string, Bucket>();
const penalties = new Map<string, Penalty>();

const windowMs = 60_000;
const penaltyMs = 15 * 60_000;
const visitorCookieName = 'v2_vis';
const normalLimit = 240;
const catalogLimit = 480;
const productLimit = 600;
const searchLimit = 240;
const suspiciousLimit = 8;
const apiLimit = 80;
const writeApiLimit = 20;
const healthLimit = 600;

const browserLikeUserAgent = /(mozilla\/5\.0|safari\/|chrome\/|firefox\/|edg\/|opr\/|yabrowser\/|mobile)/i;
const trustedSearchBot = /(googlebot|yandexbot|yandeximages|bingbot|duckduckbot)/i;
const trustedSyntheticMonitor = /pumbum-monitoring\/1\.0/i;
const suspiciousUserAgent = /(python-requests|scrapy|beautifulsoup|wget|curl|go-http-client|java\/|aiohttp|node-fetch|axios|undici|httpclient|libwww|perl|phpcrawl|selenium|playwright|phantomjs|headlesschrome|puppeteer)/i;
const aggressiveCrawler = /(ahrefsbot|semrushbot|mj12bot|bytespider|petalbot|dataforseobot|dotbot|blexbot|megaindex|serpstatbot|claudebot|gptbot|ccbot|facebookexternalhit)/i;
const suspiciousPath = /^\/(?:api\/public|api\/catalog|api\/products|content\/generated|_next\/static\/chunks\/.*legacy-catalog)/i;
const disabledOrderApiPath = /^\/api\/(?:cart|leads)$/i;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const nextIp = (request as unknown as { ip?: string }).ip;
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwarded ||
    nextIp ||
    'unknown'
  );
}

function makeVisitorId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9._:-]+/g, '_').slice(0, 220);
}

function getHeaderFingerprint(request: NextRequest, userAgent: string): string {
  return sanitizeKey([
    userAgent,
    request.headers.get('accept-language') ?? '',
    request.headers.get('sec-ch-ua') ?? '',
    request.headers.get('sec-ch-ua-platform') ?? '',
    request.headers.get('accept')?.includes('text/html') ? 'html' : 'non-html',
  ].join('|')) || 'anonymous';
}

function getClientKey(
  request: NextRequest,
  userAgent: string,
  clientClass: 'script' | 'browser',
): { key: string; newVisitorId?: string } {
  const ip = getClientIp(request);
  if (ip !== 'unknown') return { key: `ip:${ip}` };

  if (clientClass === 'browser') {
    const existingVisitorId = request.cookies.get(visitorCookieName)?.value;
    if (existingVisitorId && /^[a-zA-Z0-9._:-]{8,120}$/.test(existingVisitorId)) {
      return { key: `visitor:${existingVisitorId}` };
    }

    const newVisitorId = makeVisitorId();
    return { key: `visitor:${newVisitorId}`, newVisitorId };
  }

  return { key: `fingerprint:${getHeaderFingerprint(request, userAgent)}` };
}

function getPenaltyKey(clientKey: string, pathClass: string, clientClass: 'script' | 'browser'): string {
  return `${clientKey}:${pathClass}:${clientClass}`;
}

function classifyPath(pathname: string, method: string): string {
  if (pathname === '/api/health') return 'health';
  if (pathname === '/cart') return 'cart';
  if (disabledOrderApiPath.test(pathname)) return 'disabled-order-api';
  if (pathname.startsWith('/api/') && method !== 'GET' && method !== 'HEAD') return 'write-api';
  if (pathname.startsWith('/api/')) return 'api';
  if (pathname.startsWith('/search')) return 'search';
  if (/^\/catalog\/[^/]+\/[^/]+/.test(pathname)) return 'product';
  if (pathname.startsWith('/catalog')) return 'catalog';
  return 'page';
}

function getLimit(pathname: string, method: string, userAgent: string): number {
  const pathClass = classifyPath(pathname, method);
  if (pathClass === 'health') return healthLimit;
  if (trustedSearchBot.test(userAgent)) return normalLimit;
  if (aggressiveCrawler.test(userAgent) || suspiciousUserAgent.test(userAgent)) return suspiciousLimit;
  if (pathClass === 'disabled-order-api') return writeApiLimit;
  if (pathClass === 'write-api') return writeApiLimit;
  if (pathname.startsWith('/api/')) return apiLimit;
  if (pathname.startsWith('/search')) return searchLimit;
  if (pathClass === 'product') return productLimit;
  if (pathClass === 'catalog') return catalogLimit;
  return normalLimit;
}

function shouldInspect(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/cart' ||
    suspiciousPath.test(pathname) ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/api/')
  );
}

function cleanupBuckets(now: number): void {
  if (buckets.size >= 5000) {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  if (penalties.size >= 1000) {
    for (const [key, penalty] of penalties.entries()) {
      if (penalty.blockedUntil <= now) penalties.delete(key);
    }
  }
}

function isScriptRequest(request: NextRequest, userAgent: string): boolean {
  if (trustedSearchBot.test(userAgent)) return false;
  if (trustedSyntheticMonitor.test(userAgent)) return false;
  if (!userAgent || suspiciousUserAgent.test(userAgent) || aggressiveCrawler.test(userAgent)) return true;

  const accept = request.headers.get('accept') ?? '';
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const secFetchMode = request.headers.get('sec-fetch-mode') ?? '';

  if (!browserLikeUserAgent.test(userAgent)) return true;
  if (!acceptLanguage && !secFetchMode) return true;
  if (request.nextUrl.pathname.startsWith('/catalog') && accept && !accept.includes('text/html') && !accept.includes('*/*')) return true;

  return false;
}

function botResponse(status: number, message: string, retryAfterSeconds: number, reason: string) {
  return new NextResponse(message, {
    status,
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'X-AntiBot-Policy': reason,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function attachVisitorCookie(response: NextResponse, visitorId: string | undefined, request: NextRequest): NextResponse {
  if (!visitorId) return response;
  response.cookies.set(visitorCookieName, visitorId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
  });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!shouldInspect(pathname)) return NextResponse.next();

  const userAgent = request.headers.get('user-agent') || '';
  const now = Date.now();
  cleanupBuckets(now);

  const pathClass = classifyPath(pathname, request.method);
  const clientClass = isScriptRequest(request, userAgent) ? 'script' : 'browser';
  const { key: clientKey, newVisitorId } = getClientKey(request, userAgent, clientClass);
  const allowDocumentedProbe = request.method === 'HEAD' || pathClass === 'disabled-order-api';

  if (suspiciousPath.test(pathname)) {
    if (clientClass === 'script') {
      penalties.set(getPenaltyKey(clientKey, 'bulk-catalog-probe', clientClass), { blockedUntil: now + penaltyMs, reason: 'bulk-catalog-probe' });
    }
    return botResponse(404, 'Not found', Math.ceil(penaltyMs / 1000), 'bulk-catalog-probe');
  }

  const penaltyKey = getPenaltyKey(clientKey, pathClass, clientClass);
  const activePenalty = penalties.get(penaltyKey);
  if (!allowDocumentedProbe && activePenalty && activePenalty.blockedUntil > now) {
    return attachVisitorCookie(
      botResponse(429, 'Too many requests', Math.ceil((activePenalty.blockedUntil - now) / 1000), activePenalty.reason),
      clientClass === 'browser' ? newVisitorId : undefined,
      request,
    );
  }

  const scriptRequest = clientClass === 'script';
  if (scriptRequest && pathname !== '/api/health' && !allowDocumentedProbe) {
    if (pathClass === 'search' || pathClass === 'catalog' || pathClass === 'product' || pathClass === 'api' || pathClass === 'write-api') {
      penalties.set(penaltyKey, { blockedUntil: now + penaltyMs, reason: 'script-client' });
      return botResponse(403, 'Forbidden', Math.ceil(penaltyMs / 1000), 'script-client');
    }
  }

  const limit = getLimit(pathname, request.method, userAgent);
  const bucketKey = `${clientKey}:${pathClass}:${scriptRequest ? 'script' : 'browser'}`;
  const bucket = buckets.get(bucketKey);
  const nextBucket = !bucket || bucket.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: bucket.count + 1, resetAt: bucket.resetAt };

  buckets.set(bucketKey, nextBucket);

  if (nextBucket.count > limit) {
    if (scriptRequest) {
      penalties.set(penaltyKey, { blockedUntil: now + penaltyMs, reason: `rate-limit:${pathClass}` });
    }
    return attachVisitorCookie(
      botResponse(429, 'Too many requests', Math.ceil((nextBucket.resetAt - now) / 1000), `rate-limit:${pathClass}`),
      clientClass === 'browser' ? newVisitorId : undefined,
      request,
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - nextBucket.count)));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(nextBucket.resetAt / 1000)));
  response.headers.set('X-AntiBot-Policy', pathClass);
  return attachVisitorCookie(response, clientClass === 'browser' ? newVisitorId : undefined, request);
}

export const config = {
  matcher: ['/', '/cart', '/catalog/:path*', '/search', '/api/:path*', '/content/generated/:path*'],
};
