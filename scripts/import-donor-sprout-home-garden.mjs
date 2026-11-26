/**
 * Sprout Lands harvest hill + Farmland house → public/assets/maps/home.json & garden.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';
import { buildGardenMap, buildHomeMap, buildSproutTilesets } from './lib/sproutHomeGardenMaps.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(REPO, 'public/maps/donor/sprout-lands/MANIFEST.json');
const HOME_OUT = path.join(REPO, 'src/assets/maps/home.json');
const GARDEN_OUT = path.join(REPO, 'src/assets/maps/garden.json');
const MAPS_TS = path.join(REPO, 'src/shared/maps.ts');

function recoveryProps() {
  if (!MAP_RECOVERY_MODE) return [];
  return [{ name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE }];
}

function ensureSproutMapDefinitions() {
  const text = fs.readFileSync(MAPS_TS, 'utf8');
  if (text.includes("buildTiledZoneDefinition('home'")) {
    return;
  }
  console.warn('maps.ts: home/garden not on buildTiledZoneDefinition — patch src/shared/maps.ts manually');
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error('Run: node scripts/vendor-donor-sprout-home-garden.mjs');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const sha = manifest.sprout?.commit ?? 'unknown';
  const recovery = recoveryProps();

  const tilesets = buildSproutTilesets(REPO);
  if (tilesets.length < 4) {
    console.error('Too few Sprout tilesets on disk; vendor first.');
    process.exit(1);
  }

  fs.writeFileSync(HOME_OUT, `${JSON.stringify(buildHomeMap(tilesets, sha, recovery), null, 2)}\n`);
  fs.writeFileSync(GARDEN_OUT, `${JSON.stringify(buildGardenMap(tilesets, sha, recovery), null, 2)}\n`);
  ensureSproutMapDefinitions();
  console.log(`Wrote ${HOME_OUT} + ${GARDEN_OUT} (Sprout @ ${sha})`);
}

main();