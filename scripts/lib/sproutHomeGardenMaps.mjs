/**
 * Compose OLW home/garden Tiled JSON from vendored Sprout Lands (+ Farmland interior ref).
 * Gameplay footprint unchanged: home 16×12, garden 18×14; portals + decorate policy preserved.
 */
import fs from 'node:fs';
import path from 'node:path';

const TW = 16;
const DONOR_ROOT = 'public/maps/donor/sprout-lands';

/** @typedef {{ name: string, rel: string, firstgid: number, columns: number, rows: number, tilecount: number, image: string, tilewidth: number, tileheight: number, imagewidth: number, imageheight: number }} OlwTileset */

function readPngSize(repoRoot, rel) {
  const buf = fs.readFileSync(path.join(repoRoot, rel));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** @returns {OlwTileset[]} */
export function buildSproutTilesets(repoRoot) {
  const defs = [
    { name: 'sprout_grass', rel: `${DONOR_ROOT}/tilesets/grass.png` },
    { name: 'sprout_tilled', rel: `${DONOR_ROOT}/tilesets/tilled_dirt.png` },
    { name: 'sprout_water', rel: `${DONOR_ROOT}/tilesets/water.png` },
    { name: 'sprout_fences', rel: `${DONOR_ROOT}/tilesets/fences.png` },
    { name: 'sprout_wooden_house', rel: `${DONOR_ROOT}/tilesets/wooden_house.png` },
    { name: 'sprout_hills', rel: `${DONOR_ROOT}/tilesets/hills.png` },
    { name: 'sprout_paths', rel: `${DONOR_ROOT}/objects/paths.png` },
    { name: 'sprout_furniture', rel: `${DONOR_ROOT}/objects/basic_furniture.png` },
    { name: 'sprout_plants', rel: `${DONOR_ROOT}/objects/basic_plants.png` },
    { name: 'sprout_grass_things', rel: `${DONOR_ROOT}/objects/basic_grass_biom_things_1.png` },
    { name: 'sprout_bridge', rel: `${DONOR_ROOT}/objects/wood_bridge.png` },
    { name: 'farmland_house_walls', rel: `${DONOR_ROOT}/farmland/house_walls.png` },
  ];

  let nextGid = 1;
  /** @type {OlwTileset[]} */
  const out = [];
  for (const d of defs) {
    const abs = path.join(repoRoot, d.rel);
    if (!fs.existsSync(abs)) continue;
    const { width, height } = readPngSize(repoRoot, d.rel);
    const columns = Math.floor(width / TW);
    const rows = Math.floor(height / TW);
    const tilecount = columns * rows;
    const image = `/${d.rel.replace(/^public\//, '')}`;
    out.push({
      name: d.name,
      rel: d.rel,
      firstgid: nextGid,
      columns,
      rows,
      tilecount,
      image,
      tilewidth: TW,
      tileheight: TW,
      imagewidth: width,
      imageheight: height,
    });
    nextGid += tilecount;
  }
  return out;
}

/** @param {OlwTileset[]} tilesets */
function gid(tilesets, name, col, row) {
  const ts = tilesets.find((t) => t.name === name);
  if (!ts) return 0;
  if (col < 0 || row < 0 || col >= ts.columns || row >= ts.rows) return 0;
  return ts.firstgid + row * ts.columns + col;
}

function emptyLayer(w, h) {
  return new Array(w * h).fill(0);
}

function paintRect(data, w, x0, y0, x1, y1, tileGid) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      data[y * w + x] = tileGid;
    }
  }
}

function homeBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= 16 || ty >= 12) return true;
  if (ty <= 2) return true;
  if (tx === 0 || tx === 15) return true;
  if (ty === 11 && tx !== 7 && tx !== 8) return true;
  return false;
}

function gardenBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= 18 || ty >= 14) return true;
  // Physical west gate to Farm at y=7..8, x=0..1 and south gate to Village at x=8..9, y=13
  const westGate = (tx === 0 || tx === 1) && (ty === 7 || ty === 8);
  const southGate = (tx === 8 || tx === 9) && ty === 13;
  if (!westGate && !southGate && (tx === 0 || tx === 17 || ty === 0 || ty === 13)) return true;
  // Cottage roof & wall silhouette
  if (ty === 1 && tx >= 7 && tx <= 9) return true;
  if (ty === 2 && (tx === 7 || tx === 9)) return true;
  // Bushes
  if (ty === 3 && (tx === 2 || tx === 3 || tx === 14 || tx === 15)) return true;
  // Stream/pond water at x=5..11, y=9..10 (only vertical bridge x=7..8, y=9..10 is walkable)
  if ((ty === 9 || ty === 10) && tx >= 5 && tx <= 11) {
    const isBridge = (ty === 9 || ty === 10) && (tx === 7 || tx === 8);
    if (!isBridge) return true;
  }
  return false;
}

