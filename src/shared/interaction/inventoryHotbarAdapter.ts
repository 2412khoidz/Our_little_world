import { getCatalogItem } from '../catalog';
import { PET_KIBBLE_BASIC_SKU } from '../inventory/inventoryRules';
import type { InventorySnapshot } from '../inventory/inventoryTypes';
import { PET_FOOD_CATALOG } from '../petLiving/petFoodCatalog';
import type { HeldItemKind, HotbarSlot } from './interactionTypes';

const EMPTY_SLOT: Omit<HotbarSlot, 'slotIndex'> = {
  itemSku: null,
  itemKind: 'none',
  iconId: null,
  labelVi: 'Trống',
  qty: 0,
};

/** SKUs shown on the main-game hotbar, in display order (Mission 02 may extend). */
export const MAIN_GAME_HOTBAR_SKU_ORDER = [
  PET_KIBBLE_BASIC_SKU,
  'fish_salmon_bite',
  'fish_carp_grilled',
  'cat_broth_warm',
  'chicken_pumpkin_mash',
] as const;

function skuToHeldKind(sku: string): HeldItemKind {
  const food = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  if (food) return 'food';
  if (sku === 'water_pitcher') return 'water_pitcher';
  if (sku.startsWith('toy_')) return 'toy';
  return 'tool';
}

function labelForSku(sku: string, snapshot: InventorySnapshot): string {
  const fromFood = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  if (fromFood) return fromFood.nameVi;
  const fromCatalog = snapshot.catalog.find((c) => c.sku === sku);
  if (fromCatalog) return fromCatalog.nameVi;
  const furn = getCatalogItem(sku);
  return furn?.nameVi ?? sku;
}

function iconForSku(sku: string): HotbarSlot['iconId'] {
  const food = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  return food?.iconId ?? (sku === 'water_pitcher' ? 'water_pitcher_full' : 'food_kibble');
}

/**
 * Read-only projection of inventory into 8 hotbar slots (no client-side qty mutation).
 * Adapter surface for Mission 02 Unified Catalog — swap implementation when contract lands.
 */
export function buildHotbarSlotsFromInventory(snapshot: InventorySnapshot | null): HotbarSlot[] {
  const base: HotbarSlot[] = Array.from({ length: 8 }, (_, slotIndex) => ({
    slotIndex,
    ...EMPTY_SLOT,
  }));

  if (!snapshot) return base;

  const qtyBySku = new Map<string, number>();
  for (const row of snapshot.items) {
    if (row.ownerScope !== 'shared') continue;
    qtyBySku.set(row.itemSku, (qtyBySku.get(row.itemSku) ?? 0) + row.qty);
  }

  let nextSlot = 0;
  for (const sku of MAIN_GAME_HOTBAR_SKU_ORDER) {
    const qty = qtyBySku.get(sku) ?? 0;
    if (qty <= 0 || nextSlot >= 8) continue;
    base[nextSlot] = {
      slotIndex: nextSlot,
      itemSku: sku,
      itemKind: skuToHeldKind(sku),
      iconId: iconForSku(sku),
      labelVi: labelForSku(sku, snapshot),
      qty,
      quality: 'normal',
    };
    nextSlot += 1;
  }

  return base;
}

export interface Mission02InventoryAdapterContract {
  /** Future: load hotbar projection from authoritative catalog + stacks. */
  readonly source: 'v015-inventory-snapshot' | 'unified-catalog-v2';
  buildHotbarSlots(worldId: string): Promise<HotbarSlot[]>;
}