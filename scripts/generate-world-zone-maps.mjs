/**
 * Data-driven zone maps (Tiled JSON) — BrowserQuest/Kaetram-style layers.
 * Run: node scripts/generate-world-zone-maps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public/assets/maps');

/** @see scripts/generate-starter-assets.mjs — 16x16 cozy tileset */
const T = {
  g0: 17,
  g1: 18,
  g2: 19,
  g3: 20,
  g4: 21,
  /** Cobble from tileset (5,1)-(6,1); gid 22–23. Gid 24 is wood porch — never use for roads. */
  pathA: 22,
  pathB: 23,
  pathC: 23,
  woodPlank: 24,
  fenceH: 25,
  fenceP: 26,
  fenceV: 27,
  hedge: 28,
  flower: 28,
  roofL: 33,
  roofM: 34,
  roofR: 35,
  wallL: 36,
  door: 37,
  wallR: 38,
  treeTL: 39,
  treeTR: 40,
  treeBL: 41,
  treeBR: 42,
  soil: 53,
  soilWet: 54,
  sandA: 49,
  sandB: 50,
  waterDeep: 51,
  shoreGrass: 52,
  forestFloor: 55,
};

function makeTiledMap(mapId, width, height, layers, objectLayers = []) {
  return {
    compressionlevel: -1,
    height,
    width,
    infinite: false,
    layers: [...layers, ...objectLayers],
    nextlayerid: layers.length + objectLayers.length + 1,
    nextobjectid: 10,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: 16,
    tilewidth: 16,
    tilesets: [
      {
        columns: 16,
        firstgid: 1,
        image: '../starter/tileset-cozy.png',
        imageheight: 128,
        imagewidth: 256,
        margin: 0,
        name: 'tileset-cozy',
        spacing: 0,
        tilecount: 128,
        tileheight: 16,
        tilewidth: 16,
      },
    ],
    type: 'map',
    version: '1.10',
    properties: [{ name: 'mapId', type: 'string', value: mapId }],
  };
}

function empty(w, h) {
  return new Array(w * h).fill(0);
}

function idx(w, x, y) {
  return y * w + x;
}

function fillGrass(layer, w, h) {
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const v = (x * 7 + y * 13) % 11 === 0 ? T.g4 : (x + y) % 5 === 0 ? T.g2 : T.g0 + ((x + y) % 3);
      layer[idx(w, x, y)] = v;
    }
  }
}

/** Checker soil + shore ring (autotile-lite) for Composer 1 plot rects. */
function paintFarmSoilField(ground, w, originX, originY, cols, rows) {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = originX + col;
      const y = originY + row;
      const edge =
        row === 0 ||
        row === rows - 1 ||
        col === 0 ||
        col === cols - 1;
      if (edge) {
        ground[idx(w, x, y)] = T.shoreGrass;
      } else {
        ground[idx(w, x, y)] = (col + row) % 2 === 0 ? T.soil : T.soilWet;
      }
    }
  }
}

function paintSandGrassBlend(ground, w, y, x0, x1) {
  for (let x = x0; x <= x1; x += 1) {
    ground[idx(w, x, y)] = x % 3 === 0 ? T.shoreGrass : (x + y) % 2 === 0 ? T.sandA : T.sandB;
  }
}

function carvePath(paths, w, x0, y0, x1, y1) {
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    paths[idx(w, x, y)] = (x + y) % 2 === 0 ? T.pathA : T.pathB;
    if (x < x1) x += 1;
    else if (x > x1) x -= 1;
    else if (y < y1) y += 1;
    else if (y > y1) y -= 1;
  }
  paths[idx(w, x1, y1)] = T.pathC;
}

/**
 * @param {'standard' | 'wide' | 'narrow' | 'porch'} style
 */
