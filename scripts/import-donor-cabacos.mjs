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
        x: 26 * TW,
        y: 0 * TW,
        width: TW * 2,
        height: TW * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'garden' },
          { name: 'labelVi', type: 'string', value: 'Về Vườn nhà' },
          { name: 'spawnX', type: 'int', value: 8 },
          { name: 'spawnY', type: 'int', value: 11 },
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
        player_house_door: 'Nhà cộng đồng làng — đọc sách & nghỉ chân',
      }
    : {
        player_house_door: 'Nhà cộng đồng làng — đọc sách & nghỉ chân',
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
              value: 'Đi cầu gỗ phía Bắc là về Vườn nhà và Nông trại 184 luống (thêm lối lên Rừng thông ở phía Bắc ruộng), còn hướng Đông qua bến tàu tới Vịnh Hải Âu!',
            },
          ],
        },
    ],
  };

  const colLayer = src.layers.find((l) => l.name === 'Collision' && l.type === 'tilelayer');
  const pathsLayer = src.layers.find((l) => l.name === 'paths' && l.type === 'tilelayer');
  const landLayer = src.layers.find((l) => l.name === 'land' && l.type === 'tilelayer');
  const bldLayer = src.layers.find((l) => l.name === 'building' && l.type === 'tilelayer');
  const dec1Layer = src.layers.find((l) => l.name === 'decoration_01' && l.type === 'tilelayer');
  const dec2Layer = src.layers.find((l) => l.name === 'decoration_02' && l.type === 'tilelayer');
  const dec3Layer = src.layers.find((l) => l.name === 'decoration_03' && l.type === 'tilelayer');
  const seedsMarketLayer = src.layers.find((l) => l.name === 'seeds_market' && l.type === 'tilelayer');
  const buyFarm2Layer = src.layers.find((l) => l.name === 'buy_farm2' && l.type === 'tilelayer');
  const buyFarm3Layer = src.layers.find((l) => l.name === 'buy_farm3' && l.type === 'tilelayer');
  const wellsLayer = src.layers.find((l) => l.name === 'wells' && l.type === 'tilelayer');
  const wallsLayer = src.layers.find((l) => l.name === 'walls' && l.type === 'tilelayer');
  const clouds1Layer = src.layers.find((l) => l.name === 'clouds_01' && l.type === 'tilelayer');
  const clouds2Layer = src.layers.find((l) => l.name === 'clouds_02' && l.type === 'tilelayer');
  const cloudShadowLayer = src.layers.find((l) => l.name === 'cloud_shadow' && l.type === 'tilelayer');
  if (colLayer?.data) {
    // Explicit solid prop GIDs verified on Cabacos ts_map (fences, stalls, vases, crates, trees, rocks, graves)
    const EXPLICIT_SOLID_PROP_GIDS = new Set([
      40, // wooden bridge south railing
      167, 168, 169, 170, 171, // wooden fences & bridge north railings
      109, 110, 111, 112, 174, 176, 233, 237, 301, 302, // stone walls & vertical wooden fence posts
      352, 353, 436, 437, 156, 284, 285, // tree stumps, pine trees, green bushes
      615, 616, 617, 678, 679, 680, 681, 741, 743, // harbor crates, trims & beach shack walls/roof
      877, 879, 956, 1522, 1524, 1527, 1592, 1848, 2227, 2600, 2834, // signs, tables, boulders, lanterns, mailbox, beams
      2470, 2471, 2472, 2726, 2727, 2728, // red market stall counters & awning posts
      1266, 1268, 1269, 1331, 1332, 1333, 1765, // blue water jars, terracotta amphorae, wooden crates
      114, 115, 178, 179, 242, 243, 306, 307, 308, 309, 371, 373, 435, 500, 501, 564, 565, 695, 702, // trees, trunks, bushes
      234, 742, 819, 880, 892, 921, 989, 1011, 1068, 1072, 1121, 1122, 1123, 1132, 1133, 1134, 1135, 1136, 1139,
      1501, 1586, 1587, 1588, 1589, 1590, 1591, 1780, 1781, 1844, 1845, 1906, 1907, 1908, 1909, 1911, 1938,
      1970, 1971, 1972, 1973, 1974, 1975, 2226, 2898, // rocks, boulders, stumps, gravestones, barrels, benches, posts
    ]);
    // Flat open grass/sand interior tiles where any leftover upstream blocker with no solid prop is an invisible wall
    const WALKABLE_FLAT_LAND_GIDS = new Set([70, 130, 131, 132, 133, 134, 135, 194, 195, 197, 198, 199, 258, 260]);
    // Bridge floor / pier / ladder / archway building GIDs that MUST stay walkable on roads (2320,2321,2386 removed: solid walls/pillars!)
    const WALKABLE_BLD_OR_PATH_GIDS = new Set([0, 1, 649, 1501, 2128, 2129, 2204, 2322, 2448, 2449, 2520, 2525]);
    const RIVER_BANK_LAND_GIDS = new Set([471, 472, 473, 474, 475, 476, 535, 537, 539, 540, 541, 546, 547]);
    const CLIFF_WALL_LAND_GIDS = new Set([148, 149, 204, 267, 268, 340, 341, 342, 404]);
    const BRIDGE_PATH_GIDS = new Set([295, 359, 423, 745, 809]);
    const WALKABLE_OVER_WATER_PATH_GIDS = new Set([359, 361, 425, 745, 809]);
    const CLIMBABLE_LADDER_DEC1_GIDS = new Set([747, 811, 875]);

    for (let i = 0; i < colLayer.data.length; i += 1) {
      const tx = i % src.width;
      const ty = Math.floor(i / src.width);
      const pathGid = (pathsLayer?.data?.[i] ?? 0) & 0x1fffffff;
      const landGid = (landLayer?.data?.[i] ?? 0) & 0x1fffffff;
      const bldGid = (bldLayer?.data?.[i] ?? 0) & 0x1fffffff;
      const smGid = (seedsMarketLayer?.data?.[i] ?? 0) & 0x1fffffff;
      const bf2Gid = (buyFarm2Layer?.data?.[i] ?? 0) & 0x1fffffff;
      const bf3Gid = (buyFarm3Layer?.data?.[i] ?? 0) & 0x1fffffff;
      const dec1Gid = (dec1Layer?.data?.[i] ?? 0) & 0x1fffffff;
      const dec2Gid = (dec2Layer?.data?.[i] ?? 0) & 0x1fffffff;
      const dec3Gid = (dec3Layer?.data?.[i] ?? 0) & 0x1fffffff;
      const wellGid = (wellsLayer?.data?.[i] ?? 0) & 0x1fffffff;
      const wallGid = (wallsLayer?.data?.[i] ?? 0) & 0x1fffffff;

      // Ground-backed wooden ladders on cliff faces MUST remain climbable
      if (CLIMBABLE_LADDER_DEC1_GIDS.has(dec1Gid) && landGid > 1) {
        colLayer.data[i] = 0;
        continue;
      }

      // Water/river channel/void tiles without explicit bridge/pier deck planks, plus sheer cliff walls without paths/ladders, block player & pet
      if (
        ((RIVER_BANK_LAND_GIDS.has(landGid) || (landGid <= 1 && !(pathGid >= 450 && pathGid <= 550 && bldGid === 649))) && !WALKABLE_OVER_WATER_PATH_GIDS.has(pathGid)) ||
        (CLIFF_WALL_LAND_GIDS.has(landGid) && pathGid <= 1)
      ) {
        colLayer.data[i] = 66;
        continue;
      }

      const hasSolidProp =
        !WALKABLE_BLD_OR_PATH_GIDS.has(bldGid) ||
        smGid > 1 ||
        bf2Gid === 880 ||
        bf3Gid === 880 ||
        wellGid > 1 ||
        wallGid > 1 ||
        EXPLICIT_SOLID_PROP_GIDS.has(dec1Gid) ||
        EXPLICIT_SOLID_PROP_GIDS.has(dec2Gid) ||
        EXPLICIT_SOLID_PROP_GIDS.has(dec3Gid);

      if (hasSolidProp) {
        colLayer.data[i] = 66;
      } else if (
        tx > 0 &&
        ty > 0 &&
        tx < src.width - 1 &&
        ty < src.height - 1 &&
        WALKABLE_FLAT_LAND_GIDS.has(landGid) &&
        bf2Gid <= 1 &&
        bf3Gid <= 1
      ) {
        // Clear phantom invisible wall blockers that upstream TMJ placed on flat interior grass/sand
        colLayer.data[i] = 0;
      }
    }

    // Explicitly block roof overhangs that lacked collision in upstream TMJ
    for (let x = 20; x <= 27; x += 1) {
      colLayer.data[33 * src.width + x] = 66; // tool_shop red roof north edge
    }
    colLayer.data[34 * src.width + 45] = 66; // green-roofed house east roof/chimney edge
    colLayer.data[35 * src.width + 45] = 66;

    // 2. Extend east wooden harbor pier cleanly all the way to east map boundary (x=78..85, y=31..33):
    // Keep solid main deck planks y=32 (359) & vertical spine x=80 y=29..34 (361/425) open; block over-water pilings y=33 (423) & north rail y=31 (x>=81, x=79)!
    const pierRowGids = { 31: 295, 32: 359, 33: 423 };
    for (let y = 31; y <= 33; y += 1) {
      for (let x = 78; x < src.width; x += 1) {
        const i = y * src.width + x;
        if (pathsLayer?.data && (pathsLayer.data[i] ?? 0) === 0) {
          pathsLayer.data[i] = pierRowGids[y];
        }
        const isWalkablePier = y === 32 || x === 80 || (x === 78 && (y === 31 || y === 33));
        colLayer.data[i] = isWalkablePier ? 0 : 66;
      }
    }

    // 2b. Build clean 2-wide North Wooden Causeway Bridge at x=26..27, y=0..15 connecting plaza (26..27, 16) to Garden
    for (let y = 0; y <= 15; y += 1) {
      for (let x = 24; x <= 28; x += 1) {
        const i = y * src.width + x;
        if (clouds1Layer?.data) clouds1Layer.data[i] = 0;
        if (clouds2Layer?.data) clouds2Layer.data[i] = 0;
        if (cloudShadowLayer?.data) cloudShadowLayer.data[i] = 0;
        if (x >= 25 && x <= 28) {
          if (bldLayer?.data) bldLayer.data[i] = 0;
          if (dec2Layer?.data) dec2Layer.data[i] = 0;
          if (dec1Layer?.data) dec1Layer.data[i] = 0;
        }
      }
      const leftIdx = y * src.width + 25;
      if (pathsLayer?.data) pathsLayer.data[leftIdx] = y === 15 ? 744 : 808;
      if (dec1Layer?.data) dec1Layer.data[leftIdx] = y === 15 ? 105 : 233;
      colLayer.data[leftIdx] = 66;

      for (const bx of [26, 27]) {
        const idxB = y * src.width + bx;
        if (pathsLayer?.data) pathsLayer.data[idxB] = y === 0 || y === 15 ? 745 : 809;
        colLayer.data[idxB] = 0;
      }

      const rightIdx = y * src.width + 28;
      if (pathsLayer?.data) pathsLayer.data[rightIdx] = y === 15 ? 746 : 810;
      if (dec1Layer?.data) dec1Layer.data[rightIdx] = y === 15 ? 105 : 233;
      colLayer.data[rightIdx] = 66;
    }

    // 3. Clear ONLY exact doorway thresholds, return spawns, bridges & climbable wooden ladders
    const clearAprons = [
      [32, 24, 33, 25], // seed_shop door & return spawn (32,25)
      [28, 36, 30, 37], // tool_shop door (28,36) & return spawn (30,36)
      [15, 32, 16, 34], // crop_market door & return spawn (16,34)
      [33, 14, 34, 15], // town_hall door & return spawn (34,15) — keeps blue roof (33,12..13) blocked
      [37, 31, 39, 32], // wooden river bridge planks
      [26, 15, 27, 17], // North Causeway Bridge southern plaza apron
      [46, 6, 46, 11],  // North cliff wooden ladder (reachable to top lookout)
      [27, 38, 27, 43], // South cliff wooden ladder (reachable to cave shore)
      [37, 14, 37, 21], // Mid hill wooden ladder
      [59, 8, 59, 12],  // NE plateau ladder
      [60, 12, 60, 18], // NE cliff double ladder
      [64, 31, 65, 35], // East harbor twin wooden ladders
      [68, 34, 68, 38], // East harbor beach ladder
      [7, 22, 8, 22],   // west bridge approach (8,22); keeps (9,21)/(9,23) rails & south cliff solid
      [41, 30, 44, 31], // community house front sidewalk & Bé Na path
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
    const isSolidBuildingAt = (tx, ty) => {
      if (!bldLayer?.data || tx < 0 || ty < 0 || tx >= src.width || ty >= src.height) return false;
      const g = (bldLayer.data[ty * src.width + tx] ?? 0) & 0x1fffffff;
      return !WALKABLE_BLD_OR_PATH_GIDS.has(g);
    };
    const roofData = new Array(src.width * src.height).fill(0);
    for (let y = 0; y < src.height; y += 1) {
      for (let x = 0; x < src.width; x += 1) {
        if (isSolidBuildingAt(x, y) && isSolidBuildingAt(x, y + 1) && !isSolidBuildingAt(x, y - 1)) {
          roofData[y * src.width + x] = bldLayer.data[y * src.width + x];
        }
      }
    }
    const maxLayerId = Math.max(...src.layers.map((l) => l.id ?? 0), 0);
    src.layers = src.layers.filter(
      (l) => l.name !== 'olw_roof_overhang' && l.name !== 'Elevation' && l.name !== 'ElevationTransitions',
    );
    const elevation = new Array(src.width * src.height).fill(0);
    const transitions = new Array(src.width * src.height).fill(0);
    const isLadderCell = (i) => CLIMBABLE_LADDER_DEC1_GIDS.has((dec1Layer?.data?.[i] ?? 0) & 0x1fffffff);
    const floodLevel = (seeds, level) => {
      const q = [];
      for (const [sx, sy] of seeds) {
        const si = sy * src.width + sx;
        if ((colLayer.data[si] ?? 0) === 0 && !isLadderCell(si) && elevation[si] === 0) {
          elevation[si] = level;
          q.push([sx, sy]);
        }
      }
      while (q.length > 0) {
        const [cx, cy] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= src.width || ny >= src.height) continue;
          const ni = ny * src.width + nx;
          if ((colLayer.data[ni] ?? 0) > 0 || isLadderCell(ni) || elevation[ni] !== 0) continue;
          elevation[ni] = level;
          q.push([nx, ny]);
        }
      }
    };
    floodLevel([[42, 31], [26, 0]], 2); // Main village plaza & causeway bridge
    floodLevel([[80, 32], [27, 43], [34, 40], [43, 41]], 1); // East beach/pier & southern shore
    floodLevel([[37, 14], [46, 12], [64, 15]], 3); // Mid-north hill plateau above cliff y=20
    floodLevel([[46, 6], [47, 5], [54, 4], [71, 11], [48, 3], [40, 5], [72, 18]], 4); // Upper lookouts

    // Connect climbable ladders strictly as transitions between adjacent terrace levels
    for (let i = 0; i < colLayer.data.length; i += 1) {
      if ((colLayer.data[i] ?? 0) === 0 && isLadderCell(i)) {
        transitions[i] = 1;
      }
    }
    // Resolve ladder column levels smoothly from top to bottom neighbor levels
    for (let x = 0; x < src.width; x += 1) {
      let y = 0;
      while (y < src.height) {
        const i = y * src.width + x;
        if ((colLayer.data[i] ?? 0) === 0 && isLadderCell(i)) {
          const startY = y;
          while (y + 1 < src.height && (colLayer.data[(y + 1) * src.width + x] ?? 0) === 0 && isLadderCell((y + 1) * src.width + x)) {
            y += 1;
          }
          const topElev = startY > 0 ? elevation[(startY - 1) * src.width + x] : 0;
          const botElev = y + 1 < src.height ? elevation[(y + 1) * src.width + x] : 0;
          const hi = Math.max(topElev, botElev, 1);
          const lo = botElev > 0 && topElev > 0 ? Math.min(topElev, botElev) : hi;
          const mid = Math.floor((startY + y) / 2);
          for (let ly = startY; ly <= y; ly += 1) {
            elevation[ly * src.width + x] = ly <= mid ? topElev || hi : botElev || lo;
          }
        }
        y += 1;
      }
    }
    // Fill any remaining tiny walkable side terraces adjacent to plaza/mid plateau at plaza level (2), block disconnected floating pockets
    for (let i = 0; i < colLayer.data.length; i += 1) {
      if ((colLayer.data[i] ?? 0) === 0 && elevation[i] === 0) {
        colLayer.data[i] = 66;
      }
    }

    // Verify elevation-aware BFS connectivity from village well plaza (42,31) to all portals, shops, & lookouts
    const reachSeen = new Set([31 * src.width + 42]);
    const reachQ = [[42, 31]];
    while (reachQ.length > 0) {
      const [cx, cy] = reachQ.shift();
      const ci = cy * src.width + cx;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= src.width || ny >= src.height) continue;
        const ni = ny * src.width + nx;
        if (reachSeen.has(ni) || (colLayer.data[ni] ?? 0) > 0) continue;
        if (elevation[ci] !== elevation[ni] && transitions[ci] === 0 && transitions[ni] === 0) continue;
        reachSeen.add(ni);
        reachQ.push([nx, ny]);
      }
    }
    const requiredTargets = [
      ['gardenPortal', 26, 0],
      ['seedDoor', 33, 24],
      ['townHall', 34, 15],
      ['upperLookout', 46, 6],
      ['cropDoor', 16, 33],
      ['toolDoor', 28, 36],
      ['eastPier', 78, 32],
    ];
    const disconnected = requiredTargets.filter(([, tx, ty]) => !reachSeen.has(ty * src.width + tx));
    if (disconnected.length > 0) {
      throw new Error(
        `village.json elevation reachability failed for: ${disconnected.map(([l, tx, ty]) => `${l}(${tx},${ty})`).join(', ')}`,
      );
    }

    // Seal tiny disconnected cliff-top pockets that lack ladders so reachable === walkable
    for (let i = 0; i < colLayer.data.length; i += 1) {
      if ((colLayer.data[i] ?? 0) === 0 && !reachSeen.has(i)) {
        colLayer.data[i] = 66;
        elevation[i] = 0;
        transitions[i] = 0;
      }
    }

    const portIdx = src.layers.findIndex((l) => l.name === 'Collision');
    const roofLayer = {
      id: maxLayerId + 1,
      name: 'olw_roof_overhang',
      type: 'tilelayer',
      width: src.width,
      height: src.height,
      data: roofData,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      properties: [{ name: 'olwDepth', type: 'int', value: 850 }],
    };
    const elevLayer = {
      id: maxLayerId + 2,
      name: 'Elevation',
      type: 'tilelayer',
      width: src.width,
      height: src.height,
      data: elevation,
      opacity: 1,
      visible: false,
      x: 0,
      y: 0,
    };
    const transLayer = {
      id: maxLayerId + 3,
      name: 'ElevationTransitions',
      type: 'tilelayer',
      width: src.width,
      height: src.height,
      data: transitions,
      opacity: 1,
      visible: false,
      x: 0,
      y: 0,
    };
    if (portIdx >= 0) src.layers.splice(portIdx, 0, roofLayer, elevLayer, transLayer);
    else src.layers.push(roofLayer, elevLayer, transLayer);
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
    npcSpawn: {
      id: 'bac_hai',
      tileX: 11,
      tileY: 6,
      role: 'seed_vendor',
      labelVi: 'Bác Hai',
      dialogueVi: 'Chào hai cháu ghé Tiệm Hạt Giống! Quầy hạt tươi lúc nào cũng sẵn sàng.',
    },
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
    npcSpawn: {
      id: 'chu_tu',
      tileX: 12,
      tileY: 9,
      role: 'tool_smith',
      labelVi: 'Chú Tư',
      dialogueVi: 'Mồi câu, cuốc, bình tưới vừa được chú đánh bóng — cần gì cứ chọn nhé!',
    },
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
    npcSpawn: {
      id: 'co_lan',
      tileX: 11,
      tileY: 6,
      role: 'bakery_host',
      labelVi: 'Cô Lan',
      dialogueVi: 'Chợ nông sản hôm nay nhộn nhịp ghê! Hai cháu mang rau quả hay cá tới đổi thưởng nhé.',
    },
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
    npcSpawn: {
      id: 'thi_truong',
      tileX: 12,
      tileY: 9,
      role: 'town_mayor',
      labelVi: 'Trưởng Làng Minh',
      dialogueVi: 'Chào hai cư dân mới của Làng Cabacos! Tòa Thị Chính luôn trân trọng từng góc nhà và luống rau hai bạn dựng xây.',
    },
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
      {
        id: 4,
        name: 'NPCSpawns',
        type: 'objectgroup',
        visible: true,
        opacity: 1,
        draworder: 'topdown',
        x: 0,
        y: 0,
        objects: spec.npcSpawn
          ? [
              {
                id: 5,
                name: spec.npcSpawn.id,
                type: 'npc',
                x: spec.npcSpawn.tileX * TW,
                y: spec.npcSpawn.tileY * TW,
                width: TW,
                height: TW,
                properties: [
                  { name: 'role', type: 'string', value: spec.npcSpawn.role },
                  { name: 'labelVi', type: 'string', value: spec.npcSpawn.labelVi },
                  { name: 'dialogueVi', type: 'string', value: spec.npcSpawn.dialogueVi },
                ],
              },
            ]
          : [],
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