/**
 * Vendor Sprout-Lands-Tilemap + Farmland house tilesets for OLWH-40 home/garden transplant.
 * Upstream:
 * - https://github.com/Maaack/Sprout-Lands-Tilemap
 * - https://github.com/Adrigarsu/farmland (interior wall tiles — compare only; same Sprout-family art)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO = path.resolve(import.meta.dirname, '..');
const OUT = path.resolve(REPO, 'public/maps/donor/sprout-lands');

const SPROUT_UPSTREAM =
  process.env.SPROUT_TILEMAP_UPSTREAM ?? path.resolve('/tmp/sprout-tilemap');
const FARMLAND_UPSTREAM =
  process.env.FARMLAND_UPSTREAM ?? path.resolve('/tmp/farmland-upstream');

const SPROUT_ASSETS = path.join(SPROUT_UPSTREAM, 'addons/sprout_lands_tilemap/assets');
const FARMLAND_TILESETS = path.join(FARMLAND_UPSTREAM, 'assets/game/tilesets');

function sha(cwd) {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function copyRel(src, destRel) {
  const dest = path.join(OUT, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copySproutTileset(name) {
  copyRel(path.join(SPROUT_ASSETS, 'Tilesets', `${name}.png`), `tilesets/${slug(name)}.png`);
}

function copySproutObject(name) {
  copyRel(path.join(SPROUT_ASSETS, 'Objects', `${name}.png`), `objects/${slug(name)}.png`);
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function main() {
  if (!fs.existsSync(path.join(SPROUT_ASSETS, 'Tilesets/Grass.png'))) {
    console.error(
      `Missing Sprout checkout at ${SPROUT_UPSTREAM}. Clone: git clone https://github.com/Maaack/Sprout-Lands-Tilemap.git`,
    );
    process.exit(1);
  }

  for (const name of [
    'Grass',
    'Tilled Dirt',
    'Water',
    'Fences',
    'Wooden House',
    'Hills',
  ]) {
    copySproutTileset(name);
  }

  for (const name of [
    'Paths',
    'Basic Furniture',
    'Basic Plants',
    'Basic Grass Biom things 1',
    'Wood Bridge',
  ]) {
    copySproutObject(name);
  }

  let farmlandSha = 'skipped';
  if (fs.existsSync(path.join(FARMLAND_TILESETS, 'wooden_house_walls_tilset.png'))) {
    copyRel(
      path.join(FARMLAND_TILESETS, 'wooden_house_walls_tilset.png'),
      'farmland/house_walls.png',
    );
    copyRel(path.join(FARMLAND_TILESETS, 'doors.png'), 'farmland/doors.png');
    farmlandSha = sha(FARMLAND_UPSTREAM);
  }

  const sproutSha = sha(SPROUT_UPSTREAM);
  const manifest = {
    sprout: {
      upstream: 'https://github.com/Maaack/Sprout-Lands-Tilemap',
      commit: sproutSha,
      exampleMap: 'scenes/harvest_hill_example.tscn',
      license: 'MIT (see upstream LICENSE)',
    },
    farmland: {
      upstream: 'https://github.com/Adrigarsu/farmland',
      commit: farmlandSha,
      referenceScene: 'scenes/houses/large_house.tscn',
      license: 'Check upstream LICENSE before redistribution',
    },
    vendoredAt: new Date().toISOString(),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT, 'UPSTREAM_SHA.txt'), sproutSha);
  console.log(`Vendored Sprout-Lands @ ${sproutSha} (+ Farmland ref @ ${farmlandSha}) → ${OUT}`);
}

main();