/** @param {OlwTileset[]} tilesets */
export function buildHomeMap(tilesets, sha, recoveryProps = []) {
  const w = 16;
  const h = 12;
  const grassFill = gid(tilesets, 'sprout_grass', 3, 6);
  const floor = gid(tilesets, 'sprout_paths', 0, 4);
  const wall = gid(tilesets, 'farmland_house_walls', 0, 0) || gid(tilesets, 'sprout_wooden_house', 0, 0);
  const rug = gid(tilesets, 'sprout_furniture', 4, 2);
  const bed = gid(tilesets, 'sprout_furniture', 0, 0);
  const table = gid(tilesets, 'sprout_furniture', 3, 1);

  const ground = emptyLayer(w, h);
  const decor = emptyLayer(w, h);
  const collision = emptyLayer(w, h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      ground[y * w + x] = grassFill;
      if (!homeBlocked(x, y)) ground[y * w + x] = floor;
      if (homeBlocked(x, y)) collision[y * w + x] = 1;
    }
  }

  for (let x = 1; x < 15; x += 1) {
    decor[1 * w + x] = wall;
    decor[2 * w + x] = wall;
  }
  paintRect(decor, w, 3, 3, 5, 4, rug);
  decor[5 * w + 2] = bed;
  decor[8 * w + 5] = table;
  decor[8 * w + 12] = gid(tilesets, 'sprout_furniture', 5, 0);

  return {
    compressionlevel: -1,
    height: h,
    width: w,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: TW,
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    nextlayerid: 8,
    nextobjectid: 20,
    properties: [
      { name: 'mapId', type: 'string', value: 'home' },
      { name: 'olwDonor', type: 'string', value: 'sprout-lands' },
      { name: 'olwDonorMap', type: 'string', value: 'farmland_large_house_layout' },
      { name: 'olwDonorSha', type: 'string', value: sha },
      { name: 'olwPrivateArtPrefer', type: 'string', value: 'demo-e' },
      ...recoveryProps,
    ],
    tilesets: tilesets.map((ts) => ({
      columns: ts.columns,
      firstgid: ts.firstgid,
      image: ts.image,
      imageheight: ts.imageheight,
      imagewidth: ts.imagewidth,
      margin: 0,
      name: ts.name,
      spacing: 0,
      tilecount: ts.tilecount,
      tileheight: ts.tileheight,
      tilewidth: ts.tilewidth,
    })),
    layers: [
      { id: 1, name: 'Ground', type: 'tilelayer', width: w, height: h, data: ground, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 2, name: 'Decor', type: 'tilelayer', width: w, height: h, data: decor, opacity: 1, visible: true, x: 0, y: 0 },
      {
        id: 3,
        name: 'Collision',
        type: 'tilelayer',
        width: w,
        height: h,
        data: collision,
        opacity: 1,
        visible: false,
        x: 0,
        y: 0,
      },
      {
        id: 4,
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
            name: 'door-to-garden',
            type: 'portal',
            x: 7 * TW,
            y: 11 * TW,
            width: TW * 2,
            height: TW,
            properties: [
              { name: 'targetMapId', type: 'string', value: 'garden' },
              { name: 'spawnX', type: 'int', value: 8 },
              { name: 'spawnY', type: 'int', value: 4 },
              { name: 'labelVi', type: 'string', value: 'Ra khu vườn' },
            ],
          },
        ],
      },
    ],
  };
}

