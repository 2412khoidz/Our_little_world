import type { InventoryEntry, InventoryOwnerScope, ItemQualityTier } from './inventoryTypes';

export const MAX_INVENTORY_QUANTITY: number;

export function adjustInventoryQuantity(
  entries: InventoryEntry[],
  worldId: string,
  ownerScope: InventoryOwnerScope,
  itemSku: string,
  delta: number,
  updatedAt: string,
  quality?: ItemQualityTier,
): { ok: true; qty: number } | { ok: false; code: 'INSUFFICIENT_ITEMS' | 'VALIDATION_ERROR' | 'STACK_FULL' };

export function normalizeInventoryRows(rows: readonly InventoryEntry[], worldId: string): InventoryEntry[];

export class InventoryQuantityError extends Error {
  constructor(code: string);
  readonly code: string;
}

export function creditInventoryQuantity(
  entries: InventoryEntry[],
  worldId: string,
  ownerScope: InventoryOwnerScope,
  itemSku: string,
  qty: number,
  updatedAt: string,
  quality?: ItemQualityTier,
): InventoryEntry[];
