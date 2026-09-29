import { StaticImage } from '@/components/media/StaticImage';

export function StoreLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'store-logo store-logo-compact' : 'store-logo'}>
      <StaticImage
        className="store-logo-image store-logo-image-light"
        src="/brand/store-logo-light.webp"
        alt="Сантехникъ — магазин инженерной сантехники"
        width={2211}
        height={474}
        priority={!compact}
      />
      <StaticImage
        className="store-logo-image store-logo-image-dark"
        src="/brand/store-logo-dark.webp"
        alt=""
        width={2212}
        height={471}
        priority={!compact}
      />
    </span>
  );
}
