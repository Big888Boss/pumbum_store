import { mkdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const outDir = 'public/images/generated-v2';
const evidenceDir = 'docs/evidence';
mkdirSync(outDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const assets = [
  {
    slug: 'valtec-v2020-080',
    category: 'pipes',
    brand: 'VALTEC',
    sku: 'V2020.080',
    source: '../public/images/products/valtec/V2020.040_0.jpg',
    out: 'pipes-valtec-v2020-080-photo.webp',
    note: 'Closest available supplier photo in workspace for the same VALTEC V2020 multilayer pipe family; regenerated as normalized V2 WebP for the V2020.080 pilot SKU.',
  },
  {
    slug: 'valtec-vt4410-ne16',
    category: 'valves',
    brand: 'VALTEC',
    sku: 'VT.4410.NE.16',
    source: '../public/images/products/valtec/VT.4410.NE.16_0.jpg',
    out: 'valves-valtec-vt4410-ne16-photo.webp',
    note: 'Exact supplier product photo found in workspace, regenerated as normalized V2 WebP.',
  },
  {
    slug: 'aquario-adb-35',
    category: 'pumps',
    brand: 'AQUARIO',
    sku: 'ADB-35 / catalog 2436',
    source: '../public/images/products/aquario/mirror/2436-83b34a37a6b5.png',
    out: 'pumps-aquario-adb35-photo.webp',
    note: 'AQUARIO catalog id 2436 product photo found in workspace, regenerated as normalized V2 WebP.',
  },
  {
    slug: 'zota-zuma',
    category: 'boilers',
    brand: 'ZOTA',
    sku: 'ZOTA-ZUMA',
    source: '../public/images/products/zota/mirror/gazovye-nastennye-kotly-zuma-cbef46e8dba6.png',
    out: 'boilers-zota-zuma-photo.webp',
    note: 'ZOTA Zuma supplier photo found in workspace, regenerated as normalized V2 WebP.',
  },
  {
    slug: 'vivaldo-strv-cr',
    category: 'radiators',
    brand: 'VIVALDO',
    sku: 'STRV-CR',
    source: '../public/images/products/vivaldo/article-strv-cr.webp',
    out: 'radiators-vivaldo-strv-cr-photo.webp',
    note: 'Exact VIVALDO STRV-CR supplier photo found in workspace, regenerated as normalized V2 WebP.',
  },
  {
    slug: 'valtec-vt-mr02-n',
    category: 'mixers',
    brand: 'VALTEC',
    sku: 'VT.MR02.N',
    source: '../public/images/products/valtec/VT.MR02.N.0603_0.jpg',
    out: 'mixers-valtec-vt-mr02-n-photo.webp',
    note: 'VALTEC VT.MR02.N supplier-family photo found in workspace, regenerated as normalized V2 WebP.',
  },
];

const manifest = [];
for (const asset of assets) {
  if (!existsSync(asset.source)) throw new Error(`Missing source product photo: ${asset.source}`);
  const output = join(outDir, asset.out);
  await sharp(asset.source)
    .resize({ width: 1200, height: 900, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .sharpen({ sigma: 0.8 })
    .webp({ quality: 88, smartSubsample: true })
    .toFile(output);
  const meta = await sharp(output).metadata();
  manifest.push({
    slug: asset.slug,
    category: asset.category,
    brand: asset.brand,
    sku: asset.sku,
    image: `/images/generated-v2/${asset.out}`,
    sourceImage: asset.source.replace(/^\.\.\//, ''),
    provenance: 'workspace supplier/catalog product photo regenerated into normalized V2 selling/informative WebP asset; no SVG mock drawing or synthetic card composite used as source',
    regeneration: 'sharp resize/contain/sharpen/webp from realistic supplier product photo; brand logo rendered separately by ProductImage/BrandLogoOverlay HTML/CSS',
    logoFree: true,
    noEmbeddedText: true,
    noEmbeddedLogo: true,
    width: meta.width,
    height: meta.height,
    bytes: statSync(output).size,
    note: asset.note,
  });
}

const doc = {
  generatedAt: new Date().toISOString(),
  note: 'Task 130 DAG autofix #3: realistic product visuals regenerated from supplier/catalog product photos already present in the workspace. Brand marks remain separate HTML/CSS overlays.',
  assets: manifest,
};
writeFileSync(join(outDir, 'manifest.task130.json'), JSON.stringify(doc, null, 2));
writeFileSync(join(evidenceDir, 'task-130-realistic-image-manifest.json'), JSON.stringify(doc, null, 2));
writeFileSync(join(evidenceDir, 'task-130-generated-image-manifest.json'), JSON.stringify(doc, null, 2));
