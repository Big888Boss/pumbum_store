import { StaticImage } from '@/components/media/StaticImage';

type PageMascotProps = {
  src: string;
  alt: string;
  label: string;
  variant?: string;
  priority?: boolean;
};

export function PageMascot({ src, alt, label, variant, priority = true }: PageMascotProps) {
  const variantClass = variant ? ` mascot-stage-${variant}` : '';

  return (
    <aside className={`mascot-stage mascot-stage-inline${variantClass}`} aria-label={label}>
      <span className="mascot-stage-glow" aria-hidden="true" />
      <StaticImage className="mascot-image" src={src} alt={alt} width={1024} height={1536} priority={priority} />
    </aside>
  );
}
