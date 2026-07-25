export type CatalogImageAssetKind = 'generated-product-photo' | 'brand-logo' | 'category-hero';

export type CatalogImageAsset = {
  id: string;
  kind: CatalogImageAssetKind;
  path: string;
  brand?: string;
  productArticle?: string;
  sourceImage?: string;
  note: string;
};

export const catalogImageAssets: CatalogImageAsset[] = [
  { id: 'logo-valtec', kind: 'brand-logo', path: '/brand-logos/valtec.svg', brand: 'VALTEC', note: 'Brand mark is rendered separately from product photography.' },
  { id: 'logo-aquario', kind: 'brand-logo', path: '/brand-logos/aquario.svg', brand: 'AQUARIO', note: 'Brand mark is rendered separately from product photography.' },
  { id: 'logo-zota', kind: 'brand-logo', path: '/brand-logos/zota.svg', brand: 'ZOTA', note: 'Brand mark is rendered separately from product photography.' },
  { id: 'logo-vivaldo', kind: 'brand-logo', path: '/brand-logos/vivaldo.png', brand: 'VIVALDO', note: 'Brand mark is rendered separately from product photography.' },

  { id: 'pipes-valtec-v2020-080', kind: 'generated-product-photo', path: '/images/generated-v2/pipes-valtec-v2020-080-photo.webp', brand: 'VALTEC', productArticle: 'V2020.080', sourceImage: 'public/images/products/valtec/V2020.040_0.jpg', note: 'Supplier/catalog photo from the same VALTEC V2020 pipe family prepared as normalized WebP; brand mark remains separate.' },
  { id: 'valves-valtec-vt4410-ne16', kind: 'generated-product-photo', path: '/images/generated-v2/valves-valtec-vt4410-ne16-photo.webp', brand: 'VALTEC', productArticle: 'VT.4410.NE.16', sourceImage: 'public/images/products/valtec/VT.4410.NE.16_0.jpg', note: 'Exact supplier/catalog product photo prepared as normalized WebP; brand mark remains separate.' },
  { id: 'pumps-aquario-adb35', kind: 'generated-product-photo', path: '/images/generated-v2/pumps-aquario-adb35-photo.webp', brand: 'AQUARIO', productArticle: 'ADB-35 / 2436', sourceImage: 'public/images/products/aquario/mirror/2436-83b34a37a6b5.png', note: 'AQUARIO catalog id 2436 supplier photo prepared as normalized WebP; brand mark remains separate.' },
  { id: 'boilers-zota-zuma', kind: 'generated-product-photo', path: '/images/generated-v2/boilers-zota-zuma-photo.webp', brand: 'ZOTA', productArticle: 'ZOTA-ZUMA', sourceImage: 'public/images/products/zota/mirror/gazovye-nastennye-kotly-zuma-cbef46e8dba6.png', note: 'ZOTA Zuma supplier photo prepared as normalized WebP; brand mark remains separate.' },
  { id: 'radiators-vivaldo-strv-cr', kind: 'generated-product-photo', path: '/images/generated-v2/radiators-vivaldo-strv-cr-photo.webp', brand: 'VIVALDO', productArticle: 'STRV-CR', sourceImage: 'public/images/products/vivaldo/article-strv-cr.webp', note: 'Exact VIVALDO STRV-CR supplier/catalog product photo prepared as normalized WebP.' },
  { id: 'mixers-valtec-vt-mr02-n', kind: 'generated-product-photo', path: '/images/generated-v2/mixers-valtec-vt-mr02-n-photo.webp', brand: 'VALTEC', productArticle: 'VT.MR02.N', sourceImage: 'public/images/products/valtec/VT.MR02.N.0603_0.jpg', note: 'VALTEC VT.MR02.N supplier-family product photo prepared as normalized WebP.' }
];
