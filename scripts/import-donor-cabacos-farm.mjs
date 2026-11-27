/**
 * Cabacos farm deep reuse: crop overworld art into 64×56 farm.json + 184-plot soil overlay.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  paintFarmPlotRegionsFromContract,
  validateFarmPlotContract,
} from './lib/preserveFarmPlotContract.mjs';
import { MAP_RECOVERY_MODE, RECOVERY_SLICE } from './lib/mapRecoveryMode.mjs';

const CABACOS = path.resolve('public/maps/donor/cabacos/Cabacos_map.tmj');
const OUT = path.resolve('src/assets/maps/farm.json');
const OLW_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';

const OUT_W = 64;
const OUT_H = 56;
/** Crop window on Cabacos overworld (farm3 + barn cluster). */
const CROP_OX = 2;
const CROP_OY = 2;

const VISUAL_LAYERS = [
  'land',
  'paths',
  'farm',
  'farm2',
  'farm3',
  'shadows',
  'decoration_01',
  'building',
  'seeds_market',
  'wells',
  'decoration_02',
  'decoration_03',
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

const COZY_FIRST_GID = 4097 + 180;

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

function copyObjectLayers(baseline, outH, outW) {
  return baseline.layers.filter((l) => l.type === 'objectgroup');
}

function copyCollisionLayer(baseline, outW, outH) {
  const col = baseline.layers.find((l) => l.name === 'Collision' && l.type === 'tilelayer');
  if (!col?.data) {
    return {
      id: 6,
      name: 'Collision',
      type: 'tilelayer',
      visible: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: outW,
      height: outH,
      data: new Array(outW * outH).fill(0),
    };
  }
  return {
    ...col,
    width: outW,
    height: outH,
    data: col.data.length === outW * outH ? [...col.data] : cropLayer(col.data, baseline.width, baseline.height, 0, 0, outW, outH),
  };
}

function buildDeepFarmMap() {
  const cab = loadJson(CABACOS);
  const baseline = fs.existsSync(OUT) ? loadJson(OUT) : null;
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

  const collision = baseline ? copyCollisionLayer(baseline, OUT_W, OUT_H) : copyCollisionLayer({ width: OUT_W, height: OUT_H, layers: [] }, OUT_W, OUT_H);
  collision.id = id++;
  collision.visible = false;

  const objectLayers = baseline ? copyObjectLayers(baseline) : [];

  const cozySoil = MAP_RECOVERY_MODE
    ? null
    : {
        id: id++,
        name: 'OLW_ContractSoil',
        type: 'tilelayer',
        visible: true,
        opacity: 0.92,
        x: 0,
        y: 0,
        width: OUT_W,
        height: OUT_H,
        data: new Array(OUT_W * OUT_H).fill(0),
        properties: [{ name: 'gamemaker_depth', type: 'int', value: -8000 }],
      };

  const map = {
    compressionlevel: -1,
    height: OUT_H,
    width: OUT_W,
    infinite: false,
    layers: [...tileLayers, collision, ...(cozySoil ? [cozySoil] : []), ...objectLayers],
    nextlayerid: id + 5,
    nextobjectid: 100,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: 16,
    tilewidth: 16,
    tilesets: [
      ...CABACOS_TILESETS,
      {
        columns: 16,
        firstgid: COZY_FIRST_GID,
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
    properties: [
      { name: 'mapId', type: 'string', value: 'farm' },
      { name: 'olwDonor', type: 'string', value: 'cabacos' },
      { name: 'olwDonorSha', type: 'string', value: OLW_SHA },
      { name: 'olwDonorSketch', type: 'string', value: MAP_RECOVERY_MODE ? 'farm-recovery-native' : 'farm-v1-deep' },
      { name: 'olwDonorCrop', type: 'string', value: `${CROP_OX},${CROP_OY},${OUT_W},${OUT_H}` },
      ...(MAP_RECOVERY_MODE
        ? [
            { name: 'olwRecovery', type: 'string', value: RECOVERY_SLICE },
            { name: 'olwFarmNativeSoil', type: 'bool', value: true },
          ]
        : []),
    ],
  };

  if (cozySoil) {
    paintFarmPlotRegionsFromContract(map, { layerName: 'OLW_ContractSoil', layerId: cozySoil.id });
  }

  const interactables = map.layers.find((l) => l.name === 'Interactables');
  if (interactables) {
    const sign = interactables.objects.find((o) => o.name === 'farm_donor_cabacos_sign');
    if (sign) {
      const label = sign.properties?.find((p) => p.name === 'labelVi');
      if (label) label.value = 'Trang trại Cabacos — luống 184 (donor)';
    }
  }

  return map;
}

function main() {
  const map = buildDeepFarmMap();
  const check = validateFarmPlotContract(map);
  if (!check.ok) {
    console.error('Farm contract validation failed:', check.errors);
    if (MAP_RECOVERY_MODE && check.errors.every((e) => e.includes('migration pending'))) {
      console.warn('MAP_RECOVERY: 184 plot IDs kept; Cabacos soil anchor migration pending — writing map anyway');
    } else {
      process.exit(1);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.log(
    `Wrote farm.json Cabacos deep reuse layers=${map.layers.length} plots=${check.plotCount} walkable=${check.walkable}`,
  );
}

main();