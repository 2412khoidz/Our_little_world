/**
 * Validates OLW farm.json against farmPlotContract.v1.json (184 plot anchors).
 */
import fs from 'node:fs';
import path from 'node:path';

const CONTRACT = JSON.parse(
  fs.readFileSync(path.resolve('src/shared/world/farmPlotContract.v1.json'), 'utf8'),
);

function layerData(map, layerName) {
  const layer = map.layers.find((l) => l.name === layerName && l.type === 'tilelayer');
  return { layer, data: layer?.data, w: map.width, h: map.height };
}

function tileAt(data, w, x, y) {
  if (!data) return 0;
  return data[y * w + x] ?? 0;
}

function collisionBlocked(map, x, y) {
  const { data, w } = layerData(map, 'Collision');
  return tileAt(data, w, x, y) > 0;
}

export function validateFarmPlotContract(farmMap) {
  const { soilDry, soilWet } = CONTRACT.tileGids;
  const { data: ground, w } = layerData(farmMap, 'Ground');
  const errors = [];
  let plotCount = 0;
  let walkable = 0;

  for (const region of CONTRACT.plotRegions) {
    const count = region.columns * region.rows;
    for (let local = 0; local < count; local += 1) {
      const col = local % region.columns;
      const row = Math.floor(local / region.columns);
      const tx = region.originTileX + col;
      const ty = region.originTileY + row;
      plotCount += 1;
      const gid = tileAt(ground, w, tx, ty);
      if (gid !== soilDry && gid !== soilWet) {
        errors.push(`plot ${region.id}_${local} @ ${tx},${ty} gid=${gid} expected soil`);
      }
      if (!collisionBlocked(farmMap, tx, ty)) walkable += 1;
    }
  }

  if (plotCount !== 184) errors.push(`plot count ${plotCount} !== 184`);
  if (walkable < CONTRACT.plotMinWalkableTiles) {
    errors.push(`walkable plots ${walkable} < ${CONTRACT.plotMinWalkableTiles}`);
  }

  return { ok: errors.length === 0, errors, plotCount, walkable };
}

export function paintFarmPlotRegionsFromContract(farmMap) {
  const { soilDry } = CONTRACT.tileGids;
  const ground = layerData(farmMap, 'Ground');
  if (!ground.data) return farmMap;
  for (const region of CONTRACT.plotRegions) {
    const count = region.columns * region.rows;
    for (let local = 0; local < count; local += 1) {
      const col = local % region.columns;
      const row = Math.floor(local / region.columns);
      const tx = region.originTileX + col;
      const ty = region.originTileY + row;
      ground.data[ty * ground.w + tx] = soilDry;
    }
  }
  return farmMap;
}

export const FARM_CONTRACT = CONTRACT;