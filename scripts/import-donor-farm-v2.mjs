/**
 * Reconstructs public/assets/maps/farm.json (64×44 @ 16×16 native pixel density) using
 * Cabacos/Sunnyside 16×16 tiles + Hollowmere farmhouse/greenhouse/windmill/shipping_bin props,
 * while preserving 100% of the 184 plot IDs (0..183) aligned with TILE_SIZE = 16.
 */
import fs from 'node:fs';
import path from 'node:path';
import { validateFarmPlotContract } from './lib/preserveFarmPlotContract.mjs';
import { RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const OUT = path.resolve('public/assets/maps/farm.json');
const VILLAGE_JSON = path.resolve('public/assets/maps/village.json');
const CONTRACT_PATH = path.resolve('src/shared/world/farmPlotContract.v1.json');
const OLW_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';

const TW = 16;
const W = 64;
const H = 44;
const SPAWN_X = 29;
const SPAWN_Y = 22;

const MAIN_REGION = { id: 'farm_main', labelVi: 'Ruộng chính', originTileX: 16, originTileY: 10, columns: 12, rows: 10 };
const ANNEX_REGION = { id: 'farm_annex', labelVi: 'Ruộng phụ', originTileX: 40, originTileY: 28, columns: 8, rows: 8 };

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

const GRASS_TILES = [66, 66, 130, 194, 195, 131, 66, 132, 258];

function idx(x, y) {
  return y * W + x;
}

function setTile(arr, x, y, gid) {
  if (x >= 0 && y >= 0 && x < W && y < H) arr[idx(x, y)] = gid;
}

function fillRect(arr, x0, y0, w, h, gidOrFn) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      setTile(arr, x, y, typeof gidOrFn === 'function' ? gidOrFn(x, y) : gidOrFn);
    }
  }
}

function stampTree(building, above, col, cx, baseY, variant = 0) {
  if (variant % 3 === 1) {
    // 2x2 golden fruit tree
    setTile(above, cx, baseY - 1, 370);
    setTile(above, cx + 1, baseY - 1, 371);
    setTile(building, cx, baseY, 434);
    setTile(building, cx + 1, baseY, 435);
    setTile(col, cx, baseY, 1);
    setTile(col, cx + 1, baseY, 1);
    return;
  }
  if (variant % 3 === 2) {
    // 2x2 berry tree
    setTile(above, cx, baseY - 1, 242);
    setTile(above, cx + 1, baseY - 1, 243);
    setTile(building, cx, baseY, 306);
    setTile(building, cx + 1, baseY, 307);
    setTile(col, cx, baseY, 1);
    setTile(col, cx + 1, baseY, 1);
    return;
  }
  // 2x3 cozy evergreen pine
  setTile(above, cx, baseY - 2, 436);
  setTile(above, cx + 1, baseY - 2, 437);
  setTile(above, cx, baseY - 1, 500);
  setTile(above, cx + 1, baseY - 1, 501);
  setTile(building, cx, baseY, 564);
  setTile(building, cx + 1, baseY, 565);
  setTile(col, cx, baseY, 1);
  setTile(col, cx + 1, baseY, 1);
}

