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
      <span className={mascot.narrowSrc ? 'mascot-pose-wide' : undefined}>
        <StaticImage
          src={mascot.src}
          alt=""
          width={720}
          height={720}
          priority={priority}
        />
      </span>
      {mascot.narrowSrc ? (
        <span className="mascot-pose-narrow">
          <StaticImage
            src={mascot.narrowSrc}
            alt=""
            width={720}
            height={720}
            priority={priority}
          />
        </span>
      ) : null}
    </span>
  );
}
