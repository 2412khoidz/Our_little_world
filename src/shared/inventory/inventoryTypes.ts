export type InventoryOwnerScope = 'shared' | `user:${string}`;

export type ItemPurpose =
  | 'pet_food'
  | 'gift'
  | 'stationery'
  | 'keepsake'
  | 'seed'
  | 'crop'
  | 'fish'
  | 'dish'
  | 'ingredient'
  | 'tree_sapling'
  | 'fruit'
  | 'flower'
  | 'bouquet'
  | 'livestock_feed'
  | 'animal_product'
  | 'fertilizer'
  | 'sprinkler'
  | 'tool'
  | 'artisan';

export type ItemQualityTier = 'normal' | 'silver' | 'gold';

export type CanonicalItemSource =
  | 'starter'
  | 'shop'
  | 'farming'
  | 'orchard'
  | 'flower_breed'
  | 'livestock'
  | 'foraging'
  | 'fishing'
  | 'workshop'
  | 'cooking'
  | 'seed_maker'
  | 'order_board';

export type CanonicalItemUse =
  | 'plant'
  | 'plant_orchard'
  | 'plant_flower'
  | 'fertilize'
  | 'irrigate'
  | 'tool_upgrade'
  | 'feed_livestock'
  | 'feed_pet'
  | 'cook_recipe'
  | 'workshop_recipe'
  | 'craft_bouquet'
  | 'seed_maker'
  | 'sell_bin'
  | 'order_board'
  | 'gift_partner'
  | 'keepsake'
  | 'stationery';

export interface InventoryCatalogItem {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  purpose: ItemPurpose;
  stackLimit: number;
  tradeable: boolean;
  category?: string;
  iconId?: string;
  sellPrice?: number;
  buyPrice?: number | null;
  sources?: readonly CanonicalItemSource[];
  uses?: readonly CanonicalItemUse[];
  qualityTiers?: readonly ItemQualityTier[];
  donorSource?: string;
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
  physicalVersion?: number;
  catalog: readonly InventoryCatalogItem[];
  items: InventoryEntry[];
}
