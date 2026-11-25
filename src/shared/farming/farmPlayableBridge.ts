/**
 * Mission 05 bridge: Dev LAN / Supabase plot indices ↔ Composer 3 `farmPlotContract` anchors (184).
 */

import { TILE_SIZE } from '../maps';
import type { InteractableTarget } from '../interaction/interactionTypes';
import { FARM_ZONE_MAP_ID } from '../world/farmPlotContract';
import {
  buildAllFarmPlotInteractableCenters,
  FARM_PLOT_COUNT,
  farmPlotAnchorIdForIndex,
  plotIndexFromAnchorId,
} from './farmPlotIndex';

export const PRIMARY_FARM_MAP_ID = FARM_ZONE_MAP_ID;

export function farmSliceAnchorId(plotIndex: number): string {
  return farmPlotAnchorIdForIndex(plotIndex) ?? `farm_invalid_${plotIndex}`;
}

export const plotIndexFromFarmAnchorId = plotIndexFromAnchorId;

export function buildFarmSlicePlotInteractables(): InteractableTarget[] {
  return buildAllFarmPlotInteractableCenters().map(({ plotIndex, anchorId, tileX, tileY }) => ({
    id: anchorId,
    kind: 'crop_plot' as const,
    labelVi: `Luống #${plotIndex + 1} — J khi cầm cuốc/hạt/tưới`,
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
    maxRadiusPx: 22,
  }));
}

/** Seed shop NPC tile — presentation only; coords sit beside barn on farm map (not in contract table). */
export const FARM_SLICE_SEED_SHOP_TILE = { tileX: 11, tileY: 9 } as const;

export { FARM_PLOT_COUNT };