function updateContractJson() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const anchors = [];
  for (const reg of [MAIN_REGION, ANNEX_REGION]) {
    const count = reg.columns * reg.rows;
    for (let i = 0; i < count; i += 1) {
      anchors.push({
        anchorId: `${reg.id}_${i}`,
        regionId: reg.id,
        tileX: reg.originTileX + (i % reg.columns),
        tileY: reg.originTileY + Math.floor(i / reg.columns),
      });
    }
  }
  contract.contractVersion = '1.0.2';
  contract.mapSizeTiles = { width: W, height: H };
  contract.defaultSpawnTile = { tileX: SPAWN_X, tileY: SPAWN_Y };
  contract.plotRegions = [MAIN_REGION, ANNEX_REGION];
  contract.plotAnchors = anchors;
  contract.worldInteractables = {
    shipping_bin: {
      id: 'farm_shipping_bin',
      anchorId: 'farm_shipping_bin',
      kind: 'shipping_bin',
      tileX: 13,
      tileY: 5,
      labelVi: 'Thùng gom hàng — bán qua đêm (V0.2)',
    },
    pond_water: {
      id: 'farm_pond_water',
      anchorId: 'farm_pond_water',
      kind: 'water_source',
      tileX: 32,
      tileY: 8,
      labelVi: 'Ao nước — múc nước tưới',
    },
    barn_mill: {
      id: 'farm_barn_mill',
      anchorId: 'farm_barn_mill',
      kind: 'workshop_building',
      tileX: 18,
      tileY: 22,
      labelVi: 'Xưởng ruộng — cối Meadowbrook',
    },
    barn_door: {
      id: 'farm_barn_door',
      anchorId: 'farm_barn_door',
      kind: 'door',
      tileX: 19,
      tileY: 22,
      labelVi: 'Vào cửa hàng Bác Hai',
    },
  };
  fs.writeFileSync(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`);
}

function buildFarmMap() {
  const land = new Array(W * H).fill(0);
  const paths = new Array(W * H).fill(0);
  const water = new Array(W * H).fill(0);
  const soil = new Array(W * H).fill(0);
  const decoration01 = new Array(W * H).fill(0);
  const building = new Array(W * H).fill(0);
  const abovePlayer = new Array(W * H).fill(0);
  const collision = new Array(W * H).fill(0);

  // 1. Lush sunlit meadow grass base + perimeter trees/hedges
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      land[idx(x, y)] = GRASS_TILES[(x * 7 + y * 11) % GRASS_TILES.length];
      if (x <= 1 || x >= W - 2 || y <= 0 || y >= H - 2) {
        collision[idx(x, y)] = 1;
      }
    }
  }

  // 2. Main farm stone/earth crossroads & connecting lanes
  // Vertical lane from Garden north gate (29, 0..24)
  fillRect(paths, 28, 0, 3, 25, (x, y) => ((x + y) % 2 === 0 ? 459 : 460));
  // Horizontal east-west promenade (y = 21..23, x = 8..63) to Village
  fillRect(paths, 8, 21, 56, 3, (x, y) => ((x + y) % 3 === 0 ? 522 : 459));
  // North courtyard road connecting Farmhouse (8,9), Shipping Bin (13,5), and Pond (30,5)
  fillRect(paths, 8, 5, 22, 2, 459);
  fillRect(paths, 12, 5, 3, 17, 460);
  // Path to Koi pond (52, 11) and annex field (40..47, 28..35)
  fillRect(paths, 38, 12, 2, 26, 460);
  fillRect(paths, 38, 12, 14, 2, 459);
  fillRect(paths, 38, 36, 12, 2, 459);

  // 3. Water Ponds with clean Cabacos pond bank (grass rim on outer cells, turquoise water inside)
  const makePond = (x0, y0, pw, ph) => {
    for (let y = y0 + 1; y < y0 + ph - 1; y += 1) {
      for (let x = x0 + 1; x < x0 + pw - 1; x += 1) {
        setTile(water, x, y, WATER_BLOCK[y % 4][x % 4]);
        collision[idx(x, y)] = 1;
      }
    }
    for (let x = x0 + 1; x < x0 + pw - 1; x += 1) {
      setTile(decoration01, x, y0, 474);
      setTile(decoration01, x, y0 + ph - 1, 539);
    }
    for (let y = y0 + 1; y < y0 + ph - 1; y += 1) {
      setTile(decoration01, x0, y, 476);
      setTile(decoration01, x0 + pw - 1, y, 0x80000000 | 476);
    }
  };
  makePond(30, 4, 6, 5);
  makePond(49, 7, 6, 5);
  // Ensure interactable tile for water source (32,8) & fishing (52,11) sit cleanly beside pond shoreline!
  collision[idx(32, 8)] = 0;
  collision[idx(32, 9)] = 0;
  collision[idx(52, 11)] = 0;
  collision[idx(52, 12)] = 0;
  // Wooden fishing deck beside Koi pond
  setTile(building, 51, 11, 578);
  setTile(building, 52, 11, 587);
  setTile(building, 53, 11, 580);

  // 4. Soil Bed under ALL 184 Plots with cozy border rim (100% walkable!)
  fillRect(soil, MAIN_REGION.originTileX, MAIN_REGION.originTileY, MAIN_REGION.columns, MAIN_REGION.rows, 587);
  fillRect(soil, ANNEX_REGION.originTileX, ANNEX_REGION.originTileY, ANNEX_REGION.columns, ANNEX_REGION.rows, 587);
  // Subtle wood border beam along south edge of main & annex crop beds
  for (let x = MAIN_REGION.originTileX; x < MAIN_REGION.originTileX + MAIN_REGION.columns; x += 1) {
    setTile(paths, x, MAIN_REGION.originTileY - 1, 460);
  }
  for (let x = ANNEX_REGION.originTileX; x < ANNEX_REGION.originTileX + ANNEX_REGION.columns; x += 1) {
    setTile(paths, x, ANNEX_REGION.originTileY - 1, 460);
    setTile(decoration01, x, ANNEX_REGION.originTileY + ANNEX_REGION.rows, 169);
    collision[idx(x, ANNEX_REGION.originTileY + ANNEX_REGION.rows)] = 1;
  }
  // Ensure every single contract tile is walkable
  for (const reg of [MAIN_REGION, ANNEX_REGION]) {
    fillRect(collision, reg.originTileX, reg.originTileY, reg.columns, reg.rows, 0);
  }

  // Rustic wooden fences framing main farm field (with wide north/south/east/west walk gates)
  for (let x = 15; x <= 28; x += 1) {
    if (x < 20 || x > 22) {
      setTile(decoration01, x, 9, 169);
      collision[idx(x, 9)] = 1;
      setTile(decoration01, x, 20, 169);
      collision[idx(x, 20)] = 1;
    }
  }

  // Reserve building footprints for Hollowmere props (rendered cleanly by tiledZoneAccents)
  // Farmhouse (x=6..10, y=5..8), Greenhouse (x=16..20, y=4..7), Barn/Windmill (x=17..20, y=20..21)
  fillRect(collision, 6, 5, 5, 4, 1);
  fillRect(collision, 16, 4, 5, 4, 1);
  fillRect(collision, 17, 20, 4, 2, 1);
  collision[idx(18, 22)] = 0;
  collision[idx(19, 22)] = 0;
  collision[idx(13, 5)] = 0;

  // 5. Lush Forest Rim + Orchard trees + flowers & farm crates
  let treeIdx = 0;
  for (let x = 4; x < W - 4; x += 4) {
    if (x >= 26 && x <= 32) continue; // Keep North garden gate open!
    stampTree(building, abovePlayer, collision, x, 3, treeIdx++);
    stampTree(building, abovePlayer, collision, x + 1, H - 3, treeIdx++);
  }
  for (let y = 6; y < H - 5; y += 4) {
    if (y >= 19 && y <= 24) continue; // Keep East village gate open!
    stampTree(building, abovePlayer, collision, 3, y, treeIdx++);
    stampTree(building, abovePlayer, collision, W - 4, y, treeIdx++);
  }

  // Open North portal (29, 1) and East portal (62, 22) lanes through the rim cleanly
  fillRect(collision, 28, 0, 3, 4, 0);
  fillRect(collision, W - 4, 21, 4, 3, 0);
  fillRect(paths, 60, 21, 4, 3, 459);

  // Orchard fruit trees & farmyard flowers & cozy stone/crate accents
  stampTree(building, abovePlayer, collision, 41, 17, 1);
  stampTree(building, abovePlayer, collision, 45, 17, 2);
  stampTree(building, abovePlayer, collision, 10, 31, 1);
  stampTree(building, abovePlayer, collision, 18, 33, 2);
  stampTree(building, abovePlayer, collision, 25, 34, 0);
  stampTree(building, abovePlayer, collision, 56, 31, 1);
  for (const [fx, fy, gid] of [
    [14, 12, 96],
    [14, 15, 224],
    [14, 18, 160],
    [37, 29, 96],
    [37, 32, 160],
    [49, 29, 224],
    [49, 33, 99],
    [14, 6, 613],
    [15, 6, 616],
    [38, 18, 224],
    [39, 18, 96],
    [13, 33, 160],
    [15, 34, 228],
    [54, 29, 288],
    [55, 30, 289],
  ]) {
    setTile(decoration01, fx, fy, gid);
  }

  const portals = {
    id: 3001,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 3101,
        name: 'farm-to-village',
        type: 'portal',
        x: 62 * TW,
        y: 22 * TW,
        width: TW * 2,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 4 },
          { name: 'spawnY', type: 'int', value: 29 },
          { name: 'labelVi', type: 'string', value: 'Về thị trấn Cabacos' },
        ],
      },
      {
        id: 3102,
        name: 'farm-to-garden',
        type: 'portal',
        x: 29 * TW,
        y: 1 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'spawnX', type: 'int', value: 3 },
          { name: 'spawnY', type: 'int', value: 11 },
          { name: 'labelVi', type: 'string', value: 'Về vườn nhà' },
        ],
      },
    ],
  };

  const interactables = {
    id: 3002,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 3201,
        name: 'farm_shipping_bin',
        type: 'interactable',
        x: 13 * TW,
        y: 5 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'shipping_bin' },
          { name: 'anchorId', type: 'string', value: 'farm_shipping_bin' },
          { name: 'labelVi', type: 'string', value: 'Thùng gom hàng — bán qua đêm (V0.2)' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
        ],
      },
      {
        id: 3202,
        name: 'farm_pond_water',
        type: 'interactable',
        x: 32 * TW,
        y: 8 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'water_source' },
          { name: 'anchorId', type: 'string', value: 'farm_pond_water' },
          { name: 'labelVi', type: 'string', value: 'Ao nước — múc nước tưới' },
          { name: 'maxRadiusPx', type: 'int', value: 52 },
        ],
      },
      {
        id: 3203,
        name: 'farm_barn_mill',
        type: 'interactable',
        x: 18 * TW,
        y: 22 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'workshop_building' },
          { name: 'anchorId', type: 'string', value: 'farm_barn_mill' },
          { name: 'labelVi', type: 'string', value: 'Xưởng ruộng — cối Meadowbrook' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'workshopFocus', type: 'string', value: 'mill' },
        ],
      },
      {
        id: 3204,
        name: 'farm_barn_door',
        type: 'interactable',
        x: 19 * TW,
        y: 22 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'door' },
          { name: 'anchorId', type: 'string', value: 'farm_barn_door' },
          { name: 'labelVi', type: 'string', value: 'Vào cửa hàng Bác Hai' },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
        ],
      },
      {
        id: 3205,
        name: 'farm_pond_bench',
        type: 'interactable',
        x: 35 * TW,
        y: 11 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Ghế gỗ bên hồ cá' },
          { name: 'maxRadiusPx', type: 'int', value: 46 },
        ],
      },
    ],
  };

  const npcs = {
    id: 3003,
    name: 'NPCSpawns',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 3301,
        name: 'bac_hai',
        type: 'npc',
        x: 10 * TW,
        y: 10 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'farmer_guide' },
          { name: 'labelVi', type: 'string', value: 'Bác Hai' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Chào hai cháu! Chọn cuốc (phím 1) rồi bấm J để cuốc đất, gieo hạt, tưới nước và gửi nông sản vào thùng gom nhé.',
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
      makeLayer(1, 'land', land, -5),
      makeLayer(2, 'water', water, -4),
      makeLayer(3, 'paths', paths, -3),
      makeLayer(4, 'soil', soil, -2),
      makeLayer(5, 'decoration_01', decoration01, 1),
      makeLayer(6, 'building', building, 2),
      makeLayer(7, 'Above Player', abovePlayer, 4500),
      makeLayer(8, 'Collision', collision, 0, false),
      portals,
      interactables,
      npcs,
    ],
    nextlayerid: 3010,
    nextobjectid: 3400,
    properties: [
      { name: 'mapId', type: 'string', value: 'farm' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorSha', type: 'string', value: OLW_SHA },
      { name: 'olwDonorSketch', type: 'string', value: 'farm-v2-deep' },
      { name: 'olwDonorSource', type: 'string', value: 'Cabacos ts_map + Hollowmere farm props' },
      { name: 'olwFarmNativeSoil', type: 'bool', value: true },
      { name: 'olwTilePixelSize', type: 'int', value: TW },
      { name: 'olwDefaultSpawnTileX', type: 'int', value: SPAWN_X },
      { name: 'olwDefaultSpawnTileY', type: 'int', value: SPAWN_Y },
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
      { name: 'olwHollowmereProps', type: 'string', value: 'farmhouse,greenhouse,windmill,shipping_bin,scarecrow,wishing_well,hay_bale' },
    ],
  };
}

function patchVillageFarmPortal() {
  if (!fs.existsSync(VILLAGE_JSON)) return;
  const village = JSON.parse(fs.readFileSync(VILLAGE_JSON, 'utf8'));
  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-farm');
  portalsLayer.objects.push({
    id: 9103,
    name: 'village-to-farm',
    type: 'portal',
    x: 1 * TW,
    y: 29 * TW,
    width: TW,
    height: TW * 2,
    properties: [
      { name: 'targetMapId', type: 'string', value: 'farm' },
      { name: 'labelVi', type: 'string', value: 'Ra Nông trại' },
      { name: 'spawnX', type: 'int', value: 59 },
      { name: 'spawnY', type: 'int', value: 22 },
    ],
  });
  fs.writeFileSync(VILLAGE_JSON, JSON.stringify(village, null, 2));
}

function main() {
  updateContractJson();
  const map = buildFarmMap();
  const check = validateFarmPlotContract(map);
  if (!check.ok) {
    console.error('Farm contract validation failed:', check.errors);
    process.exit(1);
  }
  fs.writeFileSync(OUT, `${JSON.stringify(map, null, 2)}\n`);
  patchVillageFarmPortal();
  console.log(`Wrote unified 16px farm.json (${W}×${H} @ ${TW}px) plots=${check.plotCount} walkable=${check.walkable}`);
}

main();
