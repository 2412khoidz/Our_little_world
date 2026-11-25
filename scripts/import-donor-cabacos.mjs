/**
 * Vendors Cabacos overworld + Casa_player interior into OLW Tiled JSON.
 * Upstream: goncalojbsousa/Farming-Simulator-Cabacos @ 79e423d (MIT).
 */
import fs from 'node:fs';
import path from 'node:path';

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
        { name: 'labelVi', type: 'string', value: '→ Gull Bay (bãi biển donor)' },
        { name: 'maxRadiusPx', type: 'int', value: 64 },
        { name: 'donorPlayable', type: 'bool', value: true },
      ],
    },
    {
      id: nextId + 2,
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

function exportShopInterior() {
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

exportVillage();
exportShopInterior();