/**
 * PyDew Valley full farm transplant → public/assets/maps/farm.json (64×64 native, no Cabacos overlay).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadTmxAsTiledJson } from './lib/tmxToTiledJson.mjs';
import { validateFarmPlotContract } from './lib/preserveFarmPlotContract.mjs';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const TMX = path.resolve('public/maps/donor/pydew-valley/data/map.tmx');
const OUT = path.resolve('src/assets/maps/farm.json');
const CONTRACT_PATH = path.resolve('src/shared/world/farmPlotContract.v1.json');
const SHA = fs
  .readFileSync(path.resolve('public/maps/donor/pydew-valley/UPSTREAM_SHA.txt'), 'utf8')
  .trim();

const SKIP_RENDER_LAYERS = new Set(['Farmable']);
const OLW_OBJECT_LAYERS = ['Portals', 'Interactables'];

function farmableTiles(map) {
  const layer = map.layers.find((l) => l.name === 'Farmable' && l.type === 'tilelayer');
  if (!layer?.data) return [];
  const tiles = [];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const gid = layer.data[y * map.width + x] ?? 0;
      if (gid > 0) tiles.push({ x, y, gid });
    }
  }
  tiles.sort((a, b) => a.y - b.y || a.x - b.x);
  return tiles;
}

function migratePlotContract(farmable, mapSize, spawnTile) {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  if (farmable.length < 184) {
    throw new Error(`Farmable tiles ${farmable.length} < 184`);
  }
  const mainTiles = farmable.slice(0, 120);
  const annexTiles = farmable.slice(120, 184);

  contract.mapSizeTiles = { width: mapSize.width, height: mapSize.height };
  contract.contractVersion = '1.0.2';
  contract.defaultSpawnTile = spawnTile;
  contract.plotRegions = [
    {
      id: 'farm_main',
      labelVi: 'Ruộng chính',
      originTileX: mainTiles[0].x,
      originTileY: mainTiles[0].y,
      columns: 12,
      rows: 10,
    },
    {
      id: 'farm_annex',
      labelVi: 'Ruộng phụ',
      originTileX: annexTiles[0].x,
      originTileY: annexTiles[0].y,
      columns: 8,
      rows: 8,
    },
  ];
  contract.plotAnchors = [
    ...mainTiles.map((t, i) => ({
      anchorId: `farm_main_${i}`,
      regionId: 'farm_main',
      tileX: t.x,
      tileY: t.y,
    })),
    ...annexTiles.map((t, i) => ({
      anchorId: `farm_annex_${i}`,
      regionId: 'farm_annex',
      tileX: t.x,
      tileY: t.y,
    })),
  ];

  fs.writeFileSync(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`);
  return contract;
}

function playerSpawnFromTmx(map) {
  const player = map.layers.find((l) => l.name === 'Player' && l.type === 'objectgroup');
  const start = player?.objects?.find((o) => o.name === 'Start');
  if (!start) return { tileX: 24, tileY: 27 };
  return {
    tileX: Math.floor(start.x / map.tilewidth),
    tileY: Math.floor(start.y / map.tileheight),
  };
}

function buildOlwObjectLayers(map, spawn) {
  const tw = map.tilewidth;
  const portals = {
    id: 900,
    name: 'Portals',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 901,
        name: 'farm-to-village',
        type: 'portal',
        x: 0,
        y: spawn.tileY * tw,
        width: tw,
        height: tw * 2,
        properties: [
          { name: 'targetMapId', type: 'string', value: 'village' },
          { name: 'spawnX', type: 'int', value: 2 },
          { name: 'spawnY', type: 'int', value: 20 },
          { name: 'labelVi', type: 'string', value: 'Về làng' },
        ],
      },
    ],
  };

  const trader = map.layers
    .find((l) => l.name === 'Player' && l.type === 'objectgroup')
    ?.objects?.find((o) => o.name === 'Trader');
  const traderTileX = trader ? Math.floor(trader.x / tw) : 14;
  const traderTileY = trader ? Math.floor(trader.y / tw) : 5;

  const interactables = {
    id: 910,
    name: 'Interactables',
    type: 'objectgroup',
    visible: true,
    opacity: 1,
    draworder: 'topdown',
    x: 0,
    y: 0,
    objects: [
      {
        id: 911,
        name: 'farm_shipping_bin',
        type: 'interactable',
        x: traderTileX * tw,
        y: traderTileY * tw,
        width: tw,
        height: tw,
        properties: [
          { name: 'kind', type: 'string', value: 'shipping_bin' },
          { name: 'anchorId', type: 'string', value: 'farm_shipping_bin' },
          { name: 'labelVi', type: 'string', value: 'Thùng gom hàng — bán qua đêm (V0.2)' },
          { name: 'maxRadiusPx', type: 'int', value: 72 },
        ],
      },
      {
        id: 912,
        name: 'farm_pond_water',
        type: 'interactable',
        x: 32 * tw,
        y: 8 * tw,
        width: tw,
        height: tw,
        properties: [
          { name: 'kind', type: 'string', value: 'water_source' },
          { name: 'anchorId', type: 'string', value: 'farm_pond_water' },
          { name: 'labelVi', type: 'string', value: 'Ao nước — múc nước tưới' },
          { name: 'maxRadiusPx', type: 'int', value: 80 },
        ],
      },
      {
        id: 913,
        name: 'farm_barn_mill',
        type: 'interactable',
        x: 18 * tw,
        y: 22 * tw,
        width: tw,
        height: tw,
        properties: [
          { name: 'kind', type: 'string', value: 'workshop_building' },
          { name: 'anchorId', type: 'string', value: 'farm_barn_mill' },
          { name: 'labelVi', type: 'string', value: 'Xưởng ruộng — cối Meadowbrook' },
          { name: 'maxRadiusPx', type: 'int', value: 72 },
          { name: 'donorPlayable', type: 'bool', value: true },
          { name: 'workshopFocus', type: 'string', value: 'mill' },
        ],
      },
      {
        id: 915,
        name: 'farm_barn_door',
        type: 'interactable',
        x: 19 * tw,
        y: 22 * tw,
        width: tw,
        height: tw,
        properties: [
          { name: 'kind', type: 'string', value: 'door' },
          { name: 'anchorId', type: 'string', value: 'farm_barn_door' },
          { name: 'labelVi', type: 'string', value: 'Vào cửa hàng Bác Hai' },
          { name: 'maxRadiusPx', type: 'int', value: 72 },
        ],
      },
      {
        id: 914,
        name: 'farm_donor_pydew_sign',
        type: 'interactable',
        x: spawn.tileX * tw,
        y: (spawn.tileY - 1) * tw,
        width: tw * 2,
        height: tw,
        properties: [
          { name: 'kind', type: 'string', value: 'crop_plot' },
          { name: 'labelVi', type: 'string', value: 'Trang trại PyDew Valley — 184 luống (donor)' },
          { name: 'maxRadiusPx', type: 'int', value: 96 },
        ],
      },
    ],
  };

  return [portals, interactables];
}

function main() {
  if (!fs.existsSync(TMX)) {
    console.error('Missing', TMX, '— run: node scripts/vendor-donor-pydew-valley.mjs');
    process.exit(1);
  }

  const base = loadTmxAsTiledJson(TMX);
  const farmable = farmableTiles(base);
  const spawn = playerSpawnFromTmx(base);
  migratePlotContract(farmable, base, spawn);

  const farmableLayer = base.layers.find((l) => l.name === 'Farmable' && l.type === 'tilelayer');
  if (farmableLayer) {
    farmableLayer.visible = false;
  }

  const tileLayers = base.layers.filter((l) => l.type === 'tilelayer');
  const collision = base.layers.find((l) => l.name === 'Collision');
  if (collision) {
    collision.visible = false;
  }

  const objectLayers = buildOlwObjectLayers(base, spawn);

  const map = {
    ...base,
    layers: [...tileLayers, ...objectLayers],
    nextlayerid: 1000,
    nextobjectid: 2000,
    properties: [
      { name: 'mapId', type: 'string', value: 'farm' },
      { name: 'olwDonor', type: 'string', value: 'pydew-valley' },
      { name: 'olwDonorSha', type: 'string', value: SHA },
      { name: 'olwDonorSketch', type: 'string', value: 'pydew-valley-tmx-v1' },
      { name: 'olwDonorSource', type: 'string', value: 'data/map.tmx' },
      { name: 'olwFarmNativeSoil', type: 'bool', value: true },
      { name: 'olwTilePixelSize', type: 'int', value: base.tilewidth },
      { name: 'olwDefaultSpawnTileX', type: 'int', value: spawn.tileX },
      { name: 'olwDefaultSpawnTileY', type: 'int', value: spawn.tileY },
      { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
    ],
  };

  const check = validateFarmPlotContract(map);
  if (!check.ok) {
    console.error('Farm contract validation failed:', check.errors);
    process.exit(1);
  }

  fs.writeFileSync(OUT, `${JSON.stringify(map, null, 2)}\n`);
  console.log(
    `Wrote farm.json PyDew ${map.width}×${map.height} @ ${map.tilewidth}px plots=${check.plotCount} walkable=${check.walkable}`,
  );
  console.log(`Default spawn tile ≈ ${spawn.tileX},${spawn.tileY}`);
}

main();