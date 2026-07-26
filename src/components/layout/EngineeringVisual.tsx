'use client';

import { useEffect, useRef, useState } from 'react';
import { Droplets } from 'lucide-react';
import { StaticImage } from '@/components/media/StaticImage';

export function EngineeringVisual({ totalProducts }: { totalProducts: number }) {
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setLoaded(Boolean(imageRef.current?.complete));
  }, []);
  return (
    <aside className="engineering-visual mascot-stage mascot-stage-home" aria-label={`Тепловик приветствует посетителей каталога из ${totalProducts.toLocaleString('ru-RU')} позиций`}>
      <div className="engineering-grid" aria-hidden="true" />
      <div className="engineering-glow" aria-hidden="true" />
      <span className="mascot-orbit mascot-orbit-one" aria-hidden="true" />
      <span className="mascot-orbit mascot-orbit-two" aria-hidden="true" />
      <Droplets className="mascot-droplets" aria-hidden="true" />
      <StaticImage
        ref={imageRef}
        className={`mascot-image mascot-image-home${loaded ? ' is-loaded' : ''}`}
        src="/images/mascots/teplovik-welcome.webp"
        alt="Тепловик приветливо машет и приглашает открыть каталог"
        width={846}
        height={994}
        priority
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </aside>
  );
}
