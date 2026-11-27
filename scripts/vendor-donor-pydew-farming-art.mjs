#!/usr/bin/env node
/**
 * Copy PyDew Valley farm-tile presentation slices into shipped assets (soil_water, fruit growth).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_ROOT = path.join(ROOT, 'public/maps/donor/pydew-valley/graphics');
const DEST = path.join(ROOT, 'public/assets/donor/pydew-farming');

function copyDirFlat(relDir, destSub) {
  const srcDir = path.join(SRC_ROOT, relDir);
  const outDir = path.join(DEST, destSub);
  fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(srcDir)) {
    console.error('Missing', srcDir, '— run: node scripts/vendor-donor-pydew-valley.mjs');
    process.exit(1);
  }
  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith('.png')) continue;
    fs.copyFileSync(path.join(srcDir, name), path.join(outDir, name));
    console.log('copied pydew', destSub, name);
  }
}

const sha = fs
  .readFileSync(path.join(ROOT, 'public/maps/donor/pydew-valley/UPSTREAM_SHA.txt'), 'utf8')
  .trim()
  .split('\n')[0];
copyDirFlat('soil_water', 'soil_water');
copyDirFlat('fruit/tomato', 'fruit/tomato');
copyDirFlat('fruit/corn', 'fruit/corn');

const cred = `PyDew Valley (artemn0va/pydew-valley)\n${sha}\n`;
fs.writeFileSync(path.join(DEST, 'UPSTREAM_SHA.txt'), cred);
console.log('PyDew farming art done');