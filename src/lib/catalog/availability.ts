import type { Product } from '@/entities/product/model';

export type ProductAvailabilityPresentation = {
  label: string;
  note: string;
};

export function getProductAvailabilityPresentation(
  product: Product,
): ProductAvailabilityPresentation | undefined {
  if (!product.dataQuality.hasAvailability) return undefined;

  if (product.availability === 'in_stock') {
    return {
      label: 'В наличии',
      note: 'Позиция есть в наличии. Актуальное количество уточнит менеджер.',
    };
  }
  if (product.availability === 'preorder') {
    return {
      label: 'Под заказ',
      note: 'Позиция поставляется под заказ. Срок поставки уточнит менеджер.',
    };
  }
  if (product.availability === 'out_of_stock') {
    return {
      label: 'Нет в наличии',
      note: 'Позиции сейчас нет в наличии. Менеджер предложит срок поставки или аналог.',
    };
  }
  if (product.availability === 'on_request') {
    return {
      label: 'Наличие по запросу',
      note: 'Наличие и срок поставки уточняются у менеджера.',
    };
  }
  return undefined;
}
