import { describe, expect, it, vi } from 'vitest';
import { buildContentSecurityPolicy, createCspContext, createCspNonce, getCspMode } from '@/lib/security/csp';

function directive(policy: string, name: string): string | undefined {
  return policy.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `) || part === name);
}

describe('buildContentSecurityPolicy (production)', () => {
  const nonce = 'dGVzdC1ub25jZQ==';
  const policy = buildContentSecurityPolicy(nonce);

  it('binds scripts and styles to the request nonce', () => {
    expect(directive(policy, 'script-src')).toContain(`'nonce-${nonce}'`);
    expect(directive(policy, 'script-src')).toContain("'strict-dynamic'");
    expect(directive(policy, 'style-src')).toContain(`'nonce-${nonce}'`);
  });

  it('never allows unsafe-inline or unsafe-eval for scripts', () => {
    const scriptSrc = directive(policy, 'script-src') ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(directive(policy, 'script-src-attr')).toBe("script-src-attr 'none'");
  });

  it('reports violations to the CSP endpoint and hardens framing/objects', () => {
    expect(directive(policy, 'report-uri')).toBe('report-uri /api/csp-report');
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'self'");
  });

  it('upgrades insecure requests in production only', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'production');
    expect(buildContentSecurityPolicy(nonce)).toContain('upgrade-insecure-requests');
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'staging');
    expect(buildContentSecurityPolicy(nonce)).not.toContain('upgrade-insecure-requests');
    vi.unstubAllEnvs();
  });
});

describe('createCspNonce', () => {
  it('produces unique base64 nonces', () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a.length).toBeGreaterThanOrEqual(24);
  });
});

describe('getCspMode / createCspContext', () => {
  it('enforces by default', () => {
    vi.stubEnv('CSP_MODE', '');
    expect(getCspMode()).toBe('enforce');
    expect(createCspContext().headerName).toBe('Content-Security-Policy');
  });

  it('switches to report-only when CSP_MODE=report-only', () => {
    vi.stubEnv('CSP_MODE', ' Report-Only ');
    expect(getCspMode()).toBe('report-only');
    const context = createCspContext();
    expect(context.headerName).toBe('Content-Security-Policy-Report-Only');
    expect(context.policy).toContain(`'nonce-${context.nonce}'`);
  });
});