function stampVillageHouse(buildings, collision, paths, vegetation, w, hx, hy, style) {
  const doorCol = (() => {
    if (style === 'wide') return 2;
    if (style === 'narrow') return 0;
    return 1;
  })();
  const width = style === 'wide' ? 4 : style === 'narrow' ? 2 : 3;
  for (let dx = 0; dx < width; dx += 1) {
    const roof =
      dx === 0 ? T.roofL : dx === width - 1 ? T.roofR : style === 'wide' && dx === 3 ? T.roofR : T.roofM;
    buildings[idx(w, hx + dx, hy)] = roof;
    const wall =
      dx === doorCol
        ? T.door
        : dx === 0
          ? T.wallL
          : dx === width - 1
            ? T.wallR
            : T.wallL;
    buildings[idx(w, hx + dx, hy + 1)] = wall;
    collision[idx(w, hx + dx, hy)] = 1;
    if (dx !== doorCol) collision[idx(w, hx + dx, hy + 1)] = 1;
  }
  if (style === 'porch') {
    for (let dx = 0; dx < width; dx += 1) {
      paths[idx(w, hx + dx, hy + 2)] = T.woodPlank;
      vegetation[idx(w, hx + dx, hy + 2)] = dx === 0 || dx === width - 1 ? T.flower : 0;
    }
  }
  if (style === 'wide') {
    vegetation[idx(w, hx, hy + 2)] = T.fenceP;
    vegetation[idx(w, hx + 3, hy + 2)] = T.fenceP;
  }
}

function tileLayer(name, id, data, w, h) {
  return {
    id,
    name,
    type: 'tilelayer',
    data,
    height: h,
    width: w,
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
  };
}

