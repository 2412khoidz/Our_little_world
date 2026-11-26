/**
 * Vendors Cabacos overworld + Casa_player interior into OLW Tiled JSON.
 * Upstream: goncalojbsousa/Farming-Simulator-Cabacos @ 79e423d (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const ROOT = path.resolve('public/maps/donor/cabacos');
const OUT_MAPS = path.resolve('src/assets/maps');
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
        x: 44 * TW,
        y: 31 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'labelVi', type: 'string', value: 'Về vườn nhà' },
          { name: 'spawnX', type: 'int', value: 9 },
          { name: 'spawnY', type: 'int', value: 11 },
        ],
      },
      {
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
      },
      {
        id: 9104,
        name: 'player_house_door',
        type: 'portal',
        x: 41 * TW,
        y: 30 * TW,
        width: 30,
        height: 14,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'home' },
          { name: 'labelVi', type: 'string', value: 'Vào nhà của hai đứa' },
          { name: 'spawnX', type: 'int', value: 8 },
          { name: 'spawnY', type: 'int', value: 9 },
        ],
      },
      {
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
          { name: 'spawnX', type: 'int', value: 3 },
          { name: 'spawnY', type: 'int', value: 16 },
        ],
      },
      ...(MAP_RECOVERY_MODE
        ? [
            {
              id: 9106,
              name: 'village-to-forest',
              type: 'portal',
              x: 12 * TW,
              y: 2 * TW,
              width: TW * 2,
              height: TW,
              properties: [
                { name: 'targetMapId', type: 'string', value: 'forest' },
                { name: 'labelVi', type: 'string', value: 'Vào rừng thông Tuxemon' },
                { name: 'spawnX', type: 'int', value: 8 },
                { name: 'spawnY', type: 'int', value: 36 },
              ],
            },
          ]
        : []),
    ],
  };

  const VILLAGE_SHOP_PORTALS = MAP_RECOVERY_MODE
    ? [
        {
          id: 9110,
          name: 'village-to-shop-seed',
          door: 'player_seed_shop_door',
          targetMapId: 'shop_seed',
          labelVi: 'Vào cửa hàng hạt',
          spawnInterior: { tileX: 12, tileY: 14 },
        },
        {
          id: 9111,
          name: 'village-to-shop-tool',
          door: 'player_tool_shop_door',
          targetMapId: 'shop_tool',
          labelVi: 'Vào cửa hàng dụng cụ',
          portalTile: { tileX: 28, tileY: 36 },
          spawnInterior: { tileX: 11, tileY: 13 },
        },
        {
          id: 9112,
          name: 'village-to-shop-crop-market',
          door: 'player_crop_market_door',
          targetMapId: 'shop_crop_market',
          labelVi: 'Vào chợ nông sản',
          spawnInterior: { tileX: 11, tileY: 14 },
        },
        {
          id: 9113,
          name: 'village-to-shop-town-hall',
          door: 'player_town_hall_door',
          targetMapId: 'shop_town_hall',
          labelVi: 'Vào tòa thị chính',
          spawnInterior: { tileX: 11, tileY: 13 },
        },
      ]
    : [];

  const interactionLayer = src.layers.find((l) => l.name === 'Interactions' && l.type === 'objectgroup');

  const donorDoorLabels = MAP_RECOVERY_MODE
    ? {
        player_house_door: 'Cửa nhà — về nhà',
      }
    : {
        player_house_door: 'Cửa nhà — vào bên trong (E)',
        player_crop_market_door: 'Chợ nông sản Cabacos',
        player_seed_shop_door: 'Hạt giống & dụng cụ',
        player_town_hall_door: 'Tòa thị chính — chưa mở',
      };

  const doorByName = new Map((interactionLayer?.objects ?? []).map((o) => [o.name, o]));
  for (const spec of VILLAGE_SHOP_PORTALS) {
    const door = doorByName.get(spec.door);
    if (!door && !spec.portalTile) continue;
    const px = spec.portalTile ? spec.portalTile.tileX * TW : door.x;
    const py = spec.portalTile ? spec.portalTile.tileY * TW : door.y;
    const pw = spec.portalTile ? TW : (door.width ?? TW);
    const ph = spec.portalTile ? TW : (door.height ?? TW);
    portals.objects.push({
      id: spec.id,
      name: spec.name,
      type: 'portal',
      x: px,
      y: py,
      width: pw,
      height: ph,
      properties: [
        { name: 'targetMapId', type: 'string', value: spec.targetMapId },
        { name: 'labelVi', type: 'string', value: spec.labelVi },
        { name: 'spawnX', type: 'int', value: spec.spawnInterior.tileX },
        { name: 'spawnY', type: 'int', value: spec.spawnInterior.tileY },
      ],
    });
  }

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

  const npcs = {
    id: 9003,
    name: 'NPCSpawns',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 9301,
        name: 'bac_hai',
        type: 'npc',
        x: 34 * TW,
        y: 25 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'seed_vendor' },
          { name: 'labelVi', type: 'string', value: 'Bác Hai' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Hạt giống tươi mới về sáng nay! Bước qua cửa gỗ cạnh bác để vào tiệm nhé.',
          },
        ],
      },
      {
        id: 9302,
        name: 'co_lan',
        type: 'npc',
        x: 20 * TW,
        y: 32 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'bakery_host' },
          { name: 'labelVi', type: 'string', value: 'Cô Lan' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Tiệm bánh Hollow vừa ra lò bánh dâu nóng hổi — mang lúa mì & dâu tây tới đây cùng chế biến nào!',
          },
        ],
      },
      {
        id: 9303,
        name: 'chu_tu',
        type: 'npc',
        x: 29 * TW,
        y: 36 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'tool_smith' },
          { name: 'labelVi', type: 'string', value: 'Chú Tư' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Mồi câu và dụng cụ làm nông đều đủ ở tiệm dụng cụ phía sau chú.',
          },
        ],
      },
      {
        id: 9304,
        name: 'be_na',
        type: 'npc',
        x: 43 * TW,
        y: 31 * TW,
        width: TW,
        height: TW,
        properties: [
          { name: 'role', type: 'string', value: 'town_guide' },
          { name: 'labelVi', type: 'string', value: 'Bé Na' },
          {
            name: 'dialogueVi',
            type: 'string',
            value: 'Đi hướng Tây ra Nông trại 184 luống, hướng Đông qua bến tàu tới Vịnh Hải Âu, hướng Bắc là vào Rừng thông!',
          },
        ],
      },
    ],
  };

  const colLayer = src.layers.find((l) => l.name === 'Collision' && l.type === 'tilelayer');
  const pathsLayer = src.layers.find((l) => l.name === 'paths' && l.type === 'tilelayer');
  if (colLayer?.data) {
    // 1. Keep Cabacos Collision intact so fences, trees, cliffs & houses cannot be walked through,
    //    and explicitly block roof edges that lacked collision in upstream TMJ.
    for (let x = 20; x <= 27; x += 1) {
      colLayer.data[33 * src.width + x] = 66; // tool_shop red roof north edge
    }
    colLayer.data[34 * src.width + 45] = 66; // green-roofed house east roof/chimney edge
    colLayer.data[35 * src.width + 45] = 66;

    // 2. Extend east wooden harbor pier cleanly all the way to east map boundary (x=78..85, y=31..33)
    const pierRowGids = { 31: 295, 32: 359, 33: 423 };
    for (let y = 31; y <= 33; y += 1) {
      for (let x = 78; x < src.width; x += 1) {
        const i = y * src.width + x;
        colLayer.data[i] = 0;
        if (pathsLayer?.data && (pathsLayer.data[i] ?? 0) === 0) {
          pathsLayer.data[i] = pierRowGids[y];
        }
      }
    }

    // 3. Clear ONLY exact doorway thresholds, return sidewalk spawns & gate trails (never overlap roofs or fences)
    const clearAprons = [
      [32, 24, 33, 25], // seed_shop door & return spawn (32,25)
      [28, 36, 30, 37], // tool_shop door (28,36) & return spawn (30,36) — keeps (27,35) red roof blocked
      [15, 32, 16, 34], // crop_market door & return spawn (16,34)
      [33, 13, 34, 15], // town_hall door & return spawn (34,15)
      [41, 30, 44, 31], // player_house_door & open road beside garden portal (44,31)
      [1, 29, 3, 30],   // village-to-farm west road
      [12, 1, 13, 4],   // village-to-forest north trail
    ];
    for (const [x0, y0, x1, y1] of clearAprons) {
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          if (x >= 0 && y >= 0 && x < src.width && y < src.height) {
            colLayer.data[y * src.width + x] = 0;
          }
        }
      }
    }
  }

  src.layers = src.layers.filter((l) => l.name !== 'Portals' && l.name !== 'Interactables' && l.name !== 'NPCSpawns');
  src.layers.push(portals, interactables, npcs);
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

const INTERIOR_SPECS = [
  {
    donorFile: 'Seed_shop.tmj',
    outFile: 'shop_seed.json',
    mapId: 'shop_seed',
    imageFile: 'seed_shop_sunnyside_style_384x288.png',
    textureKey: 'donor-cabacos-seed-shop',
    villageDoor: 'player_seed_shop_door',
    exitName: 'player_seed_shop_exit',
    counterName: 'seed_shop',
    counterTargetId: 'cabacos_player_seed_shop_door',
    counterKind: 'shop_npc',
    counterLabel: 'Quầy hạt giống — Bác Hai',
    portalExitId: 'shop-seed-to-village',
    portalEnterId: 'village-to-shop-seed',
  },
  {
    donorFile: 'tool_shop.tmj',
    outFile: 'shop_tool.json',
    mapId: 'shop_tool',
    imageFile: 'tool_shop_sunnyside_style_384x288.png',
    textureKey: 'donor-cabacos-tool-shop',
    villageDoor: 'player_tool_shop_door',
    exitName: 'player_tool_shop_exit',
    counterName: 'tool_shop',
    counterTargetId: 'cabacos_interior_tool_shop_counter',
    counterKind: 'shop_npc',
    counterLabel: 'Quầy dụng cụ',
    portalExitId: 'shop-tool-to-village',
    portalEnterId: 'village-to-shop-tool',
  },
  {
    donorFile: 'Crop_market.tmj',
    outFile: 'shop_crop_market.json',
    mapId: 'shop_crop_market',
    imageFile: 'crop_market_sem_fundo.png',
    textureKey: 'donor-cabacos-crop-market',
    villageDoor: 'player_crop_market_door',
    exitName: 'player_crop_market_exit',
    counterName: 'crop_market',
    counterTargetId: 'cabacos_player_crop_market_door',
    counterKind: 'shop_npc',
    counterLabel: 'Quầy chợ nông sản',
    portalExitId: 'shop-crop-market-to-village',
    portalEnterId: 'village-to-shop-crop-market',
  },
  {
    donorFile: 'Town_hall.tmj',
    outFile: 'shop_town_hall.json',
    mapId: 'shop_town_hall',
    imageFile: 'town_hall_sem_fundo.png',
    textureKey: 'donor-cabacos-town-hall',
    villageDoor: 'player_town_hall_door',
    exitName: 'player_town_hall_exit',
    counterName: 'town_hall_buy_farms',
    counterTargetId: 'cabacos_interior_town_hall_counter',
    counterKind: 'bench',
    counterLabel: 'Bản đồ mua ruộng — chưa mở',
    portalExitId: 'shop-town-hall-to-village',
    portalEnterId: 'village-to-shop-town-hall',
  },
];

const VILLAGE_DOOR_SPAWN = {
  player_seed_shop_door: { tileX: 32, tileY: 25 },
  player_tool_shop_door: { tileX: 30, tileY: 36 },
  player_crop_market_door: { tileX: 16, tileY: 34 },
  player_town_hall_door: { tileX: 34, tileY: 15 },
};

function findInteractionObject(interior, name) {
  const layer = interior.layers.find((l) => l.name === 'Interactions' && l.type === 'objectgroup');
  return layer?.objects?.find((o) => o.name === name);
}

function exportCabacosImageInterior(spec) {
  const interior = loadJson(spec.donorFile);
  const w = interior.width ?? 24;
  const h = interior.height ?? 18;
  const blocked = bakeObjectCollision(interior, ['Collision']);
  const exitObj = findInteractionObject(interior, spec.exitName);
  const counterObj = findInteractionObject(interior, spec.counterName);
  if (exitObj) {
    const x0 = Math.floor(exitObj.x / TW);
    const y0 = Math.floor(exitObj.y / TW);
    const x1 = Math.ceil((exitObj.x + exitObj.width) / TW);
    const y1 = Math.ceil((exitObj.y + exitObj.height) / TW);
    for (let ty = y0; ty < y1; ty += 1) {
      for (let tx = x0; tx < x1; tx += 1) {
        blocked.delete(`${tx},${ty}`);
      }
    }
  }
  const collision = new Array(w * h).fill(0);
  for (const key of blocked) {
    const [tx, ty] = key.split(',').map(Number);
    if (tx < w && ty < h) collision[ty * w + tx] = 1;
  }
  const villageSpawn = VILLAGE_DOOR_SPAWN[spec.villageDoor] ?? { tileX: 32, tileY: 25 };
  const interiorSpawn = exitObj
    ? {
        tileX: Math.min(w - 2, Math.max(1, Math.floor((exitObj.x + exitObj.width / 2) / TW))),
        tileY: Math.min(h - 2, Math.max(1, Math.floor(exitObj.y / TW) - 1)),
      }
    : { tileX: 11, tileY: 16 };

  const portalObjects = [
    {
      id: 1,
      name: spec.portalExitId,
      type: 'portal',
      x: exitObj?.x ?? (w - 3) * TW,
      y: exitObj?.y ?? (h - 2) * TW,
      width: exitObj?.width ?? TW * 2,
      height: exitObj?.height ?? TW,
      properties: [
        { name: 'targetMapId', type: 'string', value: 'village' },
        { name: 'labelVi', type: 'string', value: 'Ra làng' },
        { name: 'spawnX', type: 'int', value: villageSpawn.tileX },
        { name: 'spawnY', type: 'int', value: villageSpawn.tileY },
      ],
    },
  ];
  const interactables = [];
  if (counterObj) {
    interactables.push({
      id: 2,
      name: spec.counterTargetId,
      type: 'interactable',
      x: counterObj.x,
      y: counterObj.y,
      width: counterObj.width ?? TW * 4,
      height: counterObj.height ?? TW * 2,
      properties: [
        { name: 'kind', type: 'string', value: spec.counterKind },
        { name: 'labelVi', type: 'string', value: spec.counterLabel },
        { name: 'maxRadiusPx', type: 'int', value: 72 },
        { name: 'donorPlayable', type: 'bool', value: spec.counterKind === 'shop_npc' },
        { name: 'anchorId', type: 'string', value: spec.counterName },
      ],
    });
  }

  const imagelayer = interior.layers.find((l) => l.type === 'imagelayer');
  const out = {
    compressionlevel: -1,
    height: h,
    width: w,
    infinite: false,
    layers: [
      {
        id: 1,
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
        id: 2,
        name: 'Portals',
        type: 'objectgroup',
        visible: true,
        opacity: 1,
        draworder: 'topdown',
        x: 0,
        y: 0,
        objects: portalObjects,
      },
      {
        id: 3,
        name: 'Interactables',
        type: 'objectgroup',
        visible: true,
        opacity: 1,
        draworder: 'topdown',
        x: 0,
        y: 0,
        objects: interactables,
      },
    ],
    nextlayerid: 5,
    nextobjectid: 10,
    orientation: 'orthogonal',
    properties: [
      { name: 'mapId', type: 'string', value: spec.mapId },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorInterior', type: 'string', value: spec.donorFile },
      { name: 'olwDonorSha', type: 'string', value: '79e423defc12bd99327cfcc28bf7ec0085996244' },
      { name: 'olwShopRender', type: 'string', value: 'image' },
      { name: 'olwDonorInteriorTextureKey', type: 'string', value: spec.textureKey },
      { name: 'olwDonorInteriorImage', type: 'string', value: `/maps/donor/cabacos/${spec.imageFile}` },
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
      { name: 'olwDefaultSpawnTileX', type: 'int', value: interiorSpawn.tileX },
      { name: 'olwDefaultSpawnTileY', type: 'int', value: interiorSpawn.tileY },
    ],
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TW,
    tilesets: [
      {
        columns: 1,
        firstgid: 1,
        image: '/maps/donor/cabacos/ts_map.png',
        imageheight: 16,
        imagewidth: 16,
        margin: 0,
        name: 'olw_collision_stub',
        spacing: 0,
        tilecount: 1,
        tileheight: TW,
        tilewidth: TW,
      },
    ],
    tilewidth: TW,
    type: 'map',
    version: '1.10',
  };
  if (imagelayer) {
    out.properties.push({ name: 'olwDonorImageLayer', type: 'string', value: path.basename(imagelayer.image) });
  }
  writeJson(spec.outFile, out);
  console.log(`Wrote ${spec.outFile} ← ${spec.donorFile} (image interior, ${w}×${h})`);
}

function exportAllCabacosShopInteriors() {
  for (const spec of INTERIOR_SPECS) {
    exportCabacosImageInterior(spec);
  }
  const seed = JSON.parse(fs.readFileSync(path.join(OUT_MAPS, 'shop_seed.json'), 'utf8'));
  const shopLegacy = structuredClone(seed);
  shopLegacy.properties = shopLegacy.properties.map((p) =>
    p.name === 'mapId' ? { ...p, value: 'shop' } : p,
  );
  writeJson('shop.json', shopLegacy);
  console.log('Wrote shop.json (alias of shop_seed for barn route)');
}

function exportShopInterior() {
  if (MAP_RECOVERY_MODE) {
    exportAllCabacosShopInteriors();
    return;
  }
  exportShopInteriorCasaPlayer();
}

exportVillage();
exportShopInterior();