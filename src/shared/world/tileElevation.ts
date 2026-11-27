export interface TileLayerLike {
  readonly name: string;
  readonly type: string;
  readonly data?: readonly number[];
}

export interface TileElevationSourceMap {
  readonly width: number;
  readonly height: number;
  readonly layers: readonly TileLayerLike[];
}

export interface TileElevationGrid {
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** 0 = void/water/cliff-wall/blocked, 1+ = discrete navigable terrace height. */
  readonly levels: Uint8Array;
  /** 1 = designated ladder/stair/ramp tile allowing +/-1 elevation step. */
  readonly transitions: Uint8Array;
}

export function parseTileElevationGrid(mapJson: TileElevationSourceMap): TileElevationGrid | null {
  const widthTiles = mapJson.width;
  const heightTiles = mapJson.height;
  if (widthTiles <= 0 || heightTiles <= 0) return null;

  const elevLayer = mapJson.layers.find(
    (layer) => layer.type === 'tilelayer' && layer.name.toLowerCase() === 'elevation',
  );
  if (!elevLayer?.data || elevLayer.data.length === 0) {
    return null;
  }

  const transitionLayer = mapJson.layers.find(
    (layer) => layer.type === 'tilelayer' && layer.name.toLowerCase() === 'elevationtransitions',
  );

  const total = widthTiles * heightTiles;
  const levels = new Uint8Array(total);
  const transitions = new Uint8Array(total);
  const copyLen = Math.min(total, elevLayer.data.length);
  for (let i = 0; i < copyLen; i += 1) {
    const raw = elevLayer.data[i] ?? 0;
    levels[i] = raw > 0 ? Math.min(255, raw | 0) : 0;
    transitions[i] = (transitionLayer?.data?.[i] ?? 0) > 0 ? 1 : 0;
  }

  return { widthTiles, heightTiles, levels, transitions };
}

export function getTileElevation(grid: TileElevationGrid, tileX: number, tileY: number): number {
  if (tileX < 0 || tileY < 0 || tileX >= grid.widthTiles || tileY >= grid.heightTiles) {
    return 0;
  }
  return grid.levels[tileY * grid.widthTiles + tileX] ?? 0;
}

export function isElevationTransitionTile(
  grid: TileElevationGrid,
  tileX: number,
  tileY: number,
): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= grid.widthTiles || tileY >= grid.heightTiles) {
    return false;
  }
  return (grid.transitions[tileY * grid.widthTiles + tileX] ?? 0) > 0;
}

function canStepOrthogonalElevation(
  grid: TileElevationGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): boolean {
  const toElev = getTileElevation(grid, toX, toY);
  if (toElev === 0) return false;
  const fromElev = getTileElevation(grid, fromX, fromY);
  // Allow escaping out of a 0 cell onto a walkable tile if recovery/spawn placed on an edge.
  if (fromElev === 0 || fromElev === toElev) return true;
  if (Math.abs(fromElev - toElev) === 1) {
    return isElevationTransitionTile(grid, fromX, fromY) || isElevationTransitionTile(grid, toX, toY);
  }
  return false;
}

/**
 * Enforces Pokémon-style discrete tile elevation navigation across players, cats, and NPCs.
 * - Stepping onto elevation 0 (void, water, cliff face) is forbidden.
 * - Height changes of +/-1 require at least one designated stair/ladder/ramp transition tile.
 * - Height jumps >1 are never permitted.
 * - Diagonal steps check both flanking orthogonal cells to block cliff corner-cutting.
 */
export function canStepTileElevation(
  grid: TileElevationGrid | null | undefined,
  fromTileX: number,
  fromTileY: number,
  toTileX: number,
  toTileY: number,
): boolean {
  if (!grid) return true;
  if (fromTileX === toTileX && fromTileY === toTileY) {
    return getTileElevation(grid, toTileX, toTileY) > 0;
  }

  const dx = toTileX - fromTileX;
  const dy = toTileY - fromTileY;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && dx !== 0 && dy !== 0) {
    return (
      canStepOrthogonalElevation(grid, fromTileX, fromTileY, toTileX, fromTileY) &&
      canStepOrthogonalElevation(grid, toTileX, fromTileY, toTileX, toTileY) &&
      canStepOrthogonalElevation(grid, fromTileX, fromTileY, fromTileX, toTileY) &&
      canStepOrthogonalElevation(grid, fromTileX, toTileY, toTileX, toTileY)
    );
  }

  return canStepOrthogonalElevation(grid, fromTileX, fromTileY, toTileX, toTileY);
}
