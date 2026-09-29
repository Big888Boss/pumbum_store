import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('does not expose runtime details to ordinary callers', async () => {
    const response = GET(new Request('http://localhost/api/health'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.catalog).toMatchObject({ products: expect.any(Number), publishedProducts: expect.any(Number), categories: expect.any(Number) });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body).not.toHaveProperty('runtime');
    expect(body).not.toHaveProperty('uptimeSeconds');
  });

  it('exposes only the site mode to the synthetic monitor', async () => {
    const response = GET(new Request('http://localhost/api/health', {
      headers: { 'User-Agent': 'pumbum-monitoring/1.0' },
    }));
    const body = await response.json();
    expect(body.runtime).toEqual({ siteEnv: expect.any(String) });
    expect(body).not.toHaveProperty('uptimeSeconds');
  });
});
