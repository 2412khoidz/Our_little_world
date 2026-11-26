/**
 * Tuxemon forest → OLW forest.json (native multi-tileset, no pydewGlade procedural).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const DONOR = path.join(REPO, 'public/maps/donor/tuxemon');
const OUT_MAPS = path.join(REPO, 'public/assets/maps');
const VILLAGE_JSON = path.join(OUT_MAPS, 'village.json');
const FOREST_JSON = path.join(OUT_MAPS, 'forest.json');
const PY = path.join(REPO, 'scripts/lib/tuxemonTmxToOlwJson.py');
const TW = 16;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function pickMapSlug() {
  if (process.env.OLW_TUXEMON_FOREST_MAP) return process.env.OLW_TUXEMON_FOREST_MAP;
  const choicePath = path.join(DONOR, 'SELECTED_MAP.json');
  if (fs.existsSync(choicePath)) {
    return loadJson(choicePath).slug;
  }
  return 'tt_forest_route1';
}

function sliceForSlug(slug) {
  if (slug === 'dryadsgrove') return 'forest-portal-slice.dryadsgrove.json';
  return 'forest-portal-slice.tt_forest_route1.json';
}

function tmxForSlug(slug) {
  return slug === 'dryadsgrove' ? 'dryadsgrove.tmx' : 'tt_forest_route1.tmx';
}

function patchForestInteractables(forest) {
  const water = forest.layers.find((l) => l.name === 'Water');
  const w = forest.width;
  let fx = 14;
  let fy = 28;
  if (water?.data) {
    for (let i = 0; i < water.data.length; i += 1) {
      if (water.data[i]) {
        fx = i % w;
        fy = Math.floor(i / w);
        break;
      }
    }
  }
  forest.layers = forest.layers.filter((l) => l.name !== 'Interactables' && l.name !== 'NPCSpawns');
  forest.layers.push({
    id: 21,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 91,
        name: 'forest_canvas_stream',
        type: 'interactable',
        x: fx * TW,
        y: fy * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'fishing_spot' },
          { name: 'labelVi', type: 'string', value: 'Suối rừng — câu cá thư giãn' },
          { name: 'maxRadiusPx', type: 'int', value: 56 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'fishingSpotId', type: 'string', value: 'east_stream' },
        ],
      },
      {
        id: 92,
        name: 'forest_glade_bench',
        type: 'interactable',
        x: 21 * TW,
        y: 18 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Ghế gỗ dưới tán thông — ngồi nghỉ cùng nhau' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
        ],
      },
      {
        id: 93,
        name: 'forest_mushroom_forage',
        type: 'interactable',
        x: 8 * TW,
        y: 25 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Bụi nấm rừng — ngắm cảnh cùng nhau' },
          { name: 'maxRadiusPx', type: 'int', value: 46 },
        ],
      },
    ],
  });
  forest.layers.push({
    id: 22,
    name: 'NPCSpawns',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 101,
        name: 'be_na',
        type: 'npc',
        x: 13 * TW,
        y: 30 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'forest_keeper' },
          { name: 'labelVi', type: 'string', value: 'Bé Na (Rừng)' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Rừng thông hôm nay yên tĩnh lắm! Hai bạn men theo lối mòn lên hồ phía đông câu cá hoặc ngồi ghế nghỉ dưới tán cây nhé.',
          },
        ],
      },
    ],
  });
}

function patchVillageForestPortal(village, slice) {
  const donor = village.properties?.find((p) => p.name === 'olwDonor')?.value;
  if (donor !== 'cabacos') return village;
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

function updateSpawnInMapsTs(slug, slice) {
  const mapsTs = path.join(REPO, 'src/shared/maps.ts');
  if (!fs.existsSync(mapsTs)) return;
  const spawn = slice.spawnDefault;
  const text = fs.readFileSync(mapsTs, 'utf8');
  const next = text.replace(
    /forest: buildTiledZoneDefinition\('forest', [^,]+, '[^']+', \{ tileX: \d+, tileY: \d+ \}\)/,
    `forest: buildTiledZoneDefinition('forest', 'Khu rừng', '/assets/maps/forest.json', { tileX: ${spawn.tileX}, tileY: ${spawn.tileY} })`,
  );
  if (next !== text) {
    fs.writeFileSync(mapsTs, next);
    console.log(`Updated forest default spawn → (${spawn.tileX},${spawn.tileY}) [${slug}]`);
  }
}

function main() {
  const manifestPath = path.join(DONOR, 'MANIFEST.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Run: node scripts/vendor-donor-tuxemon-forest.mjs');
    process.exit(1);
  }

  const slug = pickMapSlug();
  const slicePath = path.join(DONOR, sliceForSlug(slug));
  const slice = loadJson(slicePath);

  const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
  execFileSync(pyCmd, [
    PY,
    '--tmx',
    path.join(DONOR, 'maps', tmxForSlug(slug)),
    '--slice',
    slicePath,
    '--manifest',
    manifestPath,
    '--out',
    FOREST_JSON,
    '--slug',
    slug,
  ]);

  const forest = loadJson(FOREST_JSON);
  patchForestInteractables(forest);
  if (MAP_RECOVERY_MODE) {
    forest.properties = [
      ...(forest.properties ?? []).filter((p) => p.name !== 'olwRecovery'),
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
    ];
  }
  writeJson(FOREST_JSON, forest);

  if (fs.existsSync(VILLAGE_JSON)) {
    const village = patchVillageForestPortal(loadJson(VILLAGE_JSON), slice);
    writeJson(VILLAGE_JSON, village);
  }

  updateSpawnInMapsTs(slug, slice);
  console.log(`Forest transplant: Tuxemon ${slug} → ${FOREST_JSON}`);
}

main();