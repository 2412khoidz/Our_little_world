/**
 * PyDew forest glade — playable tilemap + Cabacos village portal.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildPydewGladeForestMap, finalizeForestMap } from './lib/pydewGladeTilemap.mjs';

const ROOT = path.resolve('public/maps/donor/pydew');
const OUT_MAPS = path.resolve('public/assets/maps');
const FOREST_JSON = path.join(OUT_MAPS, 'forest.json');
const VILLAGE_JSON = path.join(OUT_MAPS, 'village.json');
const TW = 16;

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'MANIFEST.json'), 'utf8'));
const slice = JSON.parse(fs.readFileSync(path.join(ROOT, 'forest-glade-slice.json'), 'utf8'));

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function patchVillageForestPortal(village) {
  const donor = village.properties?.find((p) => p.name === 'olwDonor')?.value;
  if (donor !== 'cabacos') {
    console.warn('Skip village portal patch: village is not Cabacos donor');
    return village;
  }
  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return village;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-forest');
  const { villageEdgeTile, forestSpawnTile, labelVi } = slice.portals.village;
  portalsLayer.objects.push({
    id: 9106,
    name: 'village-to-forest',
    type: 'portal',
    x: villageEdgeTile.tileX * TW,
    y: villageEdgeTile.tileY * TW,
    width: TW,
    height: TW * 2,
    properties: [
      { name: 'targetMapId', type: 'string', value: 'forest' },
      { name: 'spawnX', type: 'int', value: forestSpawnTile.tileX },
      { name: 'spawnY', type: 'int', value: forestSpawnTile.tileY },
      { name: 'labelVi', type: 'string', value: labelVi },
    ],
  });
  return village;
}

function main() {
  const draft = buildPydewGladeForestMap(slice, manifest);
  const forest = finalizeForestMap(draft);
  writeJson(FOREST_JSON, forest);

  if (fs.existsSync(VILLAGE_JSON)) {
    const village = patchVillageForestPortal(loadJson(VILLAGE_JSON));
    writeJson(VILLAGE_JSON, village);
    console.log('Patched village.json with village-to-forest (PyDew glade)');
  }

  console.log(`Wrote forest.json pydew glade ${forest.width}×${forest.height} sketch=glade-v1-playable`);
}

main();