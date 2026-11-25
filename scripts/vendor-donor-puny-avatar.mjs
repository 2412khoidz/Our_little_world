#!/usr/bin/env node
/**
 * Refresh CC0 Puny Characters sheets from OpenGameArt (Shade).
 * Output: public/assets/donor/cc0-puny-8d/
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/assets/donor/cc0-puny-8d');
const ZIP = path.join(OUT, '.cache/puny-characters.zip');
const URL = 'https://opengameart.org/sites/default/files/puny-characters.zip';

const FILES = [
  ['Puny-Characters/Character-Base.png', 'character-base.png'],
  ['Puny-Characters/Mage-Cyan.png', 'mage-cyan.png'],
  ['Puny-Characters/Mage-Red.png', 'mage-red.png'],
];

fs.mkdirSync(path.dirname(ZIP), { recursive: true });
execSync(`curl -fsSL -o "${ZIP}" "${URL}"`);

for (const [inner, dest] of FILES) {
  const buf = execSync(`unzip -p "${ZIP}" "${inner}"`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, dest), buf);
  console.log('Wrote', dest, buf.length, 'bytes');
}