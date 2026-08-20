import 'server-only';

import { readFileSync, statSync } from 'node:fs';
import type { Product } from '@/entities/product/model';
import bundledSupplierPriceOverrides from '../../../content/generated/supplier-price-overrides.json';

type SupplierPriceOverride = {
  amount: number;
  currency: 'RUB';
  supplier: string;
  source: string;
  sourceUrl: string;
  sourceDate?: string;
  matchedArticle?: string;
  previousLegacyPrice?: number | null;
};

type SupplierPriceOverrideFile = {
  prices?: Record<string, SupplierPriceOverride>;
};

const MAX_RUNTIME_OVERRIDE_BYTES = 1024 * 1024;
const MAX_RUNTIME_OVERRIDE_COUNT = 10_000;

function normalizeMoneyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function readRuntimeOverrides(): Record<string, SupplierPriceOverride> {
  const path = process.env.PUMBUM_RUNTIME_PRICE_OVERRIDES_FILE?.trim();
  if (!path) return {};
  const size = statSync(path).size;
  if (size <= 0 || size > MAX_RUNTIME_OVERRIDE_BYTES) {
    throw new Error('Runtime price override file is outside the safety limit');
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as SupplierPriceOverrideFile;
  if (!parsed || typeof parsed !== 'object' || !parsed.prices || typeof parsed.prices !== 'object') {
    throw new Error('Runtime price override file is invalid');
  }
  const entries = Object.entries(parsed.prices);
  if (entries.length > MAX_RUNTIME_OVERRIDE_COUNT) {
    throw new Error('Runtime price override file contains too many prices');
  }
  for (const [key, value] of entries) {
    if (!key.includes('::') || !value || typeof value !== 'object') {
      throw new Error('Runtime price override entry is invalid');
    }
    if (!Number.isFinite(value.amount) || value.amount <= 0 || value.currency !== 'RUB') {
      throw new Error('Runtime price override amount is invalid');
    }
  }
  return Object.fromEntries(entries);
}

const bundledFile = bundledSupplierPriceOverrides as SupplierPriceOverrideFile;
const priceOverrides = {
  ...(bundledFile.prices ?? {}),
  ...readRuntimeOverrides(),
};

function parseNumericPrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.includes('запрос') || normalized.includes('договор')) return undefined;
  const numeric = Number(normalized.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return normalizeMoneyAmount(numeric);
}

function getLegacyPriceNote(product: Product): string | undefined {
  const notes = product.dataQuality.notes ?? [];
  for (const note of notes) {
    const match = note.match(/исходных данных есть цена \((.*?)\)/i);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function getPriceOverride(product: Product): SupplierPriceOverride | undefined {
  const sku = product.sku ?? product.vendorCode ?? product.specs['Артикул'];
  if (!sku) return undefined;
  const directOverride = priceOverrides[`${product.brandName}::${sku}`]
    ?? priceOverrides[`${product.brand?.toUpperCase()}::${sku}`];
  if (directOverride) return directOverride;

  const hasValtecSource = product.sourceRefs.some((source) => {
    const label = source.label.toLowerCase();
    const url = source.url?.toLowerCase() ?? '';
    return label.includes('valtec/catalog.json') || url.includes('valtec.ru');
  });
  if (hasValtecSource) return priceOverrides[`VALTEC::${sku}`];

  const hasSinikonSource = product.sourceRefs.some((source) => {
    const label = source.label.toLowerCase();
    const url = source.url?.toLowerCase() ?? '';
    return label.includes('catalog/vnutrennyaya-kanalizaciya.json')
      || label.includes('catalog/naruzhnaya-kanalizaciya.json')
      || label.includes('catalog/vnutrennie-vodostoki.json')
      || label.includes('catalog/truby-pe-x-pe-rt.json')
      || label.includes('catalog/latunnye-aksialnye-fitingi.json')
      || url.includes('sinikon');
  });
  if (hasSinikonSource) return priceOverrides[`SINIKON::${sku}`];
  return undefined;
}

function withPrice(product: Product, amount: number, note?: string): Product {
  const notes = note ? Array.from(new Set([...(product.dataQuality.notes ?? []), note])) : product.dataQuality.notes;
  return {
    ...product,
    price: { amount: normalizeMoneyAmount(amount), currency: 'RUB' },
    dataQuality: {
      ...product.dataQuality,
      hasPrice: true,
      notes,
    },
  };
}

export function applyProductPricing(product: Product): Product {
  const override = getPriceOverride(product);
  if (override && Number.isFinite(override.amount) && override.amount > 0) {
    const sourceDate = override.sourceDate ? ` от ${override.sourceDate}` : '';
    return withPrice(product, override.amount, `Цена подтверждена по ${override.supplier} price list${sourceDate}.`);
  }
  const legacyPrice = parseNumericPrice(getLegacyPriceNote(product));
  if (legacyPrice) return withPrice(product, legacyPrice);
  return product;
}