function buildVillageMap() {
  const w = 48;
  const h = 40;
  const ground = empty(w, h);
  const paths = empty(w, h);
  const water = empty(w, h);
  const buildings = empty(w, h);
  const vegetation = empty(w, h);
  const collision = empty(w, h);

  fillGrass(ground, w, h);

  // Quảng trường cobble (12,14)-(36,26)
  for (let y = 14; y <= 26; y += 1) {
    for (let x = 12; x <= 36; x += 1) {
      paths[idx(w, x, y)] = (x + y) % 2 === 0 ? T.pathA : T.pathB;
    }
  }

  // Đường chính Bắc–Nam
  for (let y = 8; y < h - 4; y += 1) {
    paths[idx(w, 24, y)] = y % 2 === 0 ? T.pathA : T.pathB;
    paths[idx(w, 25, y)] = y % 2 === 1 ? T.pathA : T.pathB;
  }
  // Đường Đông–Tây qua quảng trường
  for (let x = 4; x < w - 4; x += 1) {
    paths[idx(w, x, 20)] = x % 2 === 0 ? T.pathA : T.pathB;
    paths[idx(w, x, 21)] = x % 2 === 1 ? T.pathA : T.pathB;
  }

  // Hồ làng (phía tây) — water + bo shoreline
  for (let y = 27; y <= 35; y += 1) {
    for (let x = 5; x <= 15; x += 1) {
      const d2 = (x - 10) ** 2 + (y - 31) ** 2;
      if (d2 <= 16) {
        water[idx(w, x, y)] = T.waterDeep;
        collision[idx(w, x, y)] = 1;
      } else if (d2 <= 28) {
        ground[idx(w, x, y)] = T.shoreGrass;
        vegetation[idx(w, x, y)] = y === 28 || y === 34 ? T.flower : 0;
      }
    }
  }
  for (let x = 9; x <= 11; x += 1) {
    paths[idx(w, x, 31)] = T.pathA;
    water[idx(w, x, 31)] = 0;
    collision[idx(w, x, 31)] = 0;
  }

  // Dãy nhà phía bắc — kiến trúc khác nhau
  const northHouses = [
    { x: 14, y: 6, style: 'porch' },
    { x: 20, y: 6, style: 'narrow' },
    { x: 27, y: 6, style: 'standard' },
    { x: 33, y: 6, style: 'wide' },
  ];
  for (const house of northHouses) {
    stampVillageHouse(buildings, collision, paths, vegetation, w, house.x, house.y, house.style);
  }
  // Nhà phía tây / đông (ngoài quảng trường)
  stampVillageHouse(buildings, collision, paths, vegetation, w, 6, 18, 'porch');
  stampVillageHouse(buildings, collision, paths, vegetation, w, 42, 26, 'narrow');
  paths[idx(w, 8, 19)] = T.pathB;
  paths[idx(w, 41, 27)] = T.pathA;

  // Cửa hàng Bác Hai (đông)
  const sx = 36;
  const sy = 12;
  buildings[idx(w, sx, sy)] = T.roofL;
  buildings[idx(w, sx + 1, sy)] = T.roofM;
  buildings[idx(w, sx + 2, sy)] = T.roofR;
  buildings[idx(w, sx + 3, sy)] = T.roofR;
  buildings[idx(w, sx, sy + 1)] = T.wallL;
  buildings[idx(w, sx + 1, sy + 1)] = T.wallL;
  buildings[idx(w, sx + 2, sy + 1)] = T.door;
  buildings[idx(w, sx + 3, sy + 1)] = T.wallR;
  for (let dx = 0; dx < 4; dx += 1) {
    collision[idx(w, sx + dx, sy)] = 1;
    if (dx !== 2) collision[idx(w, sx + dx, sy + 1)] = 1;
  }

  // Cây quanh quảng trường
  const trees = [
    [10, 16],
    [38, 16],
    [10, 24],
    [38, 24],
    [16, 28],
    [34, 28],
  ];
  for (const [tx, ty] of trees) {
    vegetation[idx(w, tx, ty)] = T.treeTL;
    vegetation[idx(w, tx + 1, ty)] = T.treeTR;
    vegetation[idx(w, tx, ty + 1)] = T.treeBL;
    vegetation[idx(w, tx + 1, ty + 1)] = T.treeBR;
    collision[idx(w, tx, ty + 1)] = 1;
    collision[idx(w, tx + 1, ty + 1)] = 1;
  }

  // Hàng rào viền (trừ cổng nam & tây)
  for (let x = 0; x < w; x += 1) {
    vegetation[idx(w, x, 0)] = T.fenceH;
    vegetation[idx(w, x, h - 1)] = x >= 22 && x <= 26 ? 0 : T.fenceH;
    collision[idx(w, x, 0)] = 1;
    if (!(x >= 22 && x <= 26)) collision[idx(w, x, h - 1)] = 1;
  }
  for (let y = 0; y < h; y += 1) {
    vegetation[idx(w, 0, y)] = T.fenceV;
    vegetation[idx(w, w - 1, y)] = T.fenceV;
    collision[idx(w, 0, y)] = 1;
    collision[idx(w, w - 1, y)] = 1;
  }
  // Cổng tây → farm
  collision[idx(w, 0, 20)] = 0;
  collision[idx(w, 0, 21)] = 0;
  paths[idx(w, 1, 20)] = T.pathC;
  paths[idx(w, 1, 21)] = T.pathC;

  // Cổng đông → rừng
  vegetation[idx(w, w - 1, 20)] = 0;
  vegetation[idx(w, w - 1, 21)] = 0;
  collision[idx(w, w - 1, 20)] = 0;
  collision[idx(w, w - 1, 21)] = 0;
  paths[idx(w, w - 2, 20)] = T.pathC;
  paths[idx(w, w - 2, 21)] = T.pathC;

  // Cổng nam → garden
  paths[idx(w, 24, h - 2)] = T.pathC;
  paths[idx(w, 25, h - 2)] = T.pathC;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'village-to-garden',
        type: 'portal',
        x: 24 * 16,
        y: (h - 1) * 16,
        width: 32,
        height: 16,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'spawnX', type: 'int', value: 9 },
          { name: 'spawnY', type: 'int', value: 12 },
          { name: 'labelVi', type: 'string', value: 'Về khu vườn' },
        ],
      },
      {
        id: 2,
        name: 'village-to-farm',
        type: 'portal',
        x: 0,
        y: 20 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'farm' },
          { name: 'spawnX', type: 'int', value: 58 },
          { name: 'spawnY', type: 'int', value: 20 },
          { name: 'labelVi', type: 'string', value: 'Ra đồng ruộng' },
        ],
      },
      {
        id: 3,
        name: 'village-to-forest',
        type: 'portal',
        x: (w - 1) * 16,
        y: 20 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'forest' },
          { name: 'spawnX', type: 'int', value: 2 },
          { name: 'spawnY', type: 'int', value: 22 },
          { name: 'labelVi', type: 'string', value: 'Vào rừng' },
        ],
      },
      {
        id: 4,
        name: 'village-to-shop',
        type: 'portal',
        x: 38 * 16,
        y: 13 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'shop' },
          { name: 'spawnX', type: 'int', value: 5 },
          { name: 'spawnY', type: 'int', value: 7 },
          { name: 'labelVi', type: 'string', value: 'Vào cửa hàng Bác Hai' },
        ],
      },
    ],
  };

  const villageInteractables = {
    id: 12,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: northHouses.map((house, i) => ({
      id: 20 + i,
      name: `village_home_${i}`,
      type: 'interactable',
      x: (house.x + (house.style === 'narrow' ? 0 : 1)) * 16,
      y: (house.y + 1) * 16,
      width: 16,
      height: 16,
      properties: [
        { name: 'kind', type: 'string', value: 'door' },
        { name: 'labelVi', type: 'string', value: 'Nhà dân — vào bên trong (V0.3)' },
        { name: 'maxRadiusPx', type: 'int', value: 40 },
      ],
    })),
  };

  const npcs = {
    id: 11,
    name: 'NPCSpawns',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 3,
        name: 'bac_hai',
        type: 'npc',
        x: 35 * 16,
        y: 15 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'role', type: 'string', value: 'market_preview' },
          { name: 'dialogueVi', type: 'string', value: 'Cửa bên kia — bước vào là thấy quầy. V0.2 mới bán thật nhé.' },
          { name: 'labelVi', type: 'string', value: 'Bác Hai' },
        ],
      },
      {
        id: 4,
        name: 'co_lan',
        type: 'npc',
        x: 20 * 16,
        y: 22 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'role', type: 'string', value: 'idle' },
          { name: 'dialogueVi', type: 'string', value: 'Hôm nay trời đẹp quá — đi dạo quảng trường chút nhé.' },
          { name: 'labelVi', type: 'string', value: 'Cô Lan' },
        ],
      },
      {
        id: 5,
        name: 'ong_minh',
        type: 'npc',
        x: 30 * 16,
        y: 18 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'role', type: 'string', value: 'idle' },
          { name: 'dialogueVi', type: 'string', value: 'Đường tây ra đồng ruộng đó — nhớ gọi nhau khi đi xa.' },
          { name: 'labelVi', type: 'string', value: 'Ông Minh' },
        ],
      },
    ],
  };

  return makeTiledMap(
    'village',
    w,
    h,
    [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    [portals, npcs, villageInteractables],
  );
}

