import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWorker } from 'tesseract.js';
import { v2PilotProducts } from '../src/data/v2-catalog.ts';

const evidenceDir = 'docs/evidence';
mkdirSync(evidenceDir, { recursive: true });

const allowedTokens = new Set([
  'valtec',
  'v2020',
  'vt4410',
  'ne16',
  'aquario',
  'adb35',
  'zota',
  'zuma',
  'vivaldo',
  'strv',
  'mr02',
  'vt',
  'n',
]);
const minTokenLength = 3;
const confidenceThreshold = Number(process.env.TASK130_OCR_CONFIDENCE ?? 45);

function tsSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function normalizeWord(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function isAllowedToken(token) {
  if (!token || token.length < minTokenLength) return true;
  if (/^\d+$/.test(token)) return true;
  return allowedTokens.has(token);
}

function extractWords(data) {
  const rawWords = Array.isArray(data?.words) ? data.words : [];
  return rawWords
    .map((word) => {
      const text = String(word?.text ?? '').trim();
      const token = normalizeWord(text);
      const confidence = Number(word?.confidence ?? 0);
      return { text, token, confidence, bbox: word?.bbox ?? null };
    })
    .filter((word) => word.token.length >= minTokenLength && word.confidence >= confidenceThreshold);
}

const worker = await createWorker('eng');
const results = [];
try {
  for (const product of v2PilotProducts) {
    const relativePath = product.image.replace(/^\//, '');
    const filePath = join('public', relativePath);
    const { data } = await worker.recognize(filePath);
    const words = extractWords(data);
    const suspiciousWords = words.filter((word) => !isAllowedToken(word.token));
    results.push({
      category: product.category,
      slug: product.slug,
      sku: product.sku,
      brand: product.brandName,
      image: product.image,
      filePath,
      bytes: statSync(filePath).size,
      ocrText: String(data?.text ?? '').trim(),
      confidenceThreshold,
      detectedWords: words,
      suspiciousWords,
      issues: suspiciousWords.map((word) => `unexpected OCR token "${word.text}" (normalized "${word.token}", confidence ${Math.round(word.confidence)})`),
    });
  }
} finally {
  await worker.terminate();
}

const doc = {
  checkedAt: new Date().toISOString(),
  mode: 'tesseract.js OCR over generated V2 product images',
  productCount: v2PilotProducts.length,
  summary: 'Automated OCR guard for Task 130 generated product images. Brand names/SKU fragments are allowed only because source supplier product photos may contain legitimate tiny markings; other confident OCR tokens are treated as possible hallucinated/embedded text artifacts.',
  allowedTokens: [...allowedTokens].sort(),
  confidenceThreshold,
  results,
  issues: results.flatMap((result) => result.issues.map((issue) => `${result.category}/${result.slug}: ${issue}`)),
};

const evidence = `${evidenceDir}/task-130-ocr-images-${tsSlug()}.json`;
writeFileSync(evidence, JSON.stringify(doc, null, 2));
writeFileSync(`${evidenceDir}/task-130-ocr-images.json`, JSON.stringify(doc, null, 2));

if (doc.issues.length) {
  process.exit(1);
}
