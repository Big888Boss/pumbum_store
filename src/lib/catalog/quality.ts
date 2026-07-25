import type { Product } from '@/entities/product/model';

export function canPublishProductInSitemap(product: Product): boolean {
  return product.dataQuality.publishInSitemap && product.dataQuality.score >= 75 && product.dataQuality.hasSourceRefs;
}

export function canPublishOfferSchema(product: Product): boolean {
  return Boolean(
    product.price
    && Number.isFinite(product.price.amount)
    && product.price.amount > 0
    && product.price.currency === 'RUB'
    && product.dataQuality.hasPrice,
  );
}

export function getProductSchemaAvailability(product: Product): string | undefined {
  if (!product.dataQuality.hasAvailability) return undefined;
  if (product.availability === 'unknown' || product.availability === 'on_request') return undefined;

  if (product.availability === 'in_stock') return 'https://schema.org/InStock';
  if (product.availability === 'preorder') return 'https://schema.org/PreOrder';
  return 'https://schema.org/OutOfStock';
}

export function getProductQualityNotes(product: Product): string[] {
  const notes = [...(product.dataQuality.notes ?? [])];
  if (!product.dataQuality.hasPrice) notes.push('Цена не подтверждена для production Offer schema.');
  if (!product.dataQuality.hasAvailability) notes.push('Наличие не подтверждено для production Offer schema.');
  if (!product.dataQuality.hasSourceRefs) notes.push('Нет sourceRefs для проверки происхождения данных.');
  return Array.from(new Set(notes));
}
