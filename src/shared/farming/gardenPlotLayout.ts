import { GARDEN_COLUMNS, GARDEN_ROWS, GARDEN_PLOT_COUNT } from './crops';
import { TILE_SIZE } from '../maps';

/** Garden map: 6×4 grid of tillable tiles (upper meadow, right of cottage path). */
const PLOT_ORIGIN_TILE_X = 4;
const PLOT_ORIGIN_TILE_Y = 6;

export interface GardenPlotAnchor {
  plotId: number;
  tileX: number;
  tileY: number;
  centerPxX: number;
  centerPxY: number;
}

function buildAnchors(): readonly GardenPlotAnchor[] {
  const out: GardenPlotAnchor[] = [];
  for (let plotId = 0; plotId < GARDEN_PLOT_COUNT; plotId += 1) {
    const col = plotId % GARDEN_COLUMNS;
    const row = Math.floor(plotId / GARDEN_COLUMNS);
    const tileX = PLOT_ORIGIN_TILE_X + col;
    const tileY = PLOT_ORIGIN_TILE_Y + row;
    out.push({
      plotId,
      tileX,
      tileY,
      centerPxX: tileX * TILE_SIZE + TILE_SIZE / 2,
      centerPxY: tileY * TILE_SIZE + TILE_SIZE / 2,
    });
  }
  return Object.freeze(out);
}

export const GARDEN_PLOT_ANCHORS: readonly GardenPlotAnchor[] = buildAnchors();

export function plotIdFromInteractableId(targetId: string): number | null {
  const m = /^garden-plot-(\d+)$/.exec(targetId);
  if (!m) return null;
  const id = Number(m[1]);
  if (!Number.isInteger(id) || id < 0 || id >= GARDEN_ROWS * GARDEN_COLUMNS) return null;
  return id;
}