function buildFarmMap() {
  const w = 64;
  const h = 56;
  const ground = empty(w, h);
  const paths = empty(w, h);
  const water = empty(w, h);
  const buildings = empty(w, h);
  const vegetation = empty(w, h);
  const collision = empty(w, h);

  fillGrass(ground, w, h);

  // Chuồng / kho phía bắc
  for (let dx = 0; dx < 6; dx += 1) {
    buildings[idx(w, 5 + dx, 4)] = T.roofL;
    buildings[idx(w, 5 + dx, 5)] = dx === 2 ? T.door : T.wallL;
    collision[idx(w, 5 + dx, 4)] = 1;
    if (dx !== 2) collision[idx(w, 5 + dx, 5)] = 1;
  }
  paths[idx(w, 8, 6)] = T.pathA;
  paths[idx(w, 8, 7)] = T.pathB;
  collision[idx(w, 8, 6)] = 0;
  collision[idx(w, 8, 7)] = 0;

  // Ao nước (đông bắc)
  for (let y = 6; y <= 12; y += 1) {
    for (let x = 48; x <= 56; x += 1) {
      if ((x - 52) ** 2 + (y - 9) ** 2 <= 20) {
        water[idx(w, x, y)] = T.waterDeep;
        collision[idx(w, x, y)] = 1;
      } else if ((x - 52) ** 2 + (y - 9) ** 2 <= 30) {
        ground[idx(w, x, y)] = T.shoreGrass;
      }
    }
  }

  // Ruộng chính 12×10 + ruộng phụ 8×8 (contract: farm_main / farm_annex @ 40,28)
  paintFarmSoilField(ground, w, 16, 10, 12, 10);
  paintFarmSoilField(ground, w, 40, 28, 8, 8);

  // Hàng rào ruộng
  for (let col = 15; col <= 28; col += 1) {
    vegetation[idx(w, col, 9)] = T.fenceH;
    vegetation[idx(w, col, 20)] = col === 22 ? 0 : T.fenceH;
    collision[idx(w, col, 9)] = 1;
    if (col !== 22) collision[idx(w, col, 20)] = 1;
  }
  for (let row = 9; row <= 20; row += 1) {
    vegetation[idx(w, 15, row)] = T.fenceV;
    vegetation[idx(w, 28, row)] = T.fenceV;
    collision[idx(w, 15, row)] = 1;
    collision[idx(w, 28, row)] = 1;
  }
  collision[idx(w, 22, 20)] = 0;

  for (let col = 39; col <= 48; col += 1) {
    vegetation[idx(w, col, 27)] = T.fenceH;
    vegetation[idx(w, col, 36)] = col === 44 ? 0 : T.fenceH;
    collision[idx(w, col, 27)] = 1;
    if (col !== 44) collision[idx(w, col, 36)] = 1;
  }
  for (let row = 27; row <= 36; row += 1) {
    vegetation[idx(w, 39, row)] = T.fenceV;
    vegetation[idx(w, 48, row)] = T.fenceV;
    collision[idx(w, 39, row)] = 1;
    collision[idx(w, 48, row)] = 1;
  }
  collision[idx(w, 44, 36)] = 0;

  // Lối đi giữa ruộng
  for (let y = 10; y <= 19; y += 1) {
    paths[idx(w, 22, y)] = T.pathB;
  }
  for (let x = 16; x <= 27; x += 1) {
    paths[idx(w, x, 15)] = T.pathA;
  }
  for (let y = 28; y <= 35; y += 1) {
    paths[idx(w, 44, y)] = T.pathB;
  }

  // Chuồng & giếng
  buildings[idx(w, 8, 8)] = T.roofL;
  buildings[idx(w, 9, 8)] = T.roofM;
  buildings[idx(w, 10, 8)] = T.roofR;
  buildings[idx(w, 8, 9)] = T.wallL;
  buildings[idx(w, 9, 9)] = T.door;
  buildings[idx(w, 10, 9)] = T.wallR;
  for (let dx = 0; dx < 3; dx += 1) {
    collision[idx(w, 8 + dx, 8)] = 1;
    if (dx !== 1) collision[idx(w, 8 + dx, 9)] = 1;
  }
  for (let dy = 0; dy < 3; dy += 1) {
    for (let dx = 0; dx < 3; dx += 1) {
      water[idx(w, 4 + dx, 14 + dy)] = T.soilWet;
      collision[idx(w, 4 + dx, 14 + dy)] = 1;
    }
  }
  paths[idx(w, 5, 15)] = T.pathC;
  collision[idx(w, 5, 15)] = 0;

  // Cây rải rác phía bắc (không hàng hedge lặp — tránh artifact “hộp vàng”)
  const northTrees = [
    [8, 3],
    [22, 4],
    [40, 3],
    [52, 4],
  ];
  for (const [tx, ty] of northTrees) {
    vegetation[idx(w, tx, ty)] = T.treeTL;
    vegetation[idx(w, tx + 1, ty)] = T.treeTR;
    vegetation[idx(w, tx, ty + 1)] = T.treeBL;
    vegetation[idx(w, tx + 1, ty + 1)] = T.treeBR;
    collision[idx(w, tx, ty + 1)] = 1;
    collision[idx(w, tx + 1, ty + 1)] = 1;
  }

  // Khu chăn nuôi (tây nam) — hàng rào + cổng
  for (let y = 38; y <= 48; y += 1) {
    for (let x = 6; x <= 18; x += 1) {
      const edge = y === 38 || y === 48 || x === 6 || x === 18;
      if (!edge) continue;
      if (x === 12 && y === 48) continue;
      vegetation[idx(w, x, y)] = y === 38 || y === 48 ? T.fenceH : T.fenceV;
      collision[idx(w, x, y)] = 1;
    }
  }
  for (let x = 8; x <= 14; x += 2) {
    ground[idx(w, x, 42)] = T.soil;
  }
  paths[idx(w, 7, 7)] = T.pathB;
  paths[idx(w, 8, 7)] = T.pathA;
  vegetation[idx(w, 7, 6)] = T.fenceP;
  vegetation[idx(w, 8, 6)] = T.flower;

  // Đường đến làng (đông)
  for (let x = 50; x < w - 1; x += 1) {
    paths[idx(w, x, 20)] = T.pathA;
    paths[idx(w, x, 21)] = T.pathB;
  }
  vegetation[idx(w, w - 1, 20)] = 0;
  vegetation[idx(w, w - 1, 21)] = 0;
  collision[idx(w, w - 1, 20)] = 0;
  collision[idx(w, w - 1, 21)] = 0;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'farm-to-village',
        type: 'portal',
        x: (w - 1) * 16,
        y: 20 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 2 },
          { name: 'spawnY', type: 'int', value: 20 },
          { name: 'labelVi', type: 'string', value: 'Về làng' },
        ],
      },
    ],
  };

  const interactables = {
    id: 11,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 2,
        name: 'farm_shipping_bin',
        type: 'interactable',
        x: 7 * 16,
        y: 7 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'kind', type: 'string', value: 'shipping_bin' },
          { name: 'anchorId', type: 'string', value: 'farm_shipping_bin' },
          { name: 'labelVi', type: 'string', value: 'Thùng gom hàng — bán qua đêm (V0.2)' },
          { name: 'maxRadiusPx', type: 'int', value: 46 },
        ],
      },
      {
        id: 3,
        name: 'farm_pond_water',
        type: 'interactable',
        x: 52 * 16,
        y: 11 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'kind', type: 'string', value: 'water_source' },
          { name: 'anchorId', type: 'string', value: 'farm_pond_water' },
          { name: 'labelVi', type: 'string', value: 'Ao nước — múc nước tưới' },
          { name: 'maxRadiusPx', type: 'int', value: 54 },
        ],
      },
      {
        id: 4,
        name: 'farm_barn_door',
        type: 'interactable',
        x: 9 * 16,
        y: 9 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'kind', type: 'string', value: 'door' },
          { name: 'anchorId', type: 'string', value: 'farm_barn_door' },
          { name: 'labelVi', type: 'string', value: 'Cửa chuồng — chưa mở' },
          { name: 'maxRadiusPx', type: 'int', value: 40 },
        ],
      },
    ],
  };

  return makeTiledMap(
    'farm',
    w,
    h,
    [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    [portals, interactables],
  );
}

