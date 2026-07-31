import { StaticImage } from '@/components/media/StaticImage';
import type { MascotAsset } from '@/lib/mascots';

type MascotPlacement = 'peek' | 'thoughtful' | 'seated' | 'manufacturer' | 'about';

type MascotFigureProps = {
  mascot: MascotAsset;
  placement: MascotPlacement;
  priority?: boolean;
  className?: string;
};

export function MascotFigure({ mascot, placement, priority = false, className = '' }: MascotFigureProps) {
  return (
    <span
      className={`mascot-figure mascot-figure-${placement}${className ? ` ${className}` : ''}`}
      data-mascot={mascot.name}
      aria-hidden="true"
    >
      <StaticImage
        src={mascot.src}
        alt=""
        width={720}
        height={720}
        priority={priority}
      />
    </span>
  );
}
