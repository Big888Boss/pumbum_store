/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from 'react';

type StaticImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'decoding' | 'loading'> & {
  alt: string;
  priority?: boolean;
};

export function StaticImage({ alt, priority = false, ...props }: StaticImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
