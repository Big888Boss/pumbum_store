import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const categorySource = readFileSync(join(root, 'src/lib/catalog/purpose.ts'), 'utf8');
const videoSource = readFileSync(join(root, 'src/lib/catalog/category-videos.ts'), 'utf8');
const categoryBlock = categorySource.match(/export const purposeCategories:[\s\S]+?\n\];/u)?.[0] ?? '';
const videoBlock = videoSource.match(/const categoryVideos = \{[\s\S]+?\n\} as const;/u)?.[0] ?? '';
const slugsFrom = (source) => [...source.matchAll(/(?:slug:\s*|^\s*)['"]?([a-z][a-z0-9-]+)['"]?\s*:/gmu)].map((match) => match[1]);
const categorySlugs = [...categoryBlock.matchAll(/slug:\s*'([^']+)'/gu)].map((match) => match[1]);
const videoSlugs = slugsFrom(videoBlock).filter((slug) => slug !== 'const');

const failures = [];
if (categorySlugs.length !== 10) failures.push(`expected 10 catalog categories, found ${categorySlugs.length}`);
if (videoSlugs.length !== 10) failures.push(`expected 10 category videos, found ${videoSlugs.length}`);

for (const slug of categorySlugs) {
  if (!videoSlugs.includes(slug)) failures.push(`missing video mapping for ${slug}`);
}
for (const slug of videoSlugs) {
  if (!categorySlugs.includes(slug)) failures.push(`video mapping has unknown category ${slug}`);

  const videoPath = join(root, 'public/videos/categories', `${slug}.mp4`);
  const posterPath = join(root, 'public/videos/categories/posters', `${slug}.jpg`);
  try {
    const size = statSync(videoPath).size;
    if (size < 50_000 || size > 1_500_000) failures.push(`${slug}.mp4 has unexpected size ${size}`);
    const signature = readFileSync(videoPath).subarray(4, 8).toString('ascii');
    if (signature !== 'ftyp') failures.push(`${slug}.mp4 has no MP4 ftyp signature`);
  } catch {
    failures.push(`missing ${videoPath}`);
  }
  try {
    const size = statSync(posterPath).size;
    if (size < 5_000 || size > 120_000) failures.push(`${slug}.jpg has unexpected size ${size}`);
    const bytes = readFileSync(posterPath);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) failures.push(`${slug}.jpg has no JPEG signature`);
  } catch {
    failures.push(`missing ${posterPath}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Category video contract passed: ${videoSlugs.length} mappings, ${videoSlugs.length} MP4 files and ${videoSlugs.length} posters.`);