function buildForestMap() {
  const w = 52;
  const h = 48;
  const ground = empty(w, h);
  const paths = empty(w, h);
  const water = empty(w, h);
  const buildings = empty(w, h);
  const vegetation = empty(w, h);
  const collision = empty(w, h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      ground[idx(w, x, y)] = (x + y) % 3 === 0 ? T.forestFloor : T.g2;
    }
  }

  for (let y = 10; y < h - 8; y += 1) {
    paths[idx(w, 4, y)] = T.pathC;
    paths[idx(w, 5, y)] = T.pathB;
  }
  for (let x = 8; x < w - 6; x += 1) {
    paths[idx(w, x, 26)] = T.pathA;
    paths[idx(w, x, 27)] = T.pathB;
  }

  // Ngóc ngách: nhánh tới glade, góc phía bắc, điểm nhìn đông
  carvePath(paths, w, 5, 22, 18, 14);
  carvePath(paths, w, 18, 14, 28, 10);
  carvePath(paths, w, 28, 10, 38, 12);
  carvePath(paths, w, 5, 26, 22, 28);
  carvePath(paths, w, 22, 28, 35, 34);
  for (let y = 12; y <= 16; y += 1) {
    for (let x = 17; x <= 21; x += 1) {
      if ((x - 19) ** 2 + (y - 14) ** 2 <= 8) {
        ground[idx(w, x, y)] = T.g1;
        paths[idx(w, x, y)] = T.pathC;
      }
    }
  }
  vegetation[idx(w, 38, 11)] = T.flower;
  vegetation[idx(w, 39, 11)] = T.flower;
  paths[idx(w, 38, 12)] = T.woodPlank;

  // Secret grove (glade)
  for (let y = 30; y <= 38; y += 1) {
    for (let x = 30; x <= 40; x += 1) {
      if ((x - 35) ** 2 + (y - 34) ** 2 <= 30) {
        ground[idx(w, x, y)] = T.g1;
        paths[idx(w, x, y)] = T.pathA;
      }
    }
  }

  const scatterTrees = [
    [10, 8],
    [16, 12],
    [22, 6],
    [34, 10],
    [42, 16],
    [14, 32],
    [28, 18],
    [44, 36],
    [20, 40],
    [36, 42],
  ];
  for (const [tx, ty] of scatterTrees) {
    vegetation[idx(w, tx, ty)] = T.treeTL;
    vegetation[idx(w, tx + 1, ty)] = T.treeTR;
    vegetation[idx(w, tx, ty + 1)] = T.treeBL;
    vegetation[idx(w, tx + 1, ty + 1)] = T.treeBR;
    collision[idx(w, tx, ty + 1)] = 1;
    collision[idx(w, tx + 1, ty + 1)] = 1;
  }

  for (let x = 0; x < w; x += 1) {
    collision[idx(w, x, 0)] = 1;
    collision[idx(w, x, h - 1)] = 1;
  }
  for (let y = 0; y < h; y += 1) {
    collision[idx(w, 0, y)] = 1;
    collision[idx(w, w - 1, y)] = 1;
  }
  collision[idx(w, 0, 22)] = 0;
  collision[idx(w, 0, 23)] = 0;
  collision[idx(w, w - 1, 38)] = 0;
  collision[idx(w, w - 1, 39)] = 0;
  paths[idx(w, 1, 22)] = T.pathC;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'forest-to-village',
        type: 'portal',
        x: 0,
        y: 22 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 46 },
          { name: 'spawnY', type: 'int', value: 20 },
          { name: 'labelVi', type: 'string', value: 'Về làng' },
        ],
      },
      {
        id: 2,
        name: 'forest-to-beach',
        type: 'portal',
        x: (w - 1) * 16,
        y: 38 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'beach' },
          { name: 'spawnX', type: 'int', value: 2 },
          { name: 'spawnY', type: 'int', value: 22 },
          { name: 'labelVi', type: 'string', value: 'Ra bãi biển' },
        ],
      },
    ],
  };

  return makeTiledMap(
    'forest',
    w,
    h,
    [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    [portals],
  );
}

