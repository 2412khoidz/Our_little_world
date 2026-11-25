/**
 * Playable PyDew-inspired forest glade (cozy tileset) — collision + portal art.
 */
import fs from 'node:fs';
import path from 'node:path';

const T = {
  g0: 17,
  g1: 18,
  g2: 19,
  pathA: 22,
  pathB: 23,
  woodPlank: 24,
  fenceH: 25,
  fenceV: 27,
  hedge: 28,
  flower: 28,
  roofL: 33,
  roofM: 34,
  wallL: 36,
  wallR: 38,
  treeTL: 39,
  treeTR: 40,
  treeBL: 41,
  treeBR: 42,
  forestFloor: 55,
};

const TW = 16;

function idx(w, x, y) {
  return y * w + x;
}

function empty(w, h) {
  return new Array(w * h).fill(0);
}

function carvePath(paths, w, x0, y0, x1, y1) {
  const dx = x1 > x0 ? 1 : x1 < x0 ? -1 : 0;
  const dy = y1 > y0 ? 1 : y1 < y0 ? -1 : 0;
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    paths[idx(w, x, y)] = (x + y) % 2 === 0 ? T.pathA : T.pathB;
    if (x !== x1) x += dx;
    else if (y !== y1) y += dy;
  }
  paths[idx(w, x1, y1)] = T.pathB;
}

function tileLayer(name, id, data, w, h) {
  return {
    id,
    name,
    type: 'tilelayer',
    visible: true,
    opacity: 1,
    x: 0,
    y: 0,
    width: w,
    height: h,
    data,
  };
}

function paintWestPortalArt(paths, vegetation, buildings, collision, w, slice) {
  const py = slice.portals.returnToVillage.forestEdgeTile.tileY;
  for (let y = py; y <= py + 1; y += 1) {
    collision[idx(w, 0, y)] = 0;
    collision[idx(w, 1, y)] = 0;
    paths[idx(w, 0, y)] = T.woodPlank;
    paths[idx(w, 1, y)] = T.pathA;
  }
  vegetation[idx(w, 1, py - 1)] = T.flower;
  vegetation[idx(w, 1, py + 2)] = T.flower;
  buildings[idx(w, 2, py)] = T.wallL;
  buildings[idx(w, 2, py + 1)] = T.wallR;
  buildings[idx(w, 3, py)] = T.roofL;
  buildings[idx(w, 3, py + 1)] = T.roofM;
  collision[idx(w, 2, py)] = 1;
  collision[idx(w, 3, py)] = 1;
}

function paintEastPortalArt(paths, collision, w) {
  const py = 38;
  for (let y = py; y <= py + 1; y += 1) {
    collision[idx(w, w - 1, y)] = 0;
    paths[idx(w, w - 2, y)] = T.woodPlank;
    paths[idx(w, w - 1, y)] = T.pathB;
  }
}

/**
 * @param {object} slice forest-glade-slice.json
 */
export function buildPydewGladeForestMap(slice, manifest) {
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

  const glade = slice.glade ?? { originX: 16, originY: 20, radiusX: 12, radiusY: 8 };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = (x - (glade.originX + glade.radiusX)) / glade.radiusX;
      const ny = (y - (glade.originY + glade.radiusY)) / glade.radiusY;
      if (nx * nx + ny * ny <= 1) {
        ground[idx(w, x, y)] = T.g1;
        paths[idx(w, x, y)] = (x + y) % 2 === 0 ? T.pathA : T.pathB;
      }
    }
  }

  const spawn = slice.spawnDefault;
  carvePath(paths, w, spawn.tileX, spawn.tileY, 4, spawn.tileY);
  carvePath(paths, w, 4, spawn.tileY, 4, slice.portals.returnToVillage.forestEdgeTile.tileY);
  carvePath(paths, w, spawn.tileX, spawn.tileY, glade.originX, glade.originY + glade.radiusY);

  const trees = [
    [12, 10],
    [22, 8],
    [38, 12],
    [42, 28],
    [14, 36],
    [28, 14],
    [34, 38],
    [18, 42],
    [44, 18],
  ];
  for (const [tx, ty] of trees) {
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

  paintWestPortalArt(paths, vegetation, buildings, collision, w, slice);
  paintEastPortalArt(paths, collision, w);

  const spawnForest = slice.portals.village.forestSpawnTile;
  collision[idx(w, spawnForest.tileX, spawnForest.tileY)] = 0;

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
        y: slice.portals.returnToVillage.forestEdgeTile.tileY * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          {
            name: 'spawnX',
            type: 'int',
            value: slice.portals.returnToVillage.villageSpawnTile.tileX,
          },
          {
            name: 'spawnY',
            type: 'int',
            value: slice.portals.returnToVillage.villageSpawnTile.tileY,
          },
          { name: 'labelVi', type: 'string', value: slice.portals.returnToVillage.labelVi },
        ],
      },
      {
        id: 2,
        name: 'forest-to-beach',
        type: 'portal',
        x: (w - 1) * TW,
        y: 38 * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'beach' },
          { name: 'spawnX', type: 'int', value: 2 },
          { name: 'spawnY', type: 'int', value: 22 },
          { name: 'labelVi', type: 'string', value: 'Ra Gull Bay (bãi biển)' },
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
        id: 90,
        name: 'pydew_forest_sign',
        type: 'interactable',
        x: (glade.originX + 2) * TW,
        y: (glade.originY + 2) * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          {
            name: 'labelVi',
            type: 'string',
            value: 'Glade PyDew — lối về làng phía Tây',
          },
          { name: 'maxRadiusPx', type: 'int', value: 52 },
        ],
      },
    ],
  };

  return {
    compressionlevel: -1,
    height: h,
    width: w,
    infinite: false,
    layers: [
      tileLayer('Ground', 1, ground, w, h),
      tileLayer('Paths', 2, paths, w, h),
      tileLayer('Water', 3, water, w, h),
      tileLayer('Buildings', 4, buildings, w, h),
      tileLayer('Vegetation', 5, vegetation, w, h),
      tileLayer('Collision', 6, collision, w, h),
    ],
    nextlayerid: 12,
    nextobjectid: 100,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: TW,
    tilewidth: TW,
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
        tileheight: TW,
        tilewidth: TW,
      },
    ],
    type: 'map',
    version: '1.10',
    properties: [
      { name: 'mapId', type: 'string', value: 'forest' },
      { name: 'olwDonor', type: 'string', value: 'pydew' },
      { name: 'olwDonorSha', type: 'string', value: manifest.pinnedCommit },
      { name: 'olwDonorSlice', type: 'string', value: slice.id },
      { name: 'olwDonorSketch', type: 'string', value: 'glade-v1-playable' },
      {
        name: 'olwDonorNote',
        type: 'string',
        value: 'PyDew glade tilemap — cozy art, collision + portal gates',
      },
    ],
    _objectLayers: [portals, interactables],
  };
}

export function finalizeForestMap(draft) {
  const map = { ...draft };
  map.layers = [...map.layers, ...map._objectLayers];
  delete map._objectLayers;
  return map;
}