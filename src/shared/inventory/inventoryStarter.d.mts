import type { InventoryEntry } from './inventoryTypes';

export const INVENTORY_STARTER_VERSION: number;
export const STARTER_WALLET_COINS: number;
export function initializeWorldInventory(
  inventory: readonly InventoryEntry[],
  worldId: string,
  updatedAt: string,
  newWorld: boolean,
): InventoryEntry[];
