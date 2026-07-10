export type SourceRef = {
  type: 'supplier' | 'legacy' | 'v2-pilot' | 'manual';
  label: string;
  url?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};