/** @param {OlwTileset[]} tilesets */
export function buildGardenMap(tilesets, sha, recoveryProps = []) {
  const w = 18;
  const h = 14;
  const grass = gid(tilesets, 'sprout_grass', 3, 6);
  const grassVar = gid(tilesets, 'sprout_grass', 4, 6);
  const water = gid(tilesets, 'sprout_water', 0, 0);
  const path = gid(tilesets, 'sprout_paths', 1, 3);
  const tilled = gid(tilesets, 'sprout_tilled', 2, 2);
  const fence = gid(tilesets, 'sprout_fences', 0, 0);
  const house = gid(tilesets, 'sprout_wooden_house', 2, 1);
  const bush = gid(tilesets, 'sprout_grass_things', 1, 0);
  const bridge = gid(tilesets, 'sprout_bridge', 0, 0);
  const sunflower = gid(tilesets, 'sprout_plants', 3, 0);

  const ground = emptyLayer(w, h);
  const waterLayer = emptyLayer(w, h);
  const paths = emptyLayer(w, h);
  const decor = emptyLayer(w, h);
  const collision = emptyLayer(w, h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      ground[y * w + x] = (x + y) % 3 === 0 ? grassVar : grass;
      if (gardenBlocked(x, y)) collision[y * w + x] = 1;
    }
  }

  paintRect(waterLayer, w, 5, 9, 11, 10, water);
  paintRect(paths, w, 1, 8, 4, 10, path);
  // West dirt path leading smoothly to Farm gate (0..1, 7..8) & south trail leading to Village gate (8..9, 11..13)
  paintRect(paths, w, 0, 7, 6, 8, path);
  paintRect(paths, w, 8, 11, 9, 13, path);
  paintRect(paths, w, 7, 10, 8, 10, bridge);

  decor[2 * w + 8] = house;
  decor[1 * w + 7] = house;
  decor[1 * w + 9] = house;
  decor[3 * w + 2] = bush;
  decor[3 * w + 14] = bush;
  decor[3 * w + 15] = bush;

  paintRect(decor, w, 12, 6, 15, 9, tilled);
  for (let x = 12; x <= 15; x += 1) decor[5 * w + x] = fence;
  decor[11 * w + 1] = gid(tilesets, 'sprout_grass_things', 4, 1);
  decor[9 * w + 2] = gid(tilesets, 'sprout_furniture', 2, 2);
  for (const cx of [12, 14, 16]) decor[7 * w + cx] = sunflower;

  const objects = [
    {
      id: 2,
      name: 'cottage-to-home',
      type: 'portal',
      x: 8 * TW,
      y: 2 * TW,
      width: TW,
      height: TW,
      properties: [
        { name: 'targetMapId', type: 'string', value: 'home' },
        { name: 'spawnX', type: 'int', value: 8 },
        { name: 'spawnY', type: 'int', value: 9 },
        { name: 'labelVi', type: 'string', value: 'Vào trong nhà' },
      ],
    },
    {
      id: 3,
      name: 'garden-to-farm',
      type: 'portal',
      x: 0 * TW,
      y: 7 * TW,
      width: TW,
      height: TW * 2,
      properties: [
        { name: 'targetMapId', type: 'string', value: 'farm' },
        { name: 'spawnX', type: 'int', value: 60 },
        { name: 'spawnY', type: 'int', value: 22 },
        { name: 'labelVi', type: 'string', value: 'Ra Nông trại' },
      ],
    },
    {
      id: 4,
      name: 'garden-to-village',
      type: 'portal',
      x: 8 * TW,
      y: 13 * TW,
      width: TW * 2,
      height: TW,
      properties: [
        { name: 'targetMapId', type: 'string', value: 'village' },
        { name: 'spawnX', type: 'int', value: 26 },
        { name: 'spawnY', type: 'int', value: 2 },
        { name: 'labelVi', type: 'string', value: 'Vào Làng Cabacos' },
      ],
    },
  ];

  return {
    compressionlevel: -1,
    height: h,
    width: w,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: TW,
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    nextlayerid: 10,
    nextobjectid: 30,
    properties: [
      { name: 'mapId', type: 'string', value: 'garden' },
      { name: 'olwDonor', type: 'string', value: 'sprout-lands' },
      { name: 'olwDonorMap', type: 'string', value: 'harvest_hill_example' },
      { name: 'olwDonorSha', type: 'string', value: sha },
      { name: 'olwPrivateArtPrefer', type: 'string', value: 'demo-e' },
      ...recoveryProps,
    ],
    tilesets: tilesets.map((ts) => ({
      columns: ts.columns,
      firstgid: ts.firstgid,
      image: ts.image,
      imageheight: ts.imageheight,
      imagewidth: ts.imagewidth,
      margin: 0,
      name: ts.name,
      spacing: 0,
      tilecount: ts.tilecount,
      tileheight: ts.tileheight,
      tilewidth: ts.tilewidth,
    })),
    layers: [
      { id: 1, name: 'Ground', type: 'tilelayer', width: w, height: h, data: ground, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 2, name: 'Water', type: 'tilelayer', width: w, height: h, data: waterLayer, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 3, name: 'Paths', type: 'tilelayer', width: w, height: h, data: paths, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 4, name: 'Decor', type: 'tilelayer', width: w, height: h, data: decor, opacity: 1, visible: true, x: 0, y: 0 },
      {
        id: 5,
        name: 'Collision',
        type: 'tilelayer',
        width: w,
        height: h,
        data: collision,
        opacity: 1,
        visible: false,
        x: 0,
        y: 0,
      },
      {
        id: 6,
        name: 'Portals',
        type: 'objectgroup',
        visible: true,
        opacity: 1,
        draworder: 'topdown',
        x: 0,
        y: 0,
        objects,
      },
    ],
  };
}