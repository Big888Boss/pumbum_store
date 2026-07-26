'use client';

import { useEffect, useRef, useState } from 'react';
import { StaticImage } from '@/components/media/StaticImage';

type PageMascotProps = {
  src: string;
  alt: string;
  label: string;
  variant?: string;
  priority?: boolean;
};

export function PageMascot({ src, alt, label, variant, priority = true }: PageMascotProps) {
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setLoaded(Boolean(imageRef.current?.complete));
  }, [src]);
  const variantClass = variant ? ` mascot-stage-${variant}` : '';

  return (
    <aside className={`mascot-stage mascot-stage-inline${variantClass}`} aria-label={label}>
      <span className="mascot-stage-glow" aria-hidden="true" />
      <StaticImage
        ref={imageRef}
        className={`mascot-image${loaded ? ' is-loaded' : ''}`}
        src={src}
        alt={alt}
        width={1024}
        height={1536}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </aside>
  );
}