function buildBeachMap() {
  const w = 56;
  const h = 40;
  const ground = empty(w, h);
  const paths = empty(w, h);
  const water = empty(w, h);
  const buildings = empty(w, h);
  const vegetation = empty(w, h);
  const collision = empty(w, h);

  // Bắc: cồn cỏ; giữa: cát rộng; nam: bờ + nước (spawn y≈22 đứng trên cát)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (y >= 28) {
        ground[idx(w, x, y)] = T.sandB;
      } else if (y >= 26) {
        ground[idx(w, x, y)] = T.shoreGrass;
      } else if (y >= 11) {
        ground[idx(w, x, y)] = (x + y) % 2 === 0 ? T.sandA : T.sandB;
      } else if (y >= 9) {
        ground[idx(w, x, y)] = (x + y) % 3 === 0 ? T.shoreGrass : T.g2;
      } else {
        ground[idx(w, x, y)] = (x + y) % 3 === 0 ? T.forestFloor : T.g2;
      }
    }
  }
  paintSandGrassBlend(ground, w, 10, 4, w - 5);

  for (let y = 28; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      water[idx(w, x, y)] = T.waterDeep;
      collision[idx(w, x, y)] = 1;
    }
  }
  for (let y = 26; y <= 27; y += 1) {
    for (let x = 0; x < w; x += 1) {
      water[idx(w, x, y)] = 0;
      collision[idx(w, x, y)] = 0;
    }
  }
  // Cầu gỗ (gid 24) ra biển — không dùng cobble làng
  for (let x = 20; x < 36; x += 1) {
    paths[idx(w, x, 27)] = T.woodPlank;
    ground[idx(w, x, 27)] = 0;
    collision[idx(w, x, 27)] = 0;
  }
  for (let x = 22; x < 34; x += 1) {
    paths[idx(w, x, 26)] = T.sandA;
    ground[idx(w, x, 26)] = 0;
  }

  vegetation[idx(w, 8, 12)] = T.treeTL;
  vegetation[idx(w, 9, 12)] = T.treeTR;
  vegetation[idx(w, 8, 13)] = T.treeBL;
  vegetation[idx(w, 9, 13)] = T.treeBR;
  collision[idx(w, 8, 13)] = 1;
  collision[idx(w, 9, 13)] = 1;

  for (let x = 0; x < w; x += 1) {
    collision[idx(w, x, 0)] = 1;
    collision[idx(w, x, h - 1)] = 1;
  }
  for (let y = 0; y < h; y += 1) {
    collision[idx(w, 0, y)] = 1;
    if (y !== 18 && y !== 19) collision[idx(w, w - 1, y)] = 1;
  }
  collision[idx(w, 0, 18)] = 0;
  collision[idx(w, 0, 19)] = 0;
  paths[idx(w, 1, 18)] = T.pathA;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'beach-to-forest',
        type: 'portal',
        x: 0,
        y: 18 * 16,
        width: 16,
        height: 32,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'forest' },
          { name: 'spawnX', type: 'int', value: 50 },
          { name: 'spawnY', type: 'int', value: 38 },
          { name: 'labelVi', type: 'string', value: 'Vào rừng' },
        ],
      },
    ],
  };

  return makeTiledMap(
    'beach',
    w,
    h,
    [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    [portals],
  );
}

