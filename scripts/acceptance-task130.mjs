import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { v2PilotProducts } from '../src/data/v2-catalog.ts';

const requiredCategories = ['pipes', 'valves', 'pumps', 'boilers', 'radiators', 'mixers'];
const manifest = JSON.parse(readFileSync('public/images/generated-v2/manifest.task130.json', 'utf8'));
const issues = [];

const counts = Object.fromEntries(requiredCategories.map((category) => [category, 0]));
for (const product of v2PilotProducts) {
  if (counts[product.category] === undefined) issues.push(`unexpected category ${product.category}`);
  else counts[product.category] += 1;
  if (!product.image.startsWith('/images/generated-v2/') || !product.image.endsWith('-photo.webp')) issues.push(`${product.slug}: image is not regenerated photo asset: ${product.image}`);
  if (product.image.includes('generated-placeholders') || product.image.includes('/images/products/')) issues.push(`${product.slug}: image still references placeholder/legacy product path`);
  const imageFile = join('public', product.image);
  if (!existsSync(imageFile)) issues.push(`${product.slug}: missing image file ${imageFile}`);
  else if (statSync(imageFile).size < 5000) issues.push(`${product.slug}: image file unexpectedly small`);
  const logoFile = join('public', product.logo);
  if (!existsSync(logoFile)) issues.push(`${product.slug}: missing logo file ${logoFile}`);
  const manifestAsset = manifest.assets.find((asset) => asset.slug === product.slug && asset.image === product.image);
  if (!manifestAsset) issues.push(`${product.slug}: no matching manifest asset`);
  else {
    if (!manifestAsset.sourceImage || !manifestAsset.provenance?.includes('supplier/catalog product photo')) issues.push(`${product.slug}: manifest lacks realistic source provenance`);
    if (!manifestAsset.logoFree || !manifestAsset.noEmbeddedText || !manifestAsset.noEmbeddedLogo) issues.push(`${product.slug}: manifest logo/text flags not asserted`);
    if (manifestAsset.width !== 1200 || manifestAsset.height !== 900) issues.push(`${product.slug}: unexpected dimensions ${manifestAsset.width}x${manifestAsset.height}`);
  }
}
for (const [category, count] of Object.entries(counts)) {
  if (count !== 1) issues.push(`category ${category} has ${count} active pilot products, expected 1`);
}

const productImageSource = readFileSync('src/components/product/ProductImage.tsx', 'utf8');
const brandOverlaySource = readFileSync('src/components/brand/BrandLogoOverlay.tsx', 'utf8');
const cssSource = readFileSync('src/app/globals.css', 'utf8');
if (!productImageSource.includes('<BrandLogoOverlay')) issues.push('ProductImage does not mount BrandLogoOverlay');
if (!brandOverlaySource.includes('className="logo-overlay"')) issues.push('BrandLogoOverlay does not render .logo-overlay');
if (!cssSource.includes('.logo-overlay') || !cssSource.includes('position: absolute')) issues.push('global CSS does not position logo overlay absolutely');

const report = { checkedAt: new Date().toISOString(), productCount: v2PilotProducts.length, categoryCounts: counts, manifestAssets: manifest.assets.length, issues };
if (issues.length) process.exit(1);
