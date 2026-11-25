import type { FurnitureCatalogItem } from '../types';
import { getFootprintTiles, type TileCoord } from '../placement';

/**
 * Placement loop primitives ported from cocoworking RoomEditor (snap/grid)
 * and cozy-space GridOverlay (footprint preview + flip).
 */

export interface FootprintSize {
  widthTiles: number;
  heightTiles: number;
}

export function snapPointerTile(
  pointerTileX: number,
  pointerTileY: number,
  mapWidthTiles: number,
  mapHeightTiles: number,
): TileCoord {
  return {
    tileX: Math.max(0, Math.min(mapWidthTiles - 1, pointerTileX)),
    tileY: Math.max(0, Math.min(mapHeightTiles - 1, pointerTileY)),
  };
}

export function footprintForCatalog(
  item: Pick<FurnitureCatalogItem, 'widthTiles' | 'heightTiles'>,
  rotated: boolean,
): FootprintSize {
  if (!rotated) {
    return { widthTiles: item.widthTiles, heightTiles: item.heightTiles };
  }
  return { widthTiles: item.heightTiles, heightTiles: item.widthTiles };
}

export function canRotateFootprint(size: FootprintSize): boolean {
  return size.widthTiles !== size.heightTiles;
}

export function nextRotatedFootprint(size: FootprintSize): FootprintSize {
  return { widthTiles: size.heightTiles, heightTiles: size.widthTiles };
}

export function previewFootprintTiles(
  tileX: number,
  tileY: number,
  size: FootprintSize,
): TileCoord[] {
  return getFootprintTiles(tileX, tileY, size.widthTiles, size.heightTiles);
}

export function hitPlacementTile(
  tileX: number,
  tileY: number,
  placement: { tileX: number; tileY: number; widthTiles: number; heightTiles: number },
): boolean {
  return (
    tileX >= placement.tileX &&
    tileY >= placement.tileY &&
    tileX < placement.tileX + placement.widthTiles &&
    tileY < placement.tileY + placement.heightTiles
  );
}