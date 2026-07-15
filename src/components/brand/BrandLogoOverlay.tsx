import { StaticImage } from '@/components/media/StaticImage';

export function BrandLogoOverlay({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  const normalizedSrc = src.toLowerCase();
  const modifier = normalizedSrc.includes('vivaldo')
    ? ' logo-overlay-vivaldo'
    : normalizedSrc.includes('/tim.')
      ? ' logo-overlay-tim'
      : '';

  return (
    <div className={`logo-overlay${modifier}`} aria-hidden="true">
      <StaticImage src={src} alt={alt} width={120} height={42} />
    </div>
  );
}
