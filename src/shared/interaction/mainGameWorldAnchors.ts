import { TILE_SIZE } from '../maps';
import type { MapId } from '../types';

/** Pixel anchors for diegetic interactables (kept in sync with WorldScene Demo E accents). */
export const MAIN_GAME_WORLD_ANCHORS = {
  home: {
    foodBowlPx: { x: 198, y: 162 },
    waterBowlPx: { x: 210, y: 162 },
    kitchenWaterPx: { x: 44, y: 176 },
    photoFramePx: { x: 154, y: 34 },
  },
  garden: {
    pondWaterPx: { x: 8 * TILE_SIZE, y: 10 * TILE_SIZE },
    mailboxPx: { x: 184, y: 52 },
    shippingBinPx: { x: 2 * TILE_SIZE, y: 11 * TILE_SIZE },
  },
} as const;

export function portalCenterPx(_mapId: MapId, portal: { tileX: number; tileY: number }): { x: number; y: number } {
  return {
    x: (portal.tileX + 0.5) * TILE_SIZE,
    y: (portal.tileY + 0.5) * TILE_SIZE,
  };
}