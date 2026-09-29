import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { getClientIp, getTrustedClientIpHeader, middleware } from '@/middleware';

const browserHeaders = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  accept: 'text/html,*/*',
  'accept-language': 'ru-RU,ru;q=0.9',
  'sec-fetch-mode': 'navigate',
};

function request(headers: Record<string, string>, path = '/catalog'): NextRequest {
  return new NextRequest(`https://477477.ru${path}`, { headers: { ...browserHeaders, ...headers } });
}

describe('getTrustedClientIpHeader', () => {
  it('defaults to x-real-ip', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    expect(getTrustedClientIpHeader()).toBe('x-real-ip');
  });

  it('honours TRUSTED_CLIENT_IP_HEADER case-insensitively', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', ' X-Client-IP ');
    expect(getTrustedClientIpHeader()).toBe('x-client-ip');
  });
});

describe('getClientIp', () => {
  it('reads only the trusted proxy header and ignores cf-connecting-ip / x-forwarded-for', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    const first = request({ 'x-real-ip': '203.0.113.10', 'cf-connecting-ip': '1.2.3.1', 'x-forwarded-for': '9.9.9.1' });
    const second = request({ 'x-real-ip': '203.0.113.10', 'cf-connecting-ip': '1.2.3.2', 'x-forwarded-for': '9.9.9.2' });
    expect(getClientIp(first)).toBe('203.0.113.10');
    expect(getClientIp(second)).toBe('203.0.113.10');
  });

  it('takes the first value of a comma separated header', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', 'x-forwarded-for');
    expect(getClientIp(request({ 'x-forwarded-for': ' 198.51.100.7 , 10.0.0.2' }))).toBe('198.51.100.7');
  });

  it('returns unknown when the trusted header is absent even if spoofable headers exist', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    expect(getClientIp(request({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' }))).toBe('unknown');
  });
});

describe('middleware rate-limit bucket', () => {
  it('puts requests with different cf-connecting-ip but the same x-real-ip into one bucket', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const first = middleware(request({ 'x-real-ip': ip, 'cf-connecting-ip': '1.2.3.1' }));
    const second = middleware(request({ 'x-real-ip': ip, 'cf-connecting-ip': '1.2.3.2' }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get('X-AntiBot-Policy')).toBe('catalog');
    const limit = Number(first.headers.get('X-RateLimit-Limit'));
    expect(Number(first.headers.get('X-RateLimit-Remaining'))).toBe(limit - 1);
    expect(Number(second.headers.get('X-RateLimit-Remaining'))).toBe(limit - 2);
  });

  it('keeps separate buckets for different trusted IPs', () => {
    vi.stubEnv('TRUSTED_CLIENT_IP_HEADER', '');
    const a = middleware(request({ 'x-real-ip': '198.51.100.41' }));
    const b = middleware(request({ 'x-real-ip': '198.51.100.42' }));
    const limit = Number(a.headers.get('X-RateLimit-Limit'));
    expect(Number(a.headers.get('X-RateLimit-Remaining'))).toBe(limit - 1);
    expect(Number(b.headers.get('X-RateLimit-Remaining'))).toBe(limit - 1);
  });
});
