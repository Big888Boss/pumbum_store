// Type-based fallback pictogram for products without a real photo.
// Keyword matching on the product name picks a recognizable line icon,
// so listings never show an empty gray frame.

type IconDef = {
  label: string;
  paths: string[];
};

const ICONS: Record<string, IconDef> = {
  pipe: {
    label: 'Труба',
    paths: ['M6 18h36', 'M6 30h36', 'M6 14v8', 'M42 14v8', 'M6 26v8', 'M42 26v8'],
  },
  fitting: {
    label: 'Фитинг',
    paths: ['M8 18h14v-8h4v8h14', 'M8 30h32', 'M8 14v20', 'M40 14v20', 'M18 10h12'],
  },
  valve: {
    label: 'Кран',
    paths: ['M6 24l14 -7v14z', 'M42 24l-14 -7v14z', 'M24 24v-8', 'M17 12h14'],
  },
  pump: {
    label: 'Насос',
    paths: ['M20 16a10 10 0 1 0 0 20a10 10 0 0 0 0 -20', 'M30 22h12v-6', 'M12 36h24', 'M20 26a4 4 0 1 0 0 -8'],
  },
  manifold: {
    label: 'Коллектор',
    paths: ['M6 16h36', 'M6 24h36', 'M12 24v12', 'M24 24v12', 'M36 24v12', 'M6 12v16', 'M42 12v16'],
  },
  gauge: {
    label: 'Прибор',
    paths: ['M24 10a13 13 0 1 0 0 26a13 13 0 0 0 0 -26', 'M24 23l7 -7', 'M24 36v6', 'M20 42h8'],
  },
  radiator: {
    label: 'Радиатор',
    paths: ['M10 12v24', 'M17 12v24', 'M24 12v24', 'M31 12v24', 'M38 12v24', 'M10 16h28', 'M10 32h28'],
  },
  drain: {
    label: 'Канализация',
    paths: ['M12 8v20a8 8 0 0 0 8 8h20', 'M20 8v18a4 4 0 0 0 4 4h16', 'M12 8h8', 'M40 30v8'],
  },
  tank: {
    label: 'Бак',
    paths: ['M16 8h16a6 6 0 0 1 6 6v16a6 6 0 0 1 -6 6h-16a6 6 0 0 1 -6 -6v-16a6 6 0 0 1 6 -6', 'M18 36v6', 'M30 36v6', 'M24 8v-4'],
  },
  boiler: {
    label: 'Котёл',
    paths: ['M14 6h20v36h-20z', 'M24 26c-4 -3 -2 -7 0 -9c0 3 5 4 3 8a4 4 0 0 1 -3 1', 'M18 42v4', 'M30 42v4'],
  },
  filter: {
    label: 'Фильтр',
    paths: ['M8 16h14l8 10h10', 'M8 26h14l8 -10', 'M30 32l4 6', 'M8 12v8', 'M8 22v8'],
  },
  insulation: {
    label: 'Изоляция',
    paths: ['M10 32a14 14 0 0 1 28 0', 'M16 32a8 8 0 0 1 16 0', 'M6 32h36', 'M24 18v-6'],
  },
  generic: {
    label: 'Сантехника',
    paths: ['M24 6c6 8 12 14 12 22a12 12 0 1 1 -24 0c0 -8 6 -14 12 -22', 'M19 30a5 5 0 0 0 5 5'],
  },
};

const TYPE_RULES: Array<[RegExp, keyof typeof ICONS]> = [
  [/насос|станци/i, 'pump'],
  [/котел|котёл|котл/i, 'boiler'],
  [/радиатор|теплый пол|тёплый пол/i, 'radiator'],
  [/коллектор|гребенк|гребёнк/i, 'manifold'],
  [/фильтр|грязевик/i, 'filter'],
  [/кран|вентил|клапан|затвор|задвижк/i, 'valve'],
  [/маномет|термомет|счетчик|счётчик|датчик|прибор|термостат/i, 'gauge'],
  [/бак|емкост|ёмкост|гидроаккум|расширительн/i, 'tank'],
  [/канализац|раструб|трап|водоотвед|водосток/i, 'drain'],
  [/изоляц|утепл|теплоизоляц/i, 'insulation'],
  [/гильз|фитинг|муфт|тройник|угольник|уголок|переход|ниппел|сгон|заглушк|американк|евроконус|соединит/i, 'fitting'],
  [/труб/i, 'pipe'],
];

export function pickProductType(text: string): keyof typeof ICONS {
  for (const [pattern, key] of TYPE_RULES) {
    if (pattern.test(text)) return key;
  }
  return 'generic';
}

export function ProductTypeIcon({ text, compact = false }: { text: string; compact?: boolean }) {
  const icon = ICONS[pickProductType(text)];
  return (
    <span className="product-fallback-pict" aria-hidden="true">
      <svg
        viewBox="0 0 48 48"
        width={compact ? 44 : 64}
        height={compact ? 44 : 64}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {compact ? null : <span className="product-fallback-type">{icon.label}</span>}
    </span>
  );
}
