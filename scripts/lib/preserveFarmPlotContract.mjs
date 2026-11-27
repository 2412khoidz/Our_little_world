/**
 * Validates OLW farm.json against farmPlotContract.v1.json (184 plot anchors).
 */
import fs from 'node:fs';
import path from 'node:path';

function loadContract() {
  return JSON.parse(fs.readFileSync(path.resolve('src/shared/world/farmPlotContract.v1.json'), 'utf8'));
}

const SOIL_LAYER = 'OLW_ContractSoil';

function layerData(map, layerName) {
  const layer = map.layers.find((l) => l.name === layerName && l.type === 'tilelayer');
  return { layer, data: layer?.data, w: map.width, h: map.height };
}

function plotSoilLayerName(map) {
  if (map.layers.some((l) => l.name === SOIL_LAYER && l.type === 'tilelayer')) return SOIL_LAYER;
  return 'Ground';
}

function tileAt(data, w, x, y) {
  if (!data) return 0;
  return data[y * w + x] ?? 0;
}

function collisionBlocked(map, x, y) {
  const { data, w } = layerData(map, 'Collision');
  return tileAt(data, w, x, y) > 0;
}

/** firstgid for tileset-cozy on donor farm maps */
export const COZY_SOIL_GIDS = (cozyFirstGid) => {
  const { tileGids } = loadContract();
  return {
    soilDry: cozyFirstGid + tileGids.soilDry - 1,
    soilWet: cozyFirstGid + tileGids.soilWet - 1,
  };
};

function mapPropBool(map, name) {
  return map.properties?.some((p) => p.name === name && (p.value === true || p.value === 'true'));
}

function cabacosSoilGidAt(map, x, y, w) {
  for (const layerName of ['soil', 'farm3', 'farm2', 'farm', 'land']) {
    const { data } = layerData(map, layerName);
    const gid = tileAt(data, w, x, y);
    if (gid > 0) return gid;
  }
  return 0;
}

function pydewFarmableGidAt(map, x, y, w) {
  const { data } = layerData(map, 'Farmable');
  return tileAt(data, w, x, y);
}

function donorNativeId(map) {
  return map.properties?.find((p) => p.name === 'olwDonor')?.value ?? '';
}

export function validateFarmPlotContract(farmMap) {
  const CONTRACT = loadContract();
  const nativeSoil = mapPropBool(farmMap, 'olwFarmNativeSoil');
  const pydewDonor = donorNativeId(farmMap) === 'pydew-valley';
  const soilLayer = nativeSoil ? (pydewDonor ? 'Farmable' : 'farm3') : plotSoilLayerName(farmMap);
  const { soilDry, soilWet } = CONTRACT.tileGids;
  const cozyFirst =
    farmMap.tilesets?.find((t) => t.name === 'tileset-cozy')?.firstgid ??
    (soilLayer === 'Ground' ? 1 : null);
  const expectDry = cozyFirst != null ? cozyFirst + soilDry - 1 : soilDry;
  const expectWet = cozyFirst != null ? cozyFirst + soilWet - 1 : soilWet;

  const { data: ground, w } = layerData(farmMap, soilLayer);
  const errors = [];
  let plotCount = 0;
  let walkable = 0;

  const anchorTiles =
    nativeSoil && pydewDonor && Array.isArray(CONTRACT.plotAnchors) && CONTRACT.plotAnchors.length >= 184
      ? CONTRACT.plotAnchors.slice(0, 184).map((a) => ({ id: a.anchorId, tx: a.tileX, ty: a.tileY }))
      : null;

  if (anchorTiles) {
    for (const { id, tx, ty } of anchorTiles) {
      plotCount += 1;
      const gid = pydewFarmableGidAt(farmMap, tx, ty, w);
      if (gid <= 0) {
        errors.push(`plot ${id} @ ${tx},${ty} missing PyDew Farmable tile`);
      }
      if (!collisionBlocked(farmMap, tx, ty)) walkable += 1;
    }
  } else {
    for (const region of CONTRACT.plotRegions) {
      const count = region.columns * region.rows;
      for (let local = 0; local < count; local += 1) {
        const col = local % region.columns;
        const row = Math.floor(local / region.columns);
        const tx = region.originTileX + col;
        const ty = region.originTileY + row;
        plotCount += 1;
        const gid = nativeSoil
          ? pydewDonor
            ? pydewFarmableGidAt(farmMap, tx, ty, w)
            : cabacosSoilGidAt(farmMap, tx, ty, w)
          : tileAt(ground, w, tx, ty);
        if (nativeSoil) {
          if (gid <= 0) {
            errors.push(
              `plot ${region.id}_${local} @ ${tx},${ty} missing ${pydewDonor ? 'PyDew' : 'Cabacos'} soil (migration pending)`,
            );
          }
        } else if (gid !== expectDry && gid !== expectWet && gid !== soilDry && gid !== soilWet) {
          errors.push(`plot ${region.id}_${local} @ ${tx},${ty} gid=${gid} expected soil`);
        }
        if (!collisionBlocked(farmMap, tx, ty)) walkable += 1;
      }
    }
  }

  if (plotCount !== 184) errors.push(`plot count ${plotCount} !== 184`);
  if (walkable < CONTRACT.plotMinWalkableTiles) {
    errors.push(`walkable plots ${walkable} < ${CONTRACT.plotMinWalkableTiles}`);
  }

  return { ok: errors.length === 0, errors, plotCount, walkable, soilLayer };
}

export function paintFarmPlotRegionsFromContract(farmMap, options = {}) {
  const CONTRACT = loadContract();
  const layerName = options.layerName ?? plotSoilLayerName(farmMap);
  let layer = farmMap.layers.find((l) => l.name === layerName && l.type === 'tilelayer');
  if (!layer) {
    layer = {
      id: options.layerId ?? 70,
      name: layerName,
      type: 'tilelayer',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      width: farmMap.width,
      height: farmMap.height,
      data: new Array(farmMap.width * farmMap.height).fill(0),
      properties: [{ name: 'gamemaker_depth', type: 'int', value: -5000 }],
    };
    farmMap.layers.push(layer);
  }
  const cozyFirst =
    farmMap.tilesets?.find((t) => t.name === 'tileset-cozy')?.firstgid ?? 1;
  const soilDry = cozyFirst + CONTRACT.tileGids.soilDry - 1;
  for (const region of CONTRACT.plotRegions) {
    const count = region.columns * region.rows;
    for (let local = 0; local < count; local += 1) {
      const col = local % region.columns;
      const row = Math.floor(local / region.columns);
      const tx = region.originTileX + col;
      const ty = region.originTileY + row;
      layer.data[ty * farmMap.width + tx] = soilDry;
    }
  }
  return farmMap;
}

export const FARM_CONTRACT = loadContract();