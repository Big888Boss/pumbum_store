export type CspMode = 'enforce' | 'report-only';

export type CspContext = {
  headerName: 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only';
  nonce: string;
  policy: string;
};

const cspReportPath = '/api/csp-report';

export function getCspMode(): CspMode {
  return process.env.CSP_MODE?.trim().toLowerCase() === 'report-only'
    ? 'report-only'
    : 'enforce';
}

export function createCspNonce(): string {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

export function buildContentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === 'development';
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://mc.yandex.ru',
    ...(development ? ["'unsafe-eval'"] : []),
  ];
  const styleSources = development
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", `'nonce-${nonce}'`];

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "script-src-attr 'none'",
    `style-src ${styleSources.join(' ')}`,
    "style-src-attr 'unsafe-hashes' 'sha256-/3kWSXHts8LrwfemLzY9W0tOv5I4eLIhrf0pT8cU0WI=' 'sha256-2v0wUgRiMnQqfAAERz6WCRNJ9EZeUWOvHSCDVMftC6Q='",
    "img-src 'self' data: blob: https://aquario.ru https://gidrokontrakt.ru https://mc.yandex.ru https://mc.yandex.com https://yandex.ru https://*.yandex.ru",
    "font-src 'self'",
    "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru wss://mc.yandex.com https://yandex.ru https://*.yandex.ru https://yandex.com https://*.yandex.com",
    "frame-src https://yandex.ru https://*.yandex.ru",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    `report-uri ${cspReportPath}`,
    ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function createCspContext(): CspContext {
  const nonce = createCspNonce();
  return {
    headerName: getCspMode() === 'report-only'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy',
    nonce,
    policy: buildContentSecurityPolicy(nonce),
  };
}
