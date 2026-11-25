export type InventoryOwnerScope = 'shared' | `user:${string}`;

export type ItemPurpose = 'pet_food' | 'gift' | 'stationery' | 'keepsake' | 'seed' | 'crop' | 'fish' | 'dish' | 'ingredient';

export interface InventoryCatalogItem {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  purpose: ItemPurpose;
  stackLimit: number;
  tradeable: boolean;
}

export interface InventoryEntry {
  worldId: string;
  ownerScope: InventoryOwnerScope;
  itemSku: string;
  quality?: 'normal' | 'silver' | 'gold';
  qty: number;
  updatedAt: string;
}

export interface InventorySnapshot {
  worldId: string;
  serverNowMs: number;
  serverDateUtc: string;
  canClaimFreeKibble: boolean;
  catalog: readonly InventoryCatalogItem[];
  items: InventoryEntry[];
}
