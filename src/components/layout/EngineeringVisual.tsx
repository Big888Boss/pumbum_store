import { Droplets, Hexagon, SlidersHorizontal } from 'lucide-react';

export function EngineeringVisual({ totalProducts }: { totalProducts: number }) {
  return (
    <aside className="engineering-visual" aria-label={`${totalProducts.toLocaleString('ru-RU')} товарных позиций в инженерном каталоге`}>
      <div className="engineering-grid" aria-hidden="true" />
      <div className="engineering-glow" aria-hidden="true" />
      <Hexagon className="engineering-hexagon" aria-hidden="true" />
      <SlidersHorizontal className="engineering-controls-icon" aria-hidden="true" />
      <Droplets className="engineering-droplets" aria-hidden="true" />
      <div className="engineering-status">
        <span>Каталог обновлён</span>
        <strong>{totalProducts.toLocaleString('ru-RU')} позиций</strong>
      </div>
    </aside>
  );
}