function buildShopInteriorMap() {
  const w = 12;
  const h = 9;
  const ground = empty(w, h);
  const paths = empty(w, h);
  const water = empty(w, h);
  const buildings = empty(w, h);
  const vegetation = empty(w, h);
  const collision = empty(w, h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const wood = (x + y) % 2 === 0 ? T.woodPlank : T.pathB;
      ground[idx(w, x, y)] = y >= 2 ? wood : 0;
    }
  }
  for (let x = 1; x < w - 1; x += 1) {
    paths[idx(w, x, 3)] = T.pathA;
    paths[idx(w, x, 4)] = T.pathB;
    paths[idx(w, x, h - 2)] = T.pathA;
    ground[idx(w, x, h - 2)] = 0;
  }
  for (let x = 2; x < w - 5; x += 1) {
    buildings[idx(w, x, 1)] = T.wallL;
    vegetation[idx(w, x, 6)] = T.fenceH;
    collision[idx(w, x, 1)] = 1;
  }
  for (let x = 2; x < w - 2; x += 1) {
    buildings[idx(w, x, 0)] = T.roofM;
    collision[idx(w, x, 0)] = 1;
  }
  buildings[idx(w, 2, 2)] = T.wallL;
  buildings[idx(w, 3, 2)] = T.wallL;
  buildings[idx(w, 4, 2)] = T.door;
  buildings[idx(w, 7, 2)] = T.wallL;
  buildings[idx(w, 8, 2)] = T.wallR;
  vegetation[idx(w, 9, 3)] = T.flower;
  vegetation[idx(w, 10, 3)] = T.flower;
  collision[idx(w, 2, 2)] = 1;
  collision[idx(w, 3, 2)] = 1;
  collision[idx(w, 7, 2)] = 1;
  collision[idx(w, 8, 2)] = 1;

  const portals = {
    id: 10,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 1,
        name: 'shop-to-village',
        type: 'portal',
        x: 4 * 16,
        y: 2 * 16,
        width: 16,
        height: 16,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 37 },
          { name: 'spawnY', type: 'int', value: 15 },
          { name: 'labelVi', type: 'string', value: 'Ra ngoài' },
        ],
      },
    ],
  };

  return makeTiledMap(
    'shop',
    w,
    h,
    [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    [portals],
  );
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'village.json'), JSON.stringify(buildVillageMap(), null, 2));
fs.writeFileSync(path.join(OUT, 'farm.json'), JSON.stringify(buildFarmMap(), null, 2));
fs.writeFileSync(path.join(OUT, 'forest.json'), JSON.stringify(buildForestMap(), null, 2));
fs.writeFileSync(path.join(OUT, 'beach.json'), JSON.stringify(buildBeachMap(), null, 2));
fs.writeFileSync(path.join(OUT, 'shop.json'), JSON.stringify(buildShopInteriorMap(), null, 2));
console.log('Wrote village, farm, forest, beach, shop Tiled JSON maps');