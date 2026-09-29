/* eslint-disable @next/next/no-img-element */
import { forwardRef, type ImgHTMLAttributes } from 'react';

type StaticImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'decoding' | 'loading'> & {
  alt: string;
  priority?: boolean;
};

export const StaticImage = forwardRef<HTMLImageElement, StaticImageProps>(function StaticImage({ alt, priority = false, ...props }, ref) {
  return (
    <img
      ref={ref}
      {...props}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
});
