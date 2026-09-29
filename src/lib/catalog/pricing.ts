import type { Money, Product } from '@/entities/product/model';

export function formatMoney(price: Money): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  }).format(price.amount);
}

export function formatProductPrice(product: Product): string {
  return product.price ? formatMoney(product.price) : 'Цена по запросу';
}
