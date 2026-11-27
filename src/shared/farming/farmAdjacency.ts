import type { Direction } from '../types';

export const FARM_TILE_PX = 16;
export const FARM_PLOT_INTERACT_RADIUS_PX = 23;
const MAX_ADJACENT_PIXEL_RATIO = 1.48;

export function isFarmPlotTileAdjacent(
  playerTileX: number,
  playerTileY: number,
  plotTileX: number,
  plotTileY: number,
): boolean {
  return Math.abs(playerTileX - plotTileX) <= 1 && Math.abs(playerTileY - plotTileY) <= 1;
}

/**
 * Canonical strict adjacency rule shared by hover highlight, pointer click, and J/touch resolution.
 * Permits standing on or directly adjacent (8-way <= 1 tile and within 1.48 tile radii of plot center),
 * strictly rejecting 2-tile or further plots.
 */
export function isFarmPlotPixelAdjacent(
  playerX: number,
  playerY: number,
  plotTileX: number,
  plotTileY: number,
  tilePx = FARM_TILE_PX,
): boolean {
  const safeTilePx = Math.max(1, tilePx);
  const playerTileX = Math.floor(playerX / safeTilePx);
  const playerTileY = Math.floor(playerY / safeTilePx);
  if (!isFarmPlotTileAdjacent(playerTileX, playerTileY, plotTileX, plotTileY)) {
    return false;
  }
  const plotCenterX = (plotTileX + 0.5) * safeTilePx;
  const plotCenterY = (plotTileY + 0.5) * safeTilePx;
  return Math.hypot(plotCenterX - playerX, plotCenterY - playerY) <= safeTilePx * MAX_ADJACENT_PIXEL_RATIO;
}

export function facingTowardPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fallback: Direction = 'down',
): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
}
