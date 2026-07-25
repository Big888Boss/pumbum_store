import { StaticImage } from '@/components/media/StaticImage';

export function StoreLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? 'store-logo store-logo-compact' : 'store-logo'}>
      <StaticImage
        src="/brand/store-logo-current.jpg"
        alt="Сантехникъ — магазин инженерной сантехники"
        width={1220}
        height={274}
        priority={!compact}
      />
    </span>
  );
}
