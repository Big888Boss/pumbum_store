import type { FaqItem, SourceRef } from '@/entities/shared/source';

export type Category = {
  slug: string;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  seoText: string;
  buyingGuide: string;
  faq: FaqItem[];
  parentSlug?: string;
  priority: number;
  sourceRefs: SourceRef[];
  updatedAt: string;
};
