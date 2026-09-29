import { describe, expect, it } from 'vitest';
import type { Product } from '@/entities/product/model';
import { applyProductPricing, formatMoney, formatProductPrice, parseNumericPrice } from '@/lib/catalog/pricing';
import supplierPriceOverrides from '../../../../content/generated/supplier-price-overrides.json';

type OverrideFile = { prices?: Record<string, { amount: number }> };
const overrides = (supplierPriceOverrides as OverrideFile).prices ?? {};
const valtecKey = Object.keys(overrides).find((key) => key.startsWith('VALTEC::'));

function makeProduct(partial: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    slug: 'test-product',
    categorySlug: 'armatura-i-komplektuyuschie',
    brand: 'generic',
    brandName: 'Generic',
    name: 'Test product',
    shortDescription: '',
    description: '',
    purpose: '',
    image: '/images/placeholder.png',
    highlights: [],
    sellingPoints: [],
    specs: {},
    crossSell: [],
    availability: 'unknown',
    sourceRefs: [],
    dataQuality: {
      score: 0,
      hasRealImage: false,
      hasVerifiedSpecs: false,
      hasSourceRefs: false,
      hasPrice: false,
      hasAvailability: false,
      publishInSitemap: false,
      notes: [],
    },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('parseNumericPrice', () => {
  it('parses Russian formatted prices with spaces and decimal comma', () => {
    expect(parseNumericPrice('1 200,50')).toBe(1200.5);
    expect(parseNumericPrice('1 200,50 ₽')).toBe(1200.5);
    expect(parseNumericPrice('349 руб.')).toBe(349);
  });

  it('returns undefined for on-request, empty and non-positive values', () => {
    expect(parseNumericPrice('по запросу')).toBeUndefined();
    expect(parseNumericPrice('Цена по запросу')).toBeUndefined();
    expect(parseNumericPrice('договорная')).toBeUndefined();
    expect(parseNumericPrice(undefined)).toBeUndefined();
    expect(parseNumericPrice('')).toBeUndefined();
    expect(parseNumericPrice('0')).toBeUndefined();
    expect(parseNumericPrice('-15')).toBeUndefined();
    expect(parseNumericPrice('abc')).toBeUndefined();
  });
});

describe('applyProductPricing', () => {
  it('applies the VALTEC supplier override by SKU when the product has a VALTEC source', () => {
    expect(valtecKey, 'fixture: supplier-price-overrides.json must contain a VALTEC:: entry').toBeDefined();
    const sku = valtecKey!.slice('VALTEC::'.length);
    const expected = overrides[valtecKey!].amount;

    const product = makeProduct({
      sku,
      brand: 'valtec',
      brandName: 'VALTEC',
      sourceRefs: [{ type: 'supplier', label: 'valtec/catalog.json' }],
    });

    const priced = applyProductPricing(product);
    expect(priced.price).toEqual({ amount: expected, currency: 'RUB' });
    expect(priced.dataQuality.hasPrice).toBe(true);
    expect(priced.dataQuality.notes?.some((note) => note.includes('VALTEC'))).toBe(true);
  });

  it('does not apply the VALTEC override to a product without a VALTEC source', () => {
    const sku = valtecKey!.slice('VALTEC::'.length);
    const product = makeProduct({ sku, brand: 'generic', brandName: 'Generic' });
    expect(applyProductPricing(product).price).toBeUndefined();
  });

  it('falls back to the legacy price note when no override exists', () => {
    const product = makeProduct({
      dataQuality: {
        ...makeProduct().dataQuality,
        notes: ['В исходных данных есть цена (1 200,50 ₽), но она не подтверждена поставщиком.'],
      },
    });
    const priced = applyProductPricing(product);
    expect(priced.price).toEqual({ amount: 1200.5, currency: 'RUB' });
    expect(priced.dataQuality.hasPrice).toBe(true);
  });

  it('leaves the product untouched when the legacy note says "по запросу"', () => {
    const product = makeProduct({
      dataQuality: { ...makeProduct().dataQuality, notes: ['В исходных данных есть цена (по запросу).'] },
    });
    const priced = applyProductPricing(product);
    expect(priced.price).toBeUndefined();
    expect(priced.dataQuality.hasPrice).toBe(false);
  });
});

describe('formatMoney / formatProductPrice', () => {
  it('formats rubles without fraction digits for whole amounts', () => {
    const text = formatMoney({ amount: 1200, currency: 'RUB' });
    expect(text.replace(/\s/g, ' ')).toMatch(/^1 200 ₽$/);
  });

  it('keeps kopecks for fractional amounts', () => {
    expect(formatMoney({ amount: 1200.5, currency: 'RUB' }).replace(/\s/g, ' ')).toBe('1 200,50 ₽');
  });

  it('returns the on-request label when the product has no price', () => {
    expect(formatProductPrice(makeProduct())).toBe('Цена по запросу');
  });
});
