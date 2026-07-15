import type { Product } from '@/entities/product/model';
import { getProductAvailabilityPresentation } from '@/lib/catalog/availability';

type Props = {
  product: Product;
};

function availabilityClass(product: Product): string {
  return `availability-${product.availability.replaceAll('_', '-')}`;
}

export function ProductAvailabilityBadge({ product }: Props) {
  const presentation = getProductAvailabilityPresentation(product);
  if (!presentation || product.availability === 'in_stock' || product.availability === 'on_request') return null;
  return (
    <li className={`badge availability-badge ${availabilityClass(product)}`}>
      {presentation.label}
    </li>
  );
}

export function ProductAvailabilityText({ product }: Props) {
  const presentation = getProductAvailabilityPresentation(product);
  if (!presentation || product.availability === 'in_stock' || product.availability === 'on_request') return null;
  return (
    <span className={`availability-text ${availabilityClass(product)}`}>
      {presentation.label}
    </span>
  );
}
