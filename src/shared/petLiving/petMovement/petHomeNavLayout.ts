import { DEFAULT_STARTER_PLACEMENT_SPECS, getCatalogItem } from '../../catalog';
import { getFootprintTiles } from '../../placement';
import { MAP_DEFINITIONS, TILE_SIZE } from '../../maps';
import type { GridPoint } from './tilePathfinding';

export const PET_HOME_MAP_ID = 'home' as const;

export function buildHomeMovementBlockedTiles(): Set<string> {
  const mapDef = MAP_DEFINITIONS[PET_HOME_MAP_ID];
  const blocked = new Set<string>();
  for (let y = 0; y < mapDef.heightTiles; y += 1) {
    for (let x = 0; x < mapDef.widthTiles; x += 1) {
      if (mapDef.isStaticBlocked(x, y)) {
        blocked.add(`${x},${y}`);
      }
    }
  }
  for (const placement of DEFAULT_STARTER_PLACEMENT_SPECS) {
    if (placement.mapId !== PET_HOME_MAP_ID) continue;
    const item = getCatalogItem(placement.sku);
    if (!item?.blocksMovement) continue;
    for (const tile of getFootprintTiles(placement.tileX, placement.tileY, item.widthTiles, item.heightTiles)) {
      blocked.add(`${tile.tileX},${tile.tileY}`);
    }
  }
  return blocked;
}

export interface PetNavAnchor {
  targetId: string;
  objectPixelX: number;
  objectPixelY: number;
  anchorPixelX: number;
  anchorPixelY: number;
  preferredFacing: import('../petVisualTypes').PetFacing;
  objectTileX: number;
  objectTileY: number;
}

/** Lab + home Demo E prop positions (pixels) with interaction stand tile. */
export const PET_HOME_NAV_ANCHORS: readonly PetNavAnchor[] = [
  anchor('food_bowl', 198, 162, 12, 10, 'south'),
  anchor('water_bowl', 210, 162, 13, 10, 'south'),
  anchor('pet_bed', 218, 166, 13, 11, 'south'),
  anchor('study_desk', 184, 84, 11, 6, 'north'),
  anchor('sofa', 96, 98, 6, 6, 'east'),
  anchor('yarn_ball', 164, 140, 10, 9, 'south'),
  anchor('cardboard_box', 148, 130, 9, 9, 'west'),
  anchor('scratching_post', 230, 144, 14, 9, 'west'),
  anchor('sunny_window', 40, 46, 3, 4, 'north'),
  anchor('rug', 176, 152, 11, 10, 'south'),
] as const;

function anchor(
  targetId: string,
  px: number,
  py: number,
  standTileX: number,
  standTileY: number,
  preferredFacing: import('../petVisualTypes').PetFacing,
): PetNavAnchor {
  return {
    targetId,
    objectPixelX: px,
    objectPixelY: py,
    anchorPixelX: standTileX * TILE_SIZE + TILE_SIZE / 2,
    anchorPixelY: standTileY * TILE_SIZE + TILE_SIZE - 2,
    preferredFacing,
    objectTileX: Math.round(px / TILE_SIZE),
    objectTileY: Math.round(py / TILE_SIZE),
  };
}

export function pixelToTile(x: number, y: number): GridPoint {
  return {
    tileX: Math.max(0, Math.floor(x / TILE_SIZE)),
    tileY: Math.max(0, Math.floor(y / TILE_SIZE)),
  };
}

export function tileCenterPixel(tile: GridPoint): { x: number; y: number } {
  return {
    x: tile.tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tile.tileY * TILE_SIZE + TILE_SIZE - 2,
  };
}

export function findNavAnchor(targetId: string): PetNavAnchor | null {
  return PET_HOME_NAV_ANCHORS.find((a) => a.targetId === targetId) ?? null;
}

export function anchorToWorldTarget(
  anchor: PetNavAnchor,
  available = true,
  reachable = true,
): import('./petMovementContract').PetMovementWorldTarget {
  return {
    targetId: anchor.targetId,
    anchorPixelX: anchor.anchorPixelX,
    anchorPixelY: anchor.anchorPixelY,
    objectPixelX: anchor.objectPixelX,
    objectPixelY: anchor.objectPixelY,
    available,
    reachable,
  };
}