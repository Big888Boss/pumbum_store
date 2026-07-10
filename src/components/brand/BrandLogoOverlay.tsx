import Image from 'next/image';

export function BrandLogoOverlay({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  const className = src.toLowerCase().includes('vivaldo')
    ? 'logo-overlay logo-overlay-vivaldo'
    : 'logo-overlay';

  return (
    <div className={className} aria-hidden="true">
      <Image src={src} alt={alt} width={120} height={42} />
    </div>
  );
}
