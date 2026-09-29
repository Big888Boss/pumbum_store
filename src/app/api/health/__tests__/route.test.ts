import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('returns catalog and site mode without Node details', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.catalog).toMatchObject({ products: expect.any(Number), publishedProducts: expect.any(Number), categories: expect.any(Number) });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.runtime).toEqual({ siteEnv: expect.any(String) });
    expect(body).not.toHaveProperty('uptimeSeconds');
  });

});
