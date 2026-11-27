/**
 * Tuxemon forest → OLW forest.json (native multi-tileset, no pydewGlade procedural).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const DONOR = path.join(REPO, 'public/maps/donor/tuxemon');
const OUT_MAPS = path.join(REPO, 'src/assets/maps');
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
  const ground = forest.layers.find((l) => l.name === 'Ground');
  const water = forest.layers.find((l) => l.name === 'Water');
  const veg = forest.layers.find((l) => l.name === 'Vegetation');
  const col = forest.layers.find((l) => l.name === 'Collision');
  const portals = forest.layers.find((l) => l.name === 'Portals');

  // Ensure reciprocal topology (Forest connects strictly to Farm North Road)
  if (portals?.objects) {
    portals.objects = portals.objects
      .filter((o) => o.name !== 'forest-to-beach')
      .map((o) =>
        o.name === 'forest-to-village'
          ? {
              ...o,
              name: 'forest-to-farm',
              properties: [
                { name: 'targetMapId', type: 'string', value: 'farm' },
                { name: 'spawnX', type: 'int', value: 29 },
                { name: 'spawnY', type: 'int', value: 2 },
                { name: 'labelVi', type: 'string', value: 'Về Nông trại' },
              ],
            }
          : o,
      );
  }

  // Bake all Water tiles, Pokémon-style brown cliff ledges (2507..2633), & solid Vegetation into Collision
  const LEDGE_GROUND_GIDS = new Set([2507, 2508, 2509, 2569, 2572, 2633]);
  const SOLID_FOREST_VEG_GIDS = new Set([
    2107, 2157, 2158, 2159, 2160, 2235, 2294, 2299, 2300, 3256, 3257, 3324, 3382, 3383, 3385,
  ]);
  const w = forest.width;
  const h = forest.height;
  if (col?.data) {
    for (let i = 0; i < col.data.length; i += 1) {
      const gg = (ground?.data?.[i] ?? 0) & 0x1fffffff;
      if ((water?.data?.[i] ?? 0) > 0 || LEDGE_GROUND_GIDS.has(gg)) {
        col.data[i] = 1;
      } else {
        const vg = (veg?.data?.[i] ?? 0) & 0x1fffffff;
        if (SOLID_FOREST_VEG_GIDS.has(vg)) col.data[i] = 1;
      }
    }

    // Bake discrete Pokémon-style elevation terraces + trail ramp transitions:
    //  0 = blocked cliff/water/trees
    //  1 = southern entry clearing (y >= 31) & y=30 trail ramp (x=14..15)
    //  2 = mid forest plateau (y = 18..29) & y=17 trail passes (x=10..11, x=18..22)
    //  3 = northern lake/pine upper terrace (y <= 16)
    const elevation = new Array(w * h).fill(0);
    const transitions = new Array(w * h).fill(0);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        if ((col.data[i] ?? 0) > 0) continue;
        if (y <= 16) {
          elevation[i] = 3;
        } else if (y === 17) {
          elevation[i] = 2;
          transitions[i] = 1;
        } else if (y <= 29) {
          elevation[i] = 2;
        } else if (y === 30) {
          elevation[i] = 1;
          transitions[i] = 1;
        } else {
          elevation[i] = 1;
        }
      }
    }

    // Remove isolated cliff pockets unreachable under discrete elevation transitions (e.g. NW walled shelf)
    const reachSeen = new Set([31 * w + 13]);
    const reachQ = [[13, 31]];
    while (reachQ.length > 0) {
      const [cx, cy] = reachQ.shift();
      const ci = cy * w + cx;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (reachSeen.has(ni) || (col.data[ni] ?? 0) > 0) continue;
        if (elevation[ci] !== elevation[ni] && transitions[ci] === 0 && transitions[ni] === 0) continue;
        reachSeen.add(ni);
        reachQ.push([nx, ny]);
      }
    }
    for (let i = 0; i < w * h; i += 1) {
      if ((col.data[i] ?? 0) === 0 && !reachSeen.has(i)) {
        col.data[i] = 1;
        elevation[i] = 0;
        transitions[i] = 0;
      }
    }
    for (const [label, tx, ty] of [
      ['be_na', 13, 31],
      ['bench', 21, 18],
      ['mushroom', 8, 25],
      ['upperClearing', 8, 12],
      ['northExit', 21, 1],
    ]) {
      if (!reachSeen.has(ty * w + tx)) {
        throw new Error(`forest.json elevation reachability failed for ${label}(${tx},${ty})`);
      }
    }

    forest.layers = forest.layers.filter(
      (l) => l.name !== 'Elevation' && l.name !== 'ElevationTransitions',
    );
    const colIdx = forest.layers.findIndex((l) => l.name === 'Collision');
    const elevLayers = [
      {
        id: 23,
        name: 'Elevation',
        type: 'tilelayer',
        width: w,
        height: h,
        x: 0,
        y: 0,
        visible: false,
        opacity: 1,
        data: elevation,
      },
      {
        id: 24,
        name: 'ElevationTransitions',
        type: 'tilelayer',
        width: w,
        height: h,
        x: 0,
        y: 0,
        visible: false,
        opacity: 1,
        data: transitions,
      },
    ];
    if (colIdx >= 0) forest.layers.splice(colIdx, 0, ...elevLayers);
    else forest.layers.push(...elevLayers);
  }
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
        y: 31 * TW,
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

function patchVillageForestPortal(village, _slice) {
  const donor = village.properties?.find((p) => p.name === 'olwDonor')?.value;
  if (donor !== 'cabacos') return village;
  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return village;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-forest');
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