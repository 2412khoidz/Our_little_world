/**
 * Reconstructs public/assets/maps/beach.json (56×36 @ 16×16 native) as an independent Gull Bay
 * coastal paradise using Cabacos/Sunnyside 16×16 tileset (MIT) + Hollowmere coastal landmarks (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const OUT = path.resolve('src/assets/maps/beach.json');
const VILLAGE_JSON = path.resolve('src/assets/maps/village.json');
const OLW_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';
const TW = 16;
const W = 56;
const H = 36;

const SPAWN_X = 3;
const SPAWN_Y = 16;

const CABACOS_TILESETS = [
  {
    columns: 64,
    firstgid: 1,
    image: '/maps/donor/cabacos/ts_map.png',
    imageheight: 1024,
    imagewidth: 1024,
    margin: 0,
    name: 'ts_map',
    spacing: 0,
    tilecount: 4096,
    tileheight: 16,
    tilewidth: 16,
  },
];

const WATER_BLOCK = [
  [1164, 1165, 1166, 1167],
  [1228, 1229, 1230, 1231],
  [1292, 1293, 1294, 1295],
  [1356, 1357, 1358, 1359],
];

const GRASS_TILES = [66, 66, 130, 194, 195, 131, 66, 132];
const SAND_TILES = [70, 70, 70, 72, 70, 70, 73, 74, 70];

function coastLineX(y) {
  if (y < 4) return 20;
  if (y < 10) return 22 + Math.floor((y - 4) * 1.2);
  if (y <= 18) return 28;
  if (y <= 26) return 27 - Math.floor((y - 18) * 0.4);
  if (y <= 31) return 24 + Math.floor((y - 26) * 0.6);
  return 22;
}

function grassSandEdgeX(y) {
  if (y < 6) return 11;
  if (y < 14) return 10;
  if (y < 20) return 9;
  if (y < 28) return 10;
  return 11;
}

function idx(x, y) {
  return y * W + x;
}

function setTile(layer, x, y, gid) {
  if (x >= 0 && y >= 0 && x < W && y < H) {
    layer[idx(x, y)] = gid;
  }
}

function stampTree(building, above, col, cx, baseY) {
  // Clean 100%-transparent Cabacos ts_map pine tree (2×3): [436,437] / [500,501] / [564,565]
  setTile(above, cx, baseY - 2, 436);
  setTile(above, cx + 1, baseY - 2, 437);
  setTile(above, cx, baseY - 1, 500);
  setTile(above, cx + 1, baseY - 1, 501);
  setTile(building, cx, baseY, 564);
  setTile(building, cx + 1, baseY, 565);
  setTile(col, cx, baseY, 1);
  setTile(col, cx + 1, baseY, 1);
}

function buildBeachMap() {
  const sea = new Array(W * H).fill(0);
  const land = new Array(W * H).fill(0);
  const paths = new Array(W * H).fill(0);
  const decoration01 = new Array(W * H).fill(0);
  const building = new Array(W * H).fill(0);
  const abovePlayer = new Array(W * H).fill(0);
  const collision = new Array(W * H).fill(0);

  // 1. Base ocean water + smooth grass-to-sand + smooth sand-to-water shoreline
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      sea[idx(x, y)] = WATER_BLOCK[y % 4][x % 4];
      const cx = coastLineX(y);
      const prevCx = y > 0 ? coastLineX(y - 1) : cx;
      const gx = grassSandEdgeX(y);

      if (x <= gx) {
        land[idx(x, y)] = GRASS_TILES[(x * 7 + y * 13) % GRASS_TILES.length];
      } else if (x === gx + 1) {
        land[idx(x, y)] = 70;
        if (y < 15 || y > 17) {
          decoration01[idx(x, y)] = 260;
        }
      } else if (x < cx) {
        land[idx(x, y)] = SAND_TILES[(x * 5 + y * 11) % SAND_TILES.length];
      } else if (x === cx) {
        if (prevCx < cx) land[idx(x, y)] = 0x40000000 | 340;
        else if (prevCx > cx) land[idx(x, y)] = 340;
        else land[idx(x, y)] = 0x80000000 | 212;
      }

      // Strictly block ocean beyond coastline (x >= cx) & northern/southern perimeter cliff
      if (x >= cx || y === 0 || y >= H - 2 || x === W - 1) {
        collision[idx(x, y)] = 1;
      }
    }
  }

  // 2. West gateway coastal harbor wooden pier over sea inlet (0..8, y=15..17) matching Cabacos east pier!
  for (let x = 0; x <= 8; x += 1) {
    for (let y = 13; y <= 19; y += 1) {
      // Clear grass/sand on inlet channel so pier spans sparkling coastal water just like Cabacos east exit
      land[idx(x, y)] = 0;
      decoration01[idx(x, y)] = 0;
      collision[idx(x, y)] = 1;
    }
    setTile(paths, x, 15, 295);
    setTile(paths, x, 16, 359);
    setTile(paths, x, 17, 423);
    collision[idx(x, 15)] = 0;
    collision[idx(x, 16)] = 0;
    collision[idx(x, 17)] = 0;
    if (x % 2 === 1) {
      setTile(decoration01, x, 18, 102);
      setTile(decoration01, x, 19, 166);
    }
  }
  for (let x = 9; x <= 14; x += 1) {
    setTile(paths, x, 15, 459);
    setTile(paths, x, 16, 460);
    setTile(paths, x, 17, 460);
    collision[idx(x, 15)] = 0;
    collision[idx(x, 16)] = 0;
    collision[idx(x, 17)] = 0;
  }
  for (let x = 15; x <= 25; x += 1) {
    setTile(paths, x, 15, 483);
    setTile(paths, x, 16, 483);
    setTile(paths, x, 17, 483);
  }

  // Main Wooden Fishing Pier extending out over turquoise deep sea (x = 26..36, y = 15..17)
  for (let x = 26; x <= 36; x += 1) {
    setTile(building, x, 15, x === 36 ? 582 : 578);
    setTile(building, x, 16, 587);
    setTile(building, x, 17, x === 36 ? 582 : 580);
    collision[idx(x, 15)] = 0;
    collision[idx(x, 16)] = 0;
    collision[idx(x, 17)] = 0;
    if (x % 3 === 0) {
      setTile(decoration01, x, 18, 102);
      setTile(decoration01, x, 19, 166);
    }
  }

  // Secondary Southern Cove Wooden Dock (x = 22..27, y = 29..30)
  for (let x = 22; x <= 27; x += 1) {
    setTile(building, x, 29, x === 27 ? 582 : 578);
    setTile(building, x, 30, x === 27 ? 582 : 580);
    collision[idx(x, 29)] = 0;
    collision[idx(x, 30)] = 0;
    if (x % 2 === 0) {
      setTile(decoration01, x, 31, 166);
    }
  }

  // 3. Coastal trees along grassy cliff border (North-West & South-West framing, keeping portal lane wide open!)
  for (const [tx, ty] of [
    [3, 5],
    [7, 5],
    [4, 9],
    [8, 8],
    [3, 24],
    [7, 26],
    [4, 30],
    [8, 31],
  ]) {
    stampTree(building, abovePlayer, collision, tx, ty);
  }

  // Flowers on grass meadow + shells, starfish & cute beach crabs on sand
  const flowers = [
    [3, 13, 96],
    [6, 14, 224],
    [8, 19, 160],
    [5, 20, 228],
    [7, 22, 99],
  ];
  for (const [x, y, gid] of flowers) {
    setTile(decoration01, x, y, gid);
  }

  const shoreDecor = [
    [13, 7, 1276],
    [18, 9, 1275],
    [22, 13, 1273],
    [25, 20, 1277],
    [19, 25, 1274],
    [23, 23, 1278],
    [14, 27, 1275],
    [20, 19, 1273],
    [16, 13, 288],
    [24, 26, 289],
  ];
  for (const [x, y, gid] of shoreDecor) {
    setTile(decoration01, x, y, gid);
  }

  // Reserve Hollowmere Seaside Cafe footprint (centered at tx=14, ty=11, ~5x3 tiles walkable front at y=12)
  for (let y = 8; y <= 10; y += 1) {
    for (let x = 12; x <= 16; x += 1) {
      collision[idx(x, y)] = 1;
    }
  }

  // Rustic beachfront rail beside promenade (leaves clear path to portal, cafe, bench, pier)
  for (let x = 2; x <= 8; x += 1) {
    setTile(decoration01, x, 12, 169);
    collision[idx(x, 12)] = 1;
  }

  const portals = {
    id: 2001,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 2101,
        name: 'beach-to-village',
        type: 'portal',
        x: 1 * TW,
        y: SPAWN_Y * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 80 },
          { name: 'spawnY', type: 'int', value: 32 },
          { name: 'labelVi', type: 'string', value: 'Về thị trấn Cabacos' },
        ],
      },
    ],
  };

  const interactables = {
    id: 2002,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 2201,
        name: 'beach_gull_bay_sign',
        type: 'interactable',
        x: 8 * TW,
        y: 14 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Biển Vịnh Hải Âu — bờ cát & cầu câu' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
        ],
      },
      {
        id: 2202,
        name: 'beach_pier_fishing',
        type: 'interactable',
        x: 34 * TW,
        y: 16 * TW,
        width: TW * 2,
        height: TW * 2,
        properties: [
          { name: 'kind', type: 'string', value: 'fishing_spot' },
          { name: 'labelVi', type: 'string', value: 'Cầu câu Vịnh Hải Âu' },
          { name: 'maxRadiusPx', type: 'int', value: 56 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'fishingSpotId', type: 'string', value: 'gull_bay' },
        ],
      },
      {
        id: 2203,
        name: 'beach_lifebuoy_post',
        type: 'interactable',
        x: 33 * TW,
        y: 17 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Phao bến cảng — ngắm thuyền nhấp nhô' },
          { name: 'maxRadiusPx', type: 'int', value: 46 },
        ],
      },
      {
        id: 2204,
        name: 'beach_sunset_bench',
        type: 'interactable',
        x: 21 * TW,
        y: 16 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Ghế ngắm biển hoàng hôn cùng nhau' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
        ],
      },
      {
        id: 2205,
        name: 'beach_cove_fishing',
        type: 'interactable',
        x: 25 * TW,
        y: 29 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'fishing_spot' },
          { name: 'labelVi', type: 'string', value: 'Góc vịnh yên tĩnh — câu cá biển' },
          { name: 'maxRadiusPx', type: 'int', value: 52 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'fishingSpotId', type: 'string', value: 'gull_bay' },
        ],
      },
    ],
  };

  const npcs = {
    id: 2003,
    name: 'NPCSpawns',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 2301,
        name: 'ong_minh',
        type: 'npc',
        x: 28 * TW,
        y: 16 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'fisherman' },
          { name: 'labelVi', type: 'string', value: 'Ông Minh' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Chào hai cháu ra Vịnh Hải Âu! Ngoài cuối cầu gỗ hôm nay cá biển cắn câu rất đều tay đấy.',
          },
        ],
      },
    ],
  };

  const makeLayer = (id, name, data, olwDepth, visible = true) => ({
    id,
    name,
    type: 'tilelayer',
    width: W,
    height: H,
    x: 0,
    y: 0,
    visible,
    opacity: 1,
    data,
    properties: [{ name: 'olwDepth', type: 'int', value: olwDepth }],
  });

  return {
    compressionlevel: -1,
    width: W,
    height: H,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tilewidth: TW,
    tileheight: TW,
    type: 'map',
    version: '1.10',
    tilesets: CABACOS_TILESETS,
    layers: [
      makeLayer(1, 'sea', sea, -10),
      makeLayer(2, 'land', land, -5),
      makeLayer(3, 'paths', paths, -3),
      makeLayer(4, 'decoration_01', decoration01, 1),
      makeLayer(5, 'building', building, 2),
      makeLayer(6, 'Above Player', abovePlayer, 4500),
      makeLayer(7, 'Collision', collision, 0, false),
      portals,
      interactables,
      npcs,
    ],
    nextlayerid: 2010,
    nextobjectid: 2400,
    properties: [
      { name: 'mapId', type: 'string', value: 'beach' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorMap', type: 'string', value: 'gull_bay_independent_coast_v2' },
      { name: 'olwDonorSha', type: 'string', value: OLW_SHA },
      { name: 'olwCoastPolish', type: 'string', value: 'gull-bay-coastal-v2' },
      { name: 'olwHarvestDuoRef', type: 'string', value: 'beach-layout-reference.v1' },
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
      { name: 'olwHollowmereProps', type: 'string', value: 'ferry,cafe,palm,crab_pot,wooden_bench' },
    ],
  };
}

function patchVillageBeachPortal() {
  if (!fs.existsSync(VILLAGE_JSON)) return;
  const village = JSON.parse(fs.readFileSync(VILLAGE_JSON, 'utf8'));
  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-beach');
  portalsLayer.objects.push({
    id: 9105,
    name: 'village-to-beach',
    type: 'portal',
    x: 83 * TW,
    y: 32 * TW,
    width: TW * 2,
    height: TW * 2,
    properties: [
      { name: 'targetMapId', type: 'string', value: 'beach' },
      { name: 'labelVi', type: 'string', value: 'Ra Bãi biển Vịnh Hải Âu' },
      { name: 'spawnX', type: 'int', value: SPAWN_X },
      { name: 'spawnY', type: 'int', value: SPAWN_Y },
    ],
  });
  fs.writeFileSync(VILLAGE_JSON, JSON.stringify(village, null, 2));
}

function main() {
  const map = buildBeachMap();
  fs.writeFileSync(OUT, `${JSON.stringify(map, null, 2)}\n`);
  patchVillageBeachPortal();
  console.log(`Wrote independent beach.json (${W}×${H} @ ${TW}px)`);
}

main();
