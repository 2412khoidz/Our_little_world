import { getCatalogItem } from './catalog';
import { getMapDefinition } from './maps';
import type { FurniturePlacement, MapId, MutationErrorCode } from './types';

export interface TileCoord {
  tileX: number;
  tileY: number;
}

export function getFootprintTiles(
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let dy = 0; dy < heightTiles; dy += 1) {
    for (let dx = 0; dx < widthTiles; dx += 1) {
      tiles.push({ tileX: tileX + dx, tileY: tileY + dy });
    }
  }
  return tiles;
}

export function countPlacedBySku(
  placements: readonly FurniturePlacement[],
  sku: string,
  ignorePlacementId?: string,
): number {
  let count = 0;
  for (const placement of placements) {
    if (placement.sku === sku && placement.id !== ignorePlacementId) {
      count += 1;
    }
  }
  return count;
}

export function getRemainingStockForSku(
  placements: readonly FurniturePlacement[],
  sku: string,
): number {
  const catalogItem = getCatalogItem(sku);
  if (!catalogItem) return 0;
  return Math.max(0, catalogItem.starterQuantity - countPlacedBySku(placements, sku));
}

export interface ValidatePlacementInput {
  mapId: MapId;
  sku: string;
  tileX: number;
  tileY: number;
  placements: readonly FurniturePlacement[];
  ignorePlacementId?: string;
}

export type ValidatePlacementResult =
  | { ok: true; tiles: TileCoord[] }
  | { ok: false; code: MutationErrorCode; message: string };

export function validatePlacement(input: ValidatePlacementInput): ValidatePlacementResult {
  if (!Number.isInteger(input.tileX) || !Number.isInteger(input.tileY)) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Tọa độ ô phải là số nguyên.',
    };
  }

  const catalogItem = getCatalogItem(input.sku);
  if (!catalogItem) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Món nội thất không tồn tại trong danh mục.',
    };
  }

  if (!catalogItem.allowedMaps.includes(input.mapId)) {
    return {
      ok: false,
      code: 'WRONG_MAP',
      message: `${catalogItem.nameVi} không thể đặt ở khu vực này.`,
    };
  }

  const placedCount = countPlacedBySku(input.placements, input.sku, input.ignorePlacementId);
  if (placedCount >= catalogItem.starterQuantity) {
    return {
      ok: false,
      code: 'STOCK_EXCEEDED',
      message: `Bạn đã đặt hết ${catalogItem.starterQuantity} món ${catalogItem.nameVi}.`,
    };
  }

  const mapDef = getMapDefinition(input.mapId);
  const footprint = getFootprintTiles(
    input.tileX,
    input.tileY,
    catalogItem.widthTiles,
    catalogItem.heightTiles,
  );

  for (const tile of footprint) {
    if (
      tile.tileX < 0 ||
      tile.tileY < 0 ||
      tile.tileX >= mapDef.widthTiles ||
      tile.tileY >= mapDef.heightTiles
    ) {
      return {
        ok: false,
        code: 'OUT_OF_BOUNDS',
        message: 'Vị trí đặt vượt ra ngoài bản đồ.',
      };
    }

    if (mapDef.isStaticBlocked(tile.tileX, tile.tileY)) {
      return {
        ok: false,
        code: 'BLOCKED_TILE',
        message: 'Không thể đặt đồ lên tường, hàng rào hoặc gốc cây.',
      };
    }

    if (mapDef.isNoPlaceZone(tile.tileX, tile.tileY)) {
      return {
        ok: false,
        code: 'NO_PLACE_ZONE',
        message: 'Cần chừa lối đi trước cửa ra vào.',
      };
    }
  }

  // Check layerSlot tile collisions against existing placements
  const occupiedKeys = new Set<string>();
  for (const existing of input.placements) {
    if (existing.id === input.ignorePlacementId) continue;
    if (existing.mapId !== input.mapId) continue;
    if (existing.layerSlot !== catalogItem.layerSlot) continue;
    for (const tile of getFootprintTiles(
      existing.tileX,
      existing.tileY,
      existing.widthTiles,
      existing.heightTiles,
    )) {
      occupiedKeys.add(`${tile.tileX},${tile.tileY}`);
    }
  }

  for (const tile of footprint) {
    if (occupiedKeys.has(`${tile.tileX},${tile.tileY}`)) {
      return {
        ok: false,
        code: 'TILE_OCCUPIED',
        message: 'Ô này đã có món đồ khác chiếm chỗ.',
      };
    }
  }

  return { ok: true, tiles: footprint };
}

export function buildMovementCollisionGrid(
  mapId: MapId,
  placements: readonly FurniturePlacement[],
): Set<string> {
  const mapDef = getMapDefinition(mapId);
  const blocked = new Set<string>();

  for (let y = 0; y < mapDef.heightTiles; y += 1) {
    for (let x = 0; x < mapDef.widthTiles; x += 1) {
      if (mapDef.isStaticBlocked(x, y)) {
        blocked.add(`${x},${y}`);
      }
    }
  }

  for (const placement of placements) {
    if (placement.mapId !== mapId) continue;
    const item = getCatalogItem(placement.sku);
    if (!item?.blocksMovement) continue;
    for (const tile of getFootprintTiles(
      placement.tileX,
      placement.tileY,
      placement.widthTiles,
      placement.heightTiles,
    )) {
      blocked.add(`${tile.tileX},${tile.tileY}`);
    }
  }

  return blocked;
}

export function findPlacementAtTile(
  mapId: MapId,
  tileX: number,
  tileY: number,
  placements: readonly FurniturePlacement[],
): FurniturePlacement | undefined {
  // Prioritize 'object' layer over 'floor' layer when tapping overlapping items
  const matches = placements.filter((p) => {
    if (p.mapId !== mapId) return false;
    return (
      tileX >= p.tileX &&
      tileX < p.tileX + p.widthTiles &&
      tileY >= p.tileY &&
      tileY < p.tileY + p.heightTiles
    );
  });
  return matches.find((p) => p.layerSlot === 'object') ?? matches[0];
}
