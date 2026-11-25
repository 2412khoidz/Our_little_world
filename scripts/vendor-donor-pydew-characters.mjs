#!/usr/bin/env node
/**
 * Vend PyDew Valley farmer character frames (CC0) for unified cozy gameplay rig.
 * Upstream: vendor/pydew-valley-upstream @ pydew-valley (artemn0va).
 * Run: node scripts/vendor-donor-pydew-valley.mjs first if clone missing.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UPSTREAM = path.join(ROOT, 'vendor/pydew-valley-upstream/graphics/character');
const OUT = path.join(ROOT, 'public/assets/donor/pydew-characters/source');
const SHA_FILE = path.join(ROOT, 'public/maps/donor/pydew-valley/UPSTREAM_SHA.txt');

if (!fs.existsSync(UPSTREAM)) {
  throw new Error('Missing vendor/pydew-valley-upstream — run node scripts/vendor-donor-pydew-valley.mjs');
}

const sha = fs.existsSync(SHA_FILE) ? fs.readFileSync(SHA_FILE, 'utf8').trim() : 'unknown';

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyTree(UPSTREAM, OUT);

const licenseSrc = path.join(ROOT, 'public/maps/donor/pydew-valley/UPSTREAM-LICENSE.txt');
if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, path.join(ROOT, 'public/assets/donor/pydew-characters/UPSTREAM-LICENSE.txt'));
}
fs.writeFileSync(path.join(ROOT, 'public/assets/donor/pydew-characters/UPSTREAM_SHA.txt'), `${sha}\n`);

fs.writeFileSync(
  path.join(ROOT, 'public/assets/donor/pydew-characters/CREDITS.md'),
  `# PyDew Valley — farmer character (CC0)

- **Upstream:** [artemn0va/pydew-valley](https://github.com/artemn0va/pydew-valley) @ \`${sha}\`
- **Source path:** \`graphics/character/*\` (4-way walk/idle/hoe/water/axe)
- **OLW:** Packed gameplay atlases via \`python3 scripts/build-pydew-farmer-gameplay-atlas.py\`
- **8-dir path:** Facing8 diagonals resolve to cardinal clips (no alpha composite).
`,
);

console.log(`Vendored PyDew farmer character → public/assets/donor/pydew-characters/source @ ${sha}`);
execSync('python3 scripts/build-pydew-farmer-gameplay-atlas.py', { stdio: 'inherit', cwd: ROOT });