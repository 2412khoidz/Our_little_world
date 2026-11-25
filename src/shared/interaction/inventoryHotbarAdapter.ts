import { getCatalogItem } from '../catalog';
import { PET_KIBBLE_BASIC_SKU } from '../inventory/inventoryRules';
import type { InventorySnapshot } from '../inventory/inventoryTypes';
import { PET_FOOD_CATALOG } from '../petLiving/petFoodCatalog';
import { type HotbarStackKey } from './heldItemIdentity';
import type { HeldItemKind, HotbarSlot } from './interactionTypes';

export type { HotbarStackKey, ItemQualityTier } from './heldItemIdentity';

const EMPTY_SLOT: Omit<HotbarSlot, 'slotIndex'> = {
  itemSku: null,
  itemKind: 'none',
  iconId: null,
  labelVi: 'Trống',
  qty: 0,
};

/**
 * Initial hotbar allowlist for V0.1.5 main game — **not** a generic full-inventory hotbar.
 * Mission 02 Unified Catalog must replace this projection with `HotbarStackKey` rows (ownerScope + sku + quality).
 */
export const MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST = [
  PET_KIBBLE_BASIC_SKU,
  'fish_salmon_bite',
  'fish_carp_grilled',
  'cat_broth_warm',
  'chicken_pumpkin_mash',
  'toy_yarn',
  'toy_cardboard_box',
  'water_pitcher',
] as const;

/** @deprecated Use MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST — name kept for call sites until Mission 02. */
export const MAIN_GAME_HOTBAR_SKU_ORDER = MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST;

function stackKeyString(key: HotbarStackKey): string {
  return `${key.ownerScope}|${key.itemSku}|${key.quality}`;
}

/**
 * V0.1.5-only aggregation: sums shared rows per SKU, forces quality `normal`.
 * **Must not** ship as Mission 02 adapter — quality tiers require separate stacks.
 */
export function aggregateSharedStacksV015(snapshot: InventorySnapshot): Map<string, { key: HotbarStackKey; qty: number }> {
  const map = new Map<string, { key: HotbarStackKey; qty: number }>();
  for (const row of snapshot.items) {
    if (row.ownerScope !== 'shared') continue;
    const key: HotbarStackKey = {
      ownerScope: 'shared',
      itemSku: row.itemSku,
      quality: 'normal',
    };
    const id = stackKeyString(key);
    const prev = map.get(id);
    map.set(id, { key, qty: (prev?.qty ?? 0) + row.qty });
  }
  return map;
}

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
  if (food) return food.iconId;
  if (sku === 'water_pitcher') return 'water_pitcher_full';
  if (sku === 'toy_yarn') return 'yarn_ball';
  if (sku === 'toy_cardboard_box') return 'cardboard_box';
  return 'food_kibble';
}

/**
 * Read-only projection of inventory into 8 hotbar slots (no client-side qty mutation).
 * Adapter surface for Mission 02 Unified Catalog — swap implementation when contract lands.
 */
export function buildHotbarSlotsFromInventory(snapshot: InventorySnapshot | null, userId?: string): HotbarSlot[] {
  const base: HotbarSlot[] = Array.from({ length: 8 }, (_, slotIndex) => ({
    slotIndex,
    ...EMPTY_SLOT,
  }));

  if (!snapshot) return base;

  const allowed = new Set<string>(MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST);
  const stacks = new Map<string, { key: HotbarStackKey; qty: number }>();
  for (const row of snapshot.items) {
    if (!allowed.has(row.itemSku)) continue;
    if (row.ownerScope !== 'shared' && row.ownerScope !== 'user:' + userId) continue;
    const key: HotbarStackKey = {
      ownerScope: row.ownerScope,
      itemSku: row.itemSku,
      quality: row.quality ?? 'normal',
    };
    const id = stackKeyString(key);
    const existing = stacks.get(id);
    stacks.set(id, { key, qty: (existing?.qty ?? 0) + row.qty });
  }

  const ordered = [...stacks.values()].sort((a, b) =>
    a.key.itemSku.localeCompare(b.key.itemSku) ||
    a.key.ownerScope.localeCompare(b.key.ownerScope) ||
    a.key.quality.localeCompare(b.key.quality),
  );
  for (const [slotIndex, stack] of ordered.slice(0, base.length).entries()) {
    const sku = stack.key.itemSku;
    base[slotIndex] = {
      slotIndex,
      ownerScope: stack.key.ownerScope,
      itemSku: sku,
      itemKind: skuToHeldKind(sku),
      iconId: iconForSku(sku),
      labelVi: labelForSku(sku, snapshot),
      qty: stack.qty,
      quality: stack.key.quality,
      ...(sku === 'water_pitcher' ? { waterFillLevel: 72 } : {}),
    };
  }

  return base;
}

export interface Mission02InventoryAdapterContract {
  readonly source: 'unified-catalog-v2';
  /** One hotbar cell per `HotbarStackKey` — no cross-quality qty merge. */
  buildHotbarSlots(worldId: string): Promise<HotbarSlot[]>;
}

/** Food allowlist projection keeps each owner and quality tier separate. */
export const INVENTORY_HOTBAR_ADAPTER_IMPLEMENTATION = 'quality-scoped-food-projection' as const;