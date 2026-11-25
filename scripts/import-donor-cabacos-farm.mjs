/**
 * Phase II sketch: Cabacos farm donor on OLW farm.json — keeps 184-plot contract.
 * Full Cabacos tileset render is follow-up (see docs/handover/FARM_DONOR_TRANSPLANT_SKETCH.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  FARM_CONTRACT,
  paintFarmPlotRegionsFromContract,
  validateFarmPlotContract,
} from './lib/preserveFarmPlotContract.mjs';

const OUT = path.resolve('public/assets/maps/farm.json');
const TW = 16;
const OLW_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';

const T = { pathA: 22, pathB: 23, hedge: 28, woodPlank: 24 };

function loadFarm() {
  return JSON.parse(fs.readFileSync(OUT, 'utf8'));
}

/** Donor-inspired barn lane + meadow edge (cozy gids only — no second tileset yet). */
function applyCabacosFarmSketchDecor(map) {
  const w = map.width;
  const ground = map.layers.find((l) => l.name === 'Ground' && l.type === 'tilelayer');
  const paths = map.layers.find((l) => l.name === 'Paths' && l.type === 'tilelayer');
  const vegetation = map.layers.find((l) => l.name === 'Vegetation' && l.type === 'tilelayer');
  if (!ground?.data || !paths?.data || !vegetation?.data) return;

  const idx = (x, y) => y * w + x;
  for (let y = 0; y < h(map); y += 1) {
    for (let x = 0; x < w; x += 1) {
      const inMain =
        x >= 15 && x <= 28 && y >= 9 && y <= 20;
      const inAnnex = x >= 39 && x <= 48 && y >= 27 && y <= 36;
      if (inMain || inAnnex) continue;
      if ((x + y) % 7 === 0 && ground.data[idx(x, y)] > 0 && ground.data[idx(x, y)] < 53) {
        ground.data[idx(x, y)] = (x + y) % 2 === 0 ? 17 : 19;
      }
    }
  }

  for (let y = 8; y <= 11; y += 1) {
    paths.data[idx(9, y)] = y % 2 === 0 ? T.pathA : T.pathB;
    paths.data[idx(10, y)] = T.woodPlank;
  }
  for (let x = 29; x <= 38; x += 1) {
    vegetation.data[idx(x, 8)] = T.hedge;
  }
}

function h(map) {
  return map.height;
}

function ensureInteractablesLayer(map) {
  let layer = map.layers.find((l) => l.name === 'Interactables');
  if (!layer) {
    layer = {
      id: FARM_CONTRACT.objectLayerIds.interactables,
      name: 'Interactables',
      type: 'objectgroup',
      visible: true,
      opacity: 1,
      draworder: 'topdown',
      x: 0,
      y: 0,
      objects: [],
    };
    map.layers.push(layer);
  }
  layer.objects = layer.objects.filter((o) => o.name !== 'farm_donor_cabacos_sign');
  layer.objects.push({
    id: 90,
    name: 'farm_donor_cabacos_sign',
    type: 'interactable',
    x: 12 * TW,
    y: 6 * TW,
    width: TW * 2,
    height: TW,
    properties: [
      { name: 'kind', type: 'string', value: 'crop_plot' },
      {
        name: 'labelVi',
        type: 'string',
        value: 'Ruộng donor Cabacos (sketch) — 184 luống giữ nguyên',
      },
      { name: 'maxRadiusPx', type: 'int', value: 56 },
    ],
  });
}

function main() {
  let map = loadFarm();
  map = paintFarmPlotRegionsFromContract(map);
  applyCabacosFarmSketchDecor(map);
  ensureInteractablesLayer(map);

  const props = map.properties ?? [];
  const filtered = props.filter(
    (p) =>
      !['olwDonor', 'olwDonorSha', 'olwDonorSketch', 'olwDonorNote'].includes(p.name),
  );
  map.properties = [
    ...filtered,
    { name: 'mapId', type: 'string', value: 'farm' },
    { name: 'olwDonor', type: 'string', value: 'cabacos' },
    { name: 'olwDonorSha', type: 'string', value: OLW_SHA },
    { name: 'olwDonorSketch', type: 'string', value: 'farm-v0' },
    {
      name: 'olwDonorNote',
      type: 'string',
      value: 'Coosy preview art; full ts_map render pending',
    },
  ];

  const check = validateFarmPlotContract(map);
  if (!check.ok) {
    console.error('Farm contract validation failed:', check.errors);
    process.exit(1);
  }

  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.log(
    `Wrote farm.json donor sketch cabacos plots=${check.plotCount} walkable=${check.walkable}`,
  );
}

main();