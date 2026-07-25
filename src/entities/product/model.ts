import type { SourceRef } from '@/entities/shared/source';

export type SupplierId = 'valtec' | 'aquario' | 'zota' | 'vivaldo' | 'sinikon' | 'aquatec' | 'gidrokontrakt' | 'tim' | 'espa' | 'generic';
export type BrandId = SupplierId;

export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'preorder' | 'unknown' | 'on_request';

export type Money = {
  amount: number;
  currency: 'RUB';
};

export type DataQuality = {
  score: number;
  hasRealImage: boolean;
  hasVerifiedSpecs: boolean;
  hasSourceRefs: boolean;
  hasPrice: boolean;
  hasAvailability: boolean;
  publishInSitemap: boolean;
  notes?: string[];
};

export type Product = {
  id: string;
  slug: string;
  categorySlug: string;
  brand: BrandId;
  brandName: string;
  supplier?: SupplierId;
  supplierName?: string;
  name: string;
  sku?: string;
  vendorCode?: string;
  shortDescription: string;
  description: string;
  purpose: string;
  image: string;
  logo?: string;
  hideBrandLogo?: boolean;
  highlights: string[];
  sellingPoints: string[];
  suitableFor?: string[];
  selectionHelp?: string[];
  specs: Record<string, string>;
  crossSell: string[];
  price?: Money;
  availability: ProductAvailability;
  sourceRefs: SourceRef[];
  dataQuality: DataQuality;
  updatedAt: string;
};
