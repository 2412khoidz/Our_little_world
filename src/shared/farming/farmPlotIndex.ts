/**
 * Global farm plot indices (0..183) ↔ Composer 3 anchor ids (`farm_main_*`, `farm_annex_*`).
 */

import {
  enumerateFarmPlotAnchors,
  farmPlotAnchorId,
  farmPlotTileFromAnchor,
  FARM_PLOT_REGIONS,
  isFarmSoilTile,
  type FarmPlotAnchorId,
  type FarmPlotRegion,
} from '../world/farmPlotContract';

const MAIN: FarmPlotRegion = FARM_PLOT_REGIONS.find((r) => r.id === 'farm_main')!;
const ANNEX: FarmPlotRegion = FARM_PLOT_REGIONS.find((r) => r.id === 'farm_annex')!;

export const FARM_MAIN_PLOT_COUNT = 120;
export const FARM_ANNEX_PLOT_COUNT = 64;
export const FARM_PLOT_COUNT = FARM_MAIN_PLOT_COUNT + FARM_ANNEX_PLOT_COUNT;

/** Rows 0..2 (24 plots) in farm_annex serve as all-season protected Greenhouse beds. */
export const FARM_GREENHOUSE_PLOT_START = FARM_MAIN_PLOT_COUNT;
export const FARM_GREENHOUSE_PLOT_END = FARM_MAIN_PLOT_COUNT + 23;

export function isGreenhousePlot(plotIndex: number): boolean {
  return (
    Number.isInteger(plotIndex) &&
    plotIndex >= FARM_GREENHOUSE_PLOT_START &&
    plotIndex <= FARM_GREENHOUSE_PLOT_END
  );
}

/**
 * Returns local grid neighbor plot indices inside the SAME farm region
 * (`farm_main` 12x10 or `farm_annex` 8x8) without wrapping across edges.
 */
export function getRegionGridNeighbors(
  centerPlotIndex: number,
  pattern: 'cross4' | 'line2' | 'box2x2' | 'box3x3' | 'box5x5',
): number[] {
  const slot = farmPlotRegionAndLocal(centerPlotIndex);
  if (!slot) return [];
  const region = slot.regionId === 'farm_main' ? MAIN : ANNEX;
  const baseGlobal = slot.regionId === 'farm_main' ? 0 : FARM_MAIN_PLOT_COUNT;
  const col = slot.localIndex % region.columns;
  const row = Math.floor(slot.localIndex / region.columns);

  const offsets: ReadonlyArray<readonly [number, number]> = (() => {
    if (pattern === 'cross4') {
      return [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ];
    }
    if (pattern === 'line2') {
      return [
        [0, 0],
        [1, 0],
      ];
    }
    if (pattern === 'box2x2') {
      return [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ];
    }
    const r = pattern === 'box5x5' ? 2 : 1;
    const coords: [number, number][] = [];
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        coords.push([dx, dy]);
      }
    }
    return coords;
  })();

  const result: number[] = [];
  for (const [dx, dy] of offsets) {
    const nx = col + dx;
    const ny = row + dy;
    if (nx < 0 || nx >= region.columns || ny < 0 || ny >= region.rows) continue;
    const globalIdx = baseGlobal + ny * region.columns + nx;
    if (pattern === 'cross4' && globalIdx === centerPlotIndex) continue;
    result.push(globalIdx);
  }
  return result;
}

const ANCHOR_INDEX_MAP: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  let global = 0;
  for (const region of FARM_PLOT_REGIONS) {
    const count = region.columns * region.rows;
    for (let local = 0; local < count; local += 1) {
      m.set(farmPlotAnchorId(region.id, local), global);
      global += 1;
    }
  }
  return m;
})();

const TILE_INDEX_MAP: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  const anchors = enumerateFarmPlotAnchors();
  for (let i = 0; i < anchors.length; i += 1) {
    const a = anchors[i]!;
    m.set(`${a.tileX},${a.tileY}`, i);
  }
  return m;
})();

export function farmPlotIndexForTile(tileX: number, tileY: number): number | null {
  return TILE_INDEX_MAP.get(`${tileX},${tileY}`) ?? null;
}

export function farmPlotRegionAndLocal(
  plotIndex: number,
): { regionId: FarmPlotRegion['id']; localIndex: number } | null {
  if (!Number.isInteger(plotIndex) || plotIndex < 0) return null;
  if (plotIndex < FARM_MAIN_PLOT_COUNT) {
    return { regionId: 'farm_main', localIndex: plotIndex };
  }
  const local = plotIndex - FARM_MAIN_PLOT_COUNT;
  if (local < FARM_ANNEX_PLOT_COUNT) {
    return { regionId: 'farm_annex', localIndex: local };
  }
  return null;
}

export function farmPlotAnchorIdForIndex(plotIndex: number): FarmPlotAnchorId | null {
  const slot = farmPlotRegionAndLocal(plotIndex);
  if (!slot) return null;
  return farmPlotAnchorId(slot.regionId, slot.localIndex);
}

export function plotIndexFromAnchorId(anchorOrTargetId: string): number | null {
  const direct = ANCHOR_INDEX_MAP.get(anchorOrTargetId);
  if (direct !== undefined) return direct;
  const legacy = /^(?:garden-plot|farm-plot)-(\d+)$/.exec(anchorOrTargetId);
  if (!legacy) return null;
  const id = Number(legacy[1]);
  if (!Number.isInteger(id) || id < 0 || id >= FARM_PLOT_COUNT) return null;
  return id;
}

export function isValidFarmPlotIndex(plotIndex: number): boolean {
  return farmPlotRegionAndLocal(plotIndex) !== null;
}

export function farmPlotTileForIndex(plotIndex: number): { tileX: number; tileY: number } | null {
  const anchors = enumerateFarmPlotAnchors();
  const hit = anchors[plotIndex];
  if (hit) return { tileX: hit.tileX, tileY: hit.tileY };
  const slot = farmPlotRegionAndLocal(plotIndex);
  if (!slot) return null;
  const region = slot.regionId === 'farm_main' ? MAIN : ANNEX;
  return farmPlotTileFromAnchor(region, slot.localIndex);
}

/** Server-side contract check: index resolves to a published soil tile. */
export function isFarmPlotIndexOnContractSoil(plotIndex: number): boolean {
  const tile = farmPlotTileForIndex(plotIndex);
  if (!tile) return false;
  return isFarmSoilTile(tile.tileX, tile.tileY);
}

export function buildAllFarmPlotInteractableCenters(): ReadonlyArray<{
  plotIndex: number;
  anchorId: FarmPlotAnchorId;
  tileX: number;
  tileY: number;
}> {
  return enumerateFarmPlotAnchors().map((a, plotIndex) => ({
    plotIndex,
    anchorId: a.anchorId,
    tileX: a.tileX,
    tileY: a.tileY,
  }));
}