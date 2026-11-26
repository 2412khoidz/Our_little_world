/**
 * Cabacos overworld east coast → OLW beach.json (native ts_map tilesets).
 * Upstream: goncalojbsousa/Farming-Simulator-Cabacos — Cabacos_map.tmj (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const CABACOS = path.resolve('public/maps/donor/cabacos/Cabacos_map.tmj');
const OUT = path.resolve('src/assets/maps/beach.json');
const VILLAGE_JSON = path.resolve('src/assets/maps/village.json');
const OLW_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';
const TW = 16;

/** East-coast playable slice (sand, pier, cliffs, village edge). */
const CROP_OX = 38;
const CROP_OY = 10;
const OUT_W = 48;
const OUT_H = 34;

const VISUAL_LAYERS = [
  'sea',
  'clouds_02',
  'land',
  'paths',
  'shadows',
  'decoration_01',
  'building',
  'walls',
  'wells',
  'decoration_02',
  'decoration_03',
  'cloud_shadow',
  'clouds_01',
];

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
  {
    columns: 10,
    firstgid: 4097,
    image: '/maps/donor/cabacos/ts_forest.png',
    imageheight: 576,
    imagewidth: 320,
    margin: 0,
    name: 'ts_forest',
    spacing: 0,
    tilecount: 180,
    tileheight: 32,
    tilewidth: 32,
  },
];

const SPAWN_X = 1;
const SPAWN_Y = 16;
const VILLAGE_SPAWN_X = 84;
const VILLAGE_SPAWN_Y = 27;
const PIER_TILE_X = 34;
const PIER_TILE_Y = 16;
const SIGN_TILE_X = 8;
const SIGN_TILE_Y = 4;
const LIFEBUOY_TILE_X = 33;
const LIFEBUOY_TILE_Y = 17;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function cropLayer(srcData, srcW, srcH, ox, oy, outW, outH) {
  const out = new Array(outW * outH).fill(0);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const sx = ox + x;
      const sy = oy + y;
      if (sx >= 0 && sy >= 0 && sx < srcW && sy < srcH) {
        out[y * outW + x] = srcData[sy * srcW + sx] ?? 0;
      }
    }
  }
  return out;
}

function buildCabacosBeachMap() {
  const cab = loadJson(CABACOS);
  const srcW = cab.width;
  const srcH = cab.height;

  let id = 1;
  const tileLayers = [];
  for (const name of VISUAL_LAYERS) {
    const src = cab.layers.find((l) => l.name === name && l.type === 'tilelayer');
    if (!src?.data) continue;
    const props = src.properties ? [...src.properties] : [];
    tileLayers.push({
      id: id++,
      name,
      type: 'tilelayer',
      visible: src.visible !== false,
      opacity: src.opacity ?? 1,
      x: 0,
      y: 0,
      width: OUT_W,
      height: OUT_H,
      data: cropLayer(src.data, srcW, srcH, CROP_OX, CROP_OY, OUT_W, OUT_H),
      properties: props,
    });
  }

  const colSrc = cab.layers.find((l) => l.name === 'Collision' && l.type === 'tilelayer');
  const collisionData = colSrc?.data
    ? cropLayer(colSrc.data, srcW, srcH, CROP_OX, CROP_OY, OUT_W, OUT_H)
    : new Array(OUT_W * OUT_H).fill(0);

  const portalStrip = [
    [0, SPAWN_Y],
    [0, SPAWN_Y + 1],
    [SPAWN_X, SPAWN_Y],
    [SPAWN_X, SPAWN_Y - 1],
    [SPAWN_X, SPAWN_Y + 1],
  ];
  for (const [x, y] of portalStrip) {
    collisionData[y * OUT_W + x] = 0;
  }
  for (let y = PIER_TILE_Y - 1; y <= PIER_TILE_Y + 2; y += 1) {
    for (let x = PIER_TILE_X - 2; x <= PIER_TILE_X + 3; x += 1) {
      const i = y * OUT_W + x;
      if (i >= 0 && i < collisionData.length) collisionData[i] = 0;
    }
  }

  const collision = {
    id: id++,
    name: 'Collision',
    type: 'tilelayer',
    visible: false,
    opacity: 1,
    x: 0,
    y: 0,
    width: OUT_W,
    height: OUT_H,
    data: collisionData,
  };

  const portals = {
    id: id++,
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
        name: 'beach-to-village',
        type: 'portal',
        x: 0,
        y: SPAWN_Y * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: VILLAGE_SPAWN_X },
          { name: 'spawnY', type: 'int', value: VILLAGE_SPAWN_Y },
          { name: 'labelVi', type: 'string', value: 'Về làng Cabacos' },
        ],
      },
    ],
  };

  const interactables = {
    id: id++,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 20,
        name: 'beach_gull_bay_sign',
        type: 'interactable',
        x: SIGN_TILE_X * TW,
        y: SIGN_TILE_Y * TW,
        width: TW * 3,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          { name: 'labelVi', type: 'string', value: 'Bãi biển Cabacos — phía đông' },
          { name: 'maxRadiusPx', type: 'int', value: 52 },
        ],
      },
      {
        id: 21,
        name: 'beach_pier_fishing',
        type: 'interactable',
        x: PIER_TILE_X * TW,
        y: PIER_TILE_Y * TW,
        width: TW * 2,
        height: TW * 2,
        properties: [
          { name: 'kind', type: 'string', value: 'fishing_spot' },
          { name: 'labelVi', type: 'string', value: 'Cầu câu Gull Bay' },
          { name: 'maxRadiusPx', type: 'int', value: 56 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'fishingSpotId', type: 'string', value: 'gull_bay' },
        ],
      },
      {
        id: 22,
        name: 'beach_lifebuoy_post',
        type: 'interactable',
        x: LIFEBUOY_TILE_X * TW,
        y: LIFEBUOY_TILE_Y * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'kind', type: 'string', value: 'bench' },
          {
            name: 'labelVi',
            type: 'string',
            value: 'Phao cứu sinh bến — cặp đôi nghỉ gần cầu câu',
          },
          { name: 'maxRadiusPx', type: 'int', value: 48 },
          { name: 'donorRef', type: 'string', value: 'harvest-duo:lifebuoy@19,17' },
        ],
      },
    ],
  };

  return {
    compressionlevel: -1,
    height: OUT_H,
    width: OUT_W,
    infinite: false,
    layers: [...tileLayers, collision, portals, interactables],
    nextlayerid: id + 5,
    nextobjectid: 100,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: 16,
    tilewidth: 16,
    tilesets: CABACOS_TILESETS,
    type: 'map',
    version: '1.10',
    properties: [
      { name: 'mapId', type: 'string', value: 'beach' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorMap', type: 'string', value: 'Cabacos_map_east_coast' },
      { name: 'olwDonorSha', type: 'string', value: OLW_SHA },
      { name: 'olwDonorCrop', type: 'string', value: `${CROP_OX},${CROP_OY},${OUT_W},${OUT_H}` },
      { name: 'olwCoastPolish', type: 'string', value: 'cabacos-east-coast-native' },
      { name: 'olwHarvestDuoRef', type: 'string', value: 'beach-layout-reference.v1' },
      ...(MAP_RECOVERY_MODE
        ? [
            { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
            { name: 'olwBeachCabacosPrimary', type: 'bool', value: true },
          ]
        : []),
    ],
  };
}

function patchVillageBeachPortal() {
  if (!fs.existsSync(VILLAGE_JSON)) return;
  const village = JSON.parse(fs.readFileSync(VILLAGE_JSON, 'utf8'));
  const donor = village.properties?.find((p) => p.name === 'olwDonor')?.value;
  if (donor !== 'cabacos') return;

  const portalsLayer = village.layers.find((l) => l.name === 'Portals');
  if (!portalsLayer) return;
  portalsLayer.objects = portalsLayer.objects.filter((o) => o.name !== 'village-to-beach');
  portalsLayer.objects.push({
    id: 9105,
    name: 'village-to-beach',
    type: 'portal',
    x: VILLAGE_SPAWN_X * TW,
    y: (VILLAGE_SPAWN_Y - 1) * TW,
    width: TW * 2,
    height: TW * 2,
    properties: [
      { name: 'targetMapId', type: 'string', value: 'beach' },
      { name: 'labelVi', type: 'string', value: 'Ra bãi biển phía đông' },
      { name: 'spawnX', type: 'int', value: SPAWN_X },
      { name: 'spawnY', type: 'int', value: SPAWN_Y },
    ],
  });
  fs.writeFileSync(VILLAGE_JSON, JSON.stringify(village, null, 2));
  console.log('Patched village.json village-to-beach portal (Cabacos east coast)');
}

function main() {
  const map = buildCabacosBeachMap();
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  patchVillageBeachPortal();
  console.log(`Wrote beach.json ${OUT_W}×${OUT_H} from Cabacos east coast crop @${CROP_OX},${CROP_OY}`);
}

main();