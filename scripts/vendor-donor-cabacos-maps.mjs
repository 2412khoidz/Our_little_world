#!/usr/bin/env node
/**
 * Vend Cabacos tilemaps + interior PNGs into public/maps/donor/cabacos/.
 * Upstream: vendor/farming-simulator-cabacos-upstream @ 79e423d (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UPSTREAM_TILEMAP = path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream/public/assets/tilemap');
const DEST = path.join(ROOT, 'public/maps/donor/cabacos');

const FILES = [
  'Cabacos_map.tmj',
  'Crop_market.tmj',
  'Seed_shop.tmj',
  'tool_shop.tmj',
  'Town_hall.tmj',
  'ts_map.png',
  'ts_forest.png',
  'crop_market_sem_fundo.png',
  'seed_shop_sunnyside_style_384x288.png',
  'tool_shop_sunnyside_style_384x288.png',
  'town_hall_sem_fundo.png',
  'town_hall_sunnyside_style_384x288.png',
];

function main() {
  if (!fs.existsSync(UPSTREAM_TILEMAP)) {
    console.error('Missing vendor clone — run: node scripts/vendor-wave1-farm-donors.mjs');
    process.exit(1);
  }
  fs.mkdirSync(DEST, { recursive: true });
  for (const file of FILES) {
    const src = path.join(UPSTREAM_TILEMAP, file);
    if (!fs.existsSync(src)) {
      console.error('Missing upstream file:', file);
      process.exit(1);
    }
    fs.copyFileSync(src, path.join(DEST, file));
  }
  const sha = fs
    .readFileSync(path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream/UPSTREAM_SHA.txt'), 'utf8')
    .trim();
  console.log(`Vendored ${FILES.length} Cabacos map assets → public/maps/donor/cabacos/ @ ${sha}`);
}

main();