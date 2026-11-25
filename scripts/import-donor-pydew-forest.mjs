/**
 * PyDew forest slice — portal graph + metadata only (no tile vend).
 */
import fs from 'node:fs';
import path from 'node:path';

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

function stampForestMeta(forest) {
  const props = (forest.properties ?? []).filter(
    (p) => !['olwDonor', 'olwDonorSha', 'olwDonorSlice', 'olwDonorNote'].includes(p.name),
  );
  forest.properties = [
    ...props,
    { name: 'mapId', type: 'string', value: 'forest' },
    { name: 'olwDonor', type: 'string', value: 'pydew' },
    { name: 'olwDonorSha', type: 'string', value: manifest.pinnedCommit },
    { name: 'olwDonorSlice', type: 'string', value: slice.id },
    {
      name: 'olwDonorNote',
      type: 'string',
      value: 'Portal smoke slice — cozy art unchanged',
    },
  ];

  let interactables = forest.layers.find((l) => l.name === 'Interactables');
  if (!interactables) {
    interactables = {
      id: 12,
      name: 'Interactables',
      type: 'objectgroup',
      visible: true,
      opacity: 1,
      draworder: 'topdown',
      x: 0,
      y: 0,
      objects: [],
    };
    forest.layers.push(interactables);
  }
  interactables.objects = interactables.objects.filter((o) => o.name !== 'pydew_forest_sign');
  interactables.objects.push({
    id: 90,
    name: 'pydew_forest_sign',
    type: 'interactable',
    x: 10 * TW,
    y: 8 * TW,
    width: TW * 2,
    height: TW,
    properties: [
      { name: 'kind', type: 'string', value: 'bench' },
      { name: 'labelVi', type: 'string', value: 'Khu rừng PyDew (slice — portal QA)' },
      { name: 'maxRadiusPx', type: 'int', value: 48 },
    ],
  });

  const portals = forest.layers.find((l) => l.name === 'Portals');
  if (portals) {
    const ret = portals.objects.find((o) => o.name === 'forest-to-village');
    if (ret) {
      const spawnX = ret.properties?.find((p) => p.name === 'spawnX');
      const spawnY = ret.properties?.find((p) => p.name === 'spawnY');
      const label = ret.properties?.find((p) => p.name === 'labelVi');
      if (spawnX) spawnX.value = slice.portals.returnToVillage.villageSpawnTile.tileX;
      if (spawnY) spawnY.value = slice.portals.returnToVillage.villageSpawnTile.tileY;
      if (label) label.value = slice.portals.returnToVillage.labelVi;
    }
  }
  return forest;
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
  if (!fs.existsSync(FOREST_JSON)) {
    console.error('Missing forest.json — run npm run generate:world-zones first');
    process.exit(1);
  }
  const forest = stampForestMeta(loadJson(FOREST_JSON));
  writeJson(FOREST_JSON, forest);

  if (fs.existsSync(VILLAGE_JSON)) {
    const village = patchVillageForestPortal(loadJson(VILLAGE_JSON));
    writeJson(VILLAGE_JSON, village);
    console.log('Patched village.json with village-to-forest (PyDew slice)');
  }

  console.log(`Stamped forest.json olwDonor=pydew slice=${slice.id}`);
}

main();