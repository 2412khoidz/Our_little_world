/**
 * Vendors Cabacos overworld + Casa_player interior into OLW Tiled JSON.
 * Upstream: goncalojbsousa/Farming-Simulator-Cabacos @ 79e423d (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const ROOT = path.resolve('public/maps/donor/cabacos');
const OUT_MAPS = path.resolve('public/assets/maps');
const TW = 16;

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(OUT_MAPS, file), JSON.stringify(data, null, 2));
}

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

function bakeObjectCollision(mapJson, layerNames = ['Collision']) {
  const w = mapJson.width;
  const h = mapJson.height;
  const blocked = new Set();
  for (const layer of mapJson.layers) {
    if (layer.type === 'tilelayer' && layerNames.includes(layer.name) && layer.data) {
      for (let i = 0; i < layer.data.length; i += 1) {
        if ((layer.data[i] ?? 0) > 0) blocked.add(tileKey(i % w, Math.floor(i / w)));
      }
    }
    if (layer.type === 'objectgroup' && layerNames.includes(layer.name) && layer.objects) {
      for (const obj of layer.objects) {
        const x0 = Math.floor(obj.x / TW);
        const y0 = Math.floor(obj.y / TW);
        const x1 = Math.ceil((obj.x + obj.width) / TW);
        const y1 = Math.ceil((obj.y + obj.height) / TW);
        for (let ty = y0; ty < y1; ty += 1) {
          for (let tx = x0; tx < x1; tx += 1) {
            if (tx >= 0 && ty >= 0 && tx < w && ty < h) blocked.add(tileKey(tx, ty));
          }
        }
      }
    }
  }
  return blocked;
}

function exportVillage() {
  const src = loadJson('Cabacos_map.tmj');
  src.properties = [
    ...(src.properties ?? []),
    { name: 'mapId', type: 'string', value: 'village' },
    { name: 'olwDonor', type: 'string', value: 'cabacos' },
    { name: 'olwDonorSha', type: 'string', value: '79e423defc12bd99327cfcc28bf7ec0085996244' },
  ];
  for (const ts of src.tilesets ?? []) {
    ts.image = `/maps/donor/cabacos/${path.basename(ts.image)}`;
  }

  const portals = {
    id: 9001,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 9101,
        name: 'village-to-garden',
        type: 'portal',
        x: 42 * TW,
        y: 31 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'labelVi', type: 'string', value: 'Về vườn' },
          { name: 'spawnX', type: 'int', value: 9 },
          { name: 'spawnY', type: 'int', value: 12 },
        ],
      },
      {
        id: 9102,
        name: 'garden-to-village',
        type: 'portal',
        x: 10 * TW,
        y: 30 * TW,
        width: TW * 2,
        height: TW,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'labelVi', type: 'string', value: 'Đường về vườn' },
          { name: 'spawnX', type: 'int', value: 9 },
          { name: 'spawnY', type: 'int', value: 12 },
        ],
      },
      {
        id: 9103,
        name: 'village-to-farm',
        type: 'portal',
        x: 80 * TW,
        y: 24 * TW,
        width: TW,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'farm' },
          { name: 'labelVi', type: 'string', value: 'Ra đồng' },
          { name: 'spawnX', type: 'int', value: 4 },
          { name: 'spawnY', type: 'int', value: 20 },
        ],
      },
      {
        id: 9104,
        name: 'player_house_door',
        type: 'portal',
        x: 666,
        y: 479.5,
        width: 30,
        height: 14,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'shop' },
          { name: 'labelVi', type: 'string', value: 'Cửa nhà — vào bên trong (E)' },
          { name: 'spawnX', type: 'int', value: 12 },
          { name: 'spawnY', type: 'int', value: 14 },
        ],
      },
      {
        id: 9105,
        name: 'village-to-beach',
        type: 'portal',
        x: 84 * TW,
        y: 26 * TW,
        width: TW * 2,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'beach' },
          { name: 'labelVi', type: 'string', value: 'Ra Gull Bay' },
          { name: 'spawnX', type: 'int', value: 1 },
          { name: 'spawnY', type: 'int', value: 16 },
        ],
      },
    ],
  };

  const donorDoorLabels = {
    player_house_door: 'Cửa nhà — vào bên trong (E)',
    player_crop_market_door: 'Chợ nông sản Cabacos',
    player_seed_shop_door: 'Hạt giống & dụng cụ',
    player_town_hall_door: 'Tòa thị chính — chưa mở',
  };

  const interactionLayer = src.layers.find((l) => l.name === 'Interactions' && l.type === 'objectgroup');
  const cabacosInteractables = [];
  let nextId = 9201;
  for (const obj of interactionLayer?.objects ?? []) {
    const label = donorDoorLabels[obj.name];
    if (!label) continue;
    cabacosInteractables.push({
      id: nextId,
      name: `cabacos_${obj.name}`,
      type: 'interactable',
      x: obj.x,
      y: obj.y,
      width: obj.width ?? TW,
      height: obj.height ?? TW,
      properties: [
        { name: 'kind', type: 'string', value: obj.name === 'player_house_door' ? 'door' : 'shop_npc' },
        { name: 'labelVi', type: 'string', value: label },
        { name: 'maxRadiusPx', type: 'int', value: 56 },
        { name: 'anchorId', type: 'string', value: obj.name },
      ],
    });
    nextId += 1;
  }

  cabacosInteractables.push(
    {
      id: nextId,
      name: 'cabacos_sign_farm_gate',
      type: 'interactable',
      x: 80 * TW,
      y: 24 * TW,
      width: TW * 2,
      height: TW * 2,
      properties: [
        { name: 'kind', type: 'string', value: 'crop_plot' },
        { name: 'labelVi', type: 'string', value: '→ Trang trại chính (184 luống)' },
        { name: 'maxRadiusPx', type: 'int', value: 64 },
      ],
    },
    {
      id: nextId + 1,
      name: 'cabacos_sign_beach',
      type: 'interactable',
      x: 84 * TW,
      y: 26 * TW,
      width: TW * 2,
      height: TW * 2,
      properties: [
        { name: 'kind', type: 'string', value: 'fishing_spot' },
        { name: 'labelVi', type: 'string', value: '→ Gull Bay (bãi biển)' },
        { name: 'maxRadiusPx', type: 'int', value: 64 },
        { name: 'donorPlayable', type: 'bool', value: true },
      ],
    },
    {
      id: nextId + 2,
      name: 'cabacos_village_hollow_bakery',
      type: 'interactable',
      x: 18 * TW,
      y: 31 * TW,
      width: TW * 2,
      height: TW * 1.5,
      properties: [
        { name: 'kind', type: 'string', value: 'workshop_building' },
        { name: 'labelVi', type: 'string', value: 'Lò Hollow — nướng bánh' },
        { name: 'maxRadiusPx', type: 'int', value: 56 },
        { name: 'donorPlayable', type: 'bool', value: true },
        { name: 'workshopFocus', type: 'string', value: 'bakery' },
      ],
    },
    {
      id: nextId + 3,
      name: 'cabacos_village_hollow_coop',
      type: 'interactable',
      x: 22 * TW,
      y: 31 * TW,
      width: TW * 2,
      height: TW * 1.5,
      properties: [
        { name: 'kind', type: 'string', value: 'workshop_building' },
        { name: 'labelVi', type: 'string', value: 'Chuồng gà Hollow — thu trứng' },
        { name: 'maxRadiusPx', type: 'int', value: 56 },
        { name: 'donorPlayable', type: 'bool', value: true },
        { name: 'workshopFocus', type: 'string', value: 'coop' },
      ],
    },
    {
      id: nextId + 4,
      name: 'cabacos_plaza_well',
      type: 'interactable',
      x: 480,
      y: 488,
      width: 16,
      height: 16,
      properties: [
        { name: 'kind', type: 'string', value: 'bench' },
        { name: 'labelVi', type: 'string', value: 'Giếng nước' },
        { name: 'maxRadiusPx', type: 'int', value: 48 },
      ],
    },
  );

  const interactables = {
    id: 9002,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: cabacosInteractables,
  };

  src.layers = src.layers.filter((l) => l.name !== 'Portals' && l.name !== 'Interactables');
  src.layers.push(portals, interactables);
  writeJson('village.json', src);
  console.log('Wrote village.json', src.width, 'x', src.height, 'donor=cabacos');
}

const SHOP_LAYER_NAMES = ['land', 'paths', 'building', 'seeds_market', 'decoration_01', 'decoration_02', 'decoration_03'];
const SHOP_CROP = { ox: 30, oy: 20, w: 22, h: 16 };
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

function cropLayerData(srcData, srcW, srcH, ox, oy, outW, outH) {
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

function exportShopFromSeedsMarket() {
  const overworld = loadJson('Cabacos_map.tmj');
  const { ox, oy, w, h } = SHOP_CROP;
  let id = 1;
  const tileLayers = [];
  for (const name of SHOP_LAYER_NAMES) {
    const src = overworld.layers.find((l) => l.name === name && l.type === 'tilelayer');
    if (!src?.data) continue;
    tileLayers.push({
      id: id++,
      name,
      type: 'tilelayer',
      visible: true,
      opacity: src.opacity ?? 1,
      x: 0,
      y: 0,
      width: w,
      height: h,
      data: cropLayerData(src.data, overworld.width, overworld.height, ox, oy, w, h),
    });
  }

  const blocked = new Set();
  for (const layer of tileLayers) {
    if (layer.name.includes('collision')) continue;
    for (let i = 0; i < layer.data.length; i += 1) {
      const gid = layer.data[i];
      if (gid > 0 && (layer.name === 'building' || layer.name.startsWith('decoration'))) {
        blocked.add(`${i % w},${Math.floor(i / w)}`);
      }
    }
  }
  const collision = new Array(w * h).fill(0);
  for (const key of blocked) {
    const [tx, ty] = key.split(',').map(Number);
    collision[ty * w + tx] = 1;
  }
  const doorTx = Math.floor((523 - ox * TW) / TW);
  const doorTy = Math.floor((383.5 - oy * TW) / TW);
  for (let dy = 0; dy < 2; dy += 1) {
    const ty = Math.min(h - 1, Math.max(0, doorTy + dy));
    const tx = Math.min(w - 1, Math.max(0, doorTx));
    collision[ty * w + tx] = 0;
    collision[ty * w + tx + 1] = 0;
  }

  const shop = {
    compressionlevel: -1,
    height: h,
    width: w,
    infinite: false,
    layers: [
      ...tileLayers,
      {
        id: id++,
        name: 'Collision',
        type: 'tilelayer',
        data: collision,
        width: w,
        height: h,
        opacity: 1,
        visible: false,
        x: 0,
        y: 0,
      },
      {
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
            id: 3,
            name: 'shop-to-village',
            type: 'portal',
            x: doorTx * TW,
            y: doorTy * TW,
            width: TW * 2,
            height: TW,
            properties: [
              { name: 'targetMapId', type: 'string', value: 'village' },
              { name: 'labelVi', type: 'string', value: 'Ra làng' },
              { name: 'spawnX', type: 'int', value: Math.floor(523 / TW) },
              { name: 'spawnY', type: 'int', value: Math.floor(400 / TW) },
            ],
          },
        ],
      },
    ],
    nextlayerid: id + 2,
    nextobjectid: 10,
    orientation: 'orthogonal',
    properties: [
      { name: 'mapId', type: 'string', value: 'shop' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorInterior', type: 'string', value: 'seeds_market_overworld_slice' },
      { name: 'olwShopRender', type: 'string', value: 'tiled' },
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
      { name: 'olwDonorCrop', type: 'string', value: `${ox},${oy},${w},${h}` },
    ],
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TW,
    tilesets: CABACOS_TILESETS,
    tilewidth: TW,
    type: 'map',
    version: '1.10',
  };
  writeJson('shop.json', shop);
  console.log(`Wrote shop.json seeds_market slice ${w}×${h} (recovery, no Casa_player)`);
}

function exportShopInteriorCasaPlayer() {
  const interior = loadJson('Casa_player.tmj');
  const w = 24;
  const h = 18;
  const collision = new Uint32Array(w * h);
  const blocked = bakeObjectCollision(interior, ['Collision']);
  for (const key of blocked) {
    const [tx, ty] = key.split(',').map(Number);
    if (tx < w && ty < h) collision[ty * w + tx] = 1;
  }

  const doorY = 11;
  for (let dx = 0; dx < 2; dx += 1) {
    collision[doorY * w + (17 + dx)] = 0;
  }

  const shop = {
    compressionlevel: -1,
    height: h,
    infinite: false,
    layers: [
      {
        id: 1,
        name: 'Collision',
        type: 'tilelayer',
        data: [...collision],
        width: w,
        height: h,
        opacity: 1,
        visible: true,
        x: 0,
        y: 0,
      },
      {
        id: 2,
        name: 'Portals',
        type: 'objectgroup',
        visible: true,
        opacity: 1,
        draworder: 'topdown',
        x: 0,
        y: 0,
        objects: [
          {
            id: 3,
            name: 'shop-to-village',
            type: 'portal',
            x: 17 * TW,
            y: doorY * TW,
            width: TW * 2,
            height: TW,
            properties: [
              { name: 'targetMapId', type: 'string', value: 'village' },
              { name: 'labelVi', type: 'string', value: 'Ra làng' },
              { name: 'spawnX', type: 'int', value: 42 },
              { name: 'spawnY', type: 'int', value: 31 },
            ],
          },
        ],
      },
    ],
    nextlayerid: 4,
    nextobjectid: 4,
    orientation: 'orthogonal',
    properties: [
      { name: 'mapId', type: 'string', value: 'shop' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorInterior', type: 'string', value: 'Casa_player.tmj' },
      { name: 'olwDonorInteriorImage', type: 'string', value: '/maps/donor/cabacos/house_interior_sem_fundo.png' },
    ],
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TW,
    tilesets: [],
    tilewidth: TW,
    type: 'map',
    version: '1.10',
    width: w,
  };
  writeJson('shop.json', shop);
  console.log('Wrote shop.json (Casa_player collision + image ref)');
}

function exportShopInterior() {
  if (MAP_RECOVERY_MODE) {
    exportShopFromSeedsMarket();
    return;
  }
  exportShopInteriorCasaPlayer();
}

exportVillage();
exportShopInterior();