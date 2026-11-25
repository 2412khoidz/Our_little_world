#!/usr/bin/env node
/**
 * Vend Farm Rai Larn Na shop NPC + seed SKU icons @ 2bbb65c (presentation only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(root, '..');
const upstream = path.join(repoRoot, 'vendor/farm-rai-larn-na-upstream');
const destRoot = path.join(repoRoot, 'public/assets/donor/farm-rai-larn-na/shop');
const iconDest = path.join(destRoot, 'icons');

const PAIRS = [
  ['public/art/trader.webp', 'trader.webp'],
  ['public/art/coin.webp', 'coin.webp'],
  ['public/art/seed.webp', 'seed.webp'],
  ['docs/readme/icons/crop-wheat.webp', 'icons/crop-wheat.webp'],
  ['docs/readme/icons/crop-carrot.webp', 'icons/crop-carrot.webp'],
  ['docs/readme/icons/crop-tomato.webp', 'icons/crop-tomato.webp'],
  ['docs/readme/icons/crop-strawberry.webp', 'icons/crop-strawberry.webp'],
];

if (!fs.existsSync(upstream)) {
  console.error('Run node scripts/vendor-wave1-farm-donors.mjs first.');
  process.exit(1);
}

fs.mkdirSync(iconDest, { recursive: true });
for (const [rel, outRel] of PAIRS) {
  const src = path.join(upstream, rel);
  const dest = path.join(destRoot, outRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`copied ${rel} → public/assets/donor/farm-rai-larn-na/shop/${outRel}`);
}

const sha = fs.readFileSync(path.join(upstream, 'UPSTREAM_SHA.txt'), 'utf8').trim();
fs.writeFileSync(
  path.join(repoRoot, 'src/shared/donor/farm-rai-2bbb65c/FARM_RAI_UPSTREAM_SHA.txt'),
  `${sha}\n`,
);