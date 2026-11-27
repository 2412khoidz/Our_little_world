/**
 * Vendor Tuxemon forest donor maps + tilesets (GPL-3.0).
 * Upstream: https://github.com/Tuxemon/Tuxemon
 *
 * Run after cloning upstream to vendor/tuxemon-upstream or set TUXEMON_UPSTREAM.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const UPSTREAM =
  process.env.TUXEMON_UPSTREAM ??
  (fs.existsSync(path.resolve(REPO_ROOT, 'vendor/tuxemon-upstream'))
    ? path.resolve(REPO_ROOT, 'vendor/tuxemon-upstream')
    : path.resolve('/tmp/tuxemon-upstream'));
const OUT_ROOT = path.resolve(REPO_ROOT, 'public/maps/donor/tuxemon');
const MAP_NAMES = ['dryadsgrove.tmx', 'tt_forest_route1.tmx'];
const TILESET_FILES = [
  'core_outdoor.tsx',
  'core_outdoor.png',
  'core_outdoor_water.tsx',
  'core_outdoor_water.png',
  'core_outdoor_nature.tsx',
  'core_outdoor_nature.png',
  'prototyping_outdoor.tsx',
  'prototyping_outdoor.png',
];

function sha(upstream) {
  try {
    return execSync('git rev-parse HEAD', { cwd: upstream, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  if (!fs.existsSync(path.join(UPSTREAM, 'mods/tuxemon/maps/dryadsgrove.tmx'))) {
    console.error(`Missing Tuxemon checkout at ${UPSTREAM}. Clone: git clone https://github.com/Tuxemon/Tuxemon.git`);
    process.exit(1);
  }

  const commit = sha(UPSTREAM);
  const mapsDir = path.join(OUT_ROOT, 'maps');
  const tilesetsDir = path.join(OUT_ROOT, 'gfx/tilesets');

  for (const name of MAP_NAMES) {
    copyFile(
      path.join(UPSTREAM, 'mods/tuxemon/maps', name),
      path.join(mapsDir, name),
    );
  }
  for (const name of TILESET_FILES) {
    const src = path.join(UPSTREAM, 'mods/tuxemon/gfx/tilesets', name);
    if (!fs.existsSync(src)) {
      console.warn(`Skip missing tileset asset: ${name}`);
      continue;
    }
    copyFile(src, path.join(tilesetsDir, name));
  }

  const licenseSrc = path.join(UPSTREAM, 'LICENSE');
  if (fs.existsSync(licenseSrc)) {
    copyFile(licenseSrc, path.join(OUT_ROOT, 'UPSTREAM-LICENSE.txt'));
  }

  const manifest = {
    upstream: 'https://github.com/Tuxemon/Tuxemon',
    commit,
    license: 'GPL-3.0-or-later',
    maps: MAP_NAMES.map((f) => `maps/${f}`),
    tilesets: TILESET_FILES.filter((f) => f.endsWith('.tsx') || f.endsWith('.png')).map(
      (f) => `gfx/tilesets/${f}`,
    ),
    vendoredAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));

  console.log(`Vendored Tuxemon forest @ ${commit} → ${OUT_ROOT}`);
}

main();