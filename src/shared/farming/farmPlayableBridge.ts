/**
 * Mission 05 bridge: Dev LAN farm simulation (24 plot rows) ↔ Composer 3 `farmPlotContract` anchors.
 */

import { TILE_SIZE } from '../maps';
import type { InteractableTarget } from '../interaction/interactionTypes';
import {
  FARM_PLOT_REGIONS,
  FARM_ZONE_MAP_ID,
  farmPlotAnchorId,
  farmPlotTileFromAnchor,
  type FarmPlotAnchorId,
  type FarmPlotRegion,
} from '../world/farmPlotContract';
import { GARDEN_PLOT_COUNT } from './crops';

export const PRIMARY_FARM_MAP_ID = FARM_ZONE_MAP_ID;

const SLICE_REGION: FarmPlotRegion = FARM_PLOT_REGIONS.find((r) => r.id === 'farm_main')!;

/** V0.2.1 slice: first 6×4 plots inside `farm_main` (row-major, same count as domain grid). */
export function farmSliceAnchorId(plotIndex: number): FarmPlotAnchorId {
  return farmPlotAnchorId('farm_main', plotIndex);
}

export function plotIndexFromFarmAnchorId(anchorOrTargetId: string): number | null {
  const m = /^(?:farm_main_(\d+)|garden-plot-(\d+)|farm-plot-(\d+))$/.exec(anchorOrTargetId);
  if (!m) return null;
  const id = Number(m[1] ?? m[2] ?? m[3]);
  if (!Number.isInteger(id) || id < 0 || id >= GARDEN_PLOT_COUNT) return null;
  return id;
}

export function buildFarmSlicePlotInteractables(): InteractableTarget[] {
  const out: InteractableTarget[] = [];
  for (let plotIndex = 0; plotIndex < GARDEN_PLOT_COUNT; plotIndex += 1) {
    const tile = farmPlotTileFromAnchor(SLICE_REGION, plotIndex);
    if (!tile) continue;
    const anchorId = farmSliceAnchorId(plotIndex);
    out.push({
      id: anchorId,
      kind: 'crop_plot',
      labelVi: `Luống đất #${plotIndex + 1}`,
      x: tile.tileX * TILE_SIZE + TILE_SIZE / 2,
      y: tile.tileY * TILE_SIZE + TILE_SIZE / 2,
      maxRadiusPx: 22,
    });
  }
  return out;
}

/** Seed shop NPC tile — presentation only; coords sit beside barn on farm map (not in contract table). */
export const FARM_SLICE_SEED_SHOP_TILE = { tileX: 11, tileY: 9 } as const;