import { propsIconIdForCatalogSku } from '../art/catalogSkuPropsIcon';
import { getCatalogItem } from '../catalog';
import { resolveCanonicalFishBySku } from '../donor/fishing/canonicalFishRegistry';
import { getItem } from '../economy/catalogConfig';
import type { InventoryStackRef } from '../inventory/inventoryLayoutStore';
import type { InventorySnapshot } from '../inventory/inventoryTypes';
import { PET_FOOD_CATALOG } from '../petLiving/petFoodCatalog';
import {
  MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST,
  MAIN_GAME_HOTBAR_SLOT_PRIORITY,
  hotbarSkuToHeldKind,
} from './hotbarContract';
import { type HotbarStackKey } from './heldItemIdentity';
import type { HotbarSlot } from './interactionTypes';

export type { HotbarStackKey, ItemQualityTier } from './heldItemIdentity';
export {
  FARM_TOOL_HOTBAR_SKUS,
  MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST,
  PET_CARE_HOTBAR_SKUS,
  hotbarSkuToHeldKind,
  isPetHandFeedSku,
} from './hotbarContract';

const EMPTY_SLOT: Omit<HotbarSlot, 'slotIndex'> = {
  itemSku: null,
  itemKind: 'none',
  iconId: null,
  propsIconId: null,
  labelVi: 'Trống',
  qty: 0,
};

/** @deprecated Use MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST from hotbarContract — alias for legacy imports. */
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

function labelForSku(sku: string, snapshot: InventorySnapshot): string {
  const fromFood = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  if (fromFood) return fromFood.nameVi;
  const fromFish = resolveCanonicalFishBySku(sku);
  if (fromFish) return fromFish.labelVi;
  const fromCatalog = snapshot.catalog.find((c) => c.sku === sku);
  if (fromCatalog) return fromCatalog.nameVi;
  const fromEconomy = getItem(sku);
  if (fromEconomy) return fromEconomy.nameVi;
  const furn = getCatalogItem(sku);
  return furn?.nameVi ?? sku;
}

function hotbarVisualForSku(sku: string): Pick<HotbarSlot, 'iconId' | 'propsIconId'> {
  const food = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  if (food) return { iconId: food.iconId, propsIconId: null };
  if (sku === 'water_pitcher') return { iconId: 'water_pitcher_full', propsIconId: null };
  if (sku === 'rod_basic') return { iconId: null, propsIconId: 'prop.water_reed_b' };
  if (sku === 'toy_yarn') return { iconId: 'yarn_ball', propsIconId: null };
  if (sku === 'toy_cardboard_box') return { iconId: 'cardboard_box', propsIconId: null };
  const propsIconId = propsIconIdForCatalogSku(sku);
  if (propsIconId) return { iconId: null, propsIconId };
  return { iconId: null, propsIconId: null };
}

/**
 * Read-only projection of inventory into 8 hotbar slots (no client-side qty mutation).
 * Supports custom hotbar slot bindings from Nuvora bag while keeping `InventorySnapshot` authoritative.
 */
export function buildHotbarSlotsFromInventory(
  snapshot: InventorySnapshot | null,
  userId?: string,
  customBindings?: ReadonlyArray<InventoryStackRef | null>,
  waterFillBySku?: Readonly<Record<string, number>>,
): HotbarSlot[] {
  const base: HotbarSlot[] = Array.from({ length: 8 }, (_, slotIndex) => ({
    slotIndex,
    ...EMPTY_SLOT,
  }));

  if (!snapshot) return base;

  const stacks = new Map<string, { key: HotbarStackKey; qty: number }>();
  for (const row of snapshot.items) {
    if (row.qty <= 0) continue;
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

  if (customBindings) {
    for (let slotIndex = 0; slotIndex < base.length; slotIndex += 1) {
      const bound = customBindings[slotIndex];
      if (!bound) continue;
      const boundId = stackKeyString({
        ownerScope: bound.ownerScope,
        itemSku: bound.itemSku,
        quality: bound.quality,
      });
      const stack = stacks.get(boundId);
      if (!stack || stack.qty <= 0) continue;
      const sku = stack.key.itemSku;
      const visual = hotbarVisualForSku(sku);
      const isWaterTool = sku === 'water_pitcher' || sku === 'tool_watering_can';
      base[slotIndex] = {
        slotIndex,
        ownerScope: stack.key.ownerScope,
        itemSku: sku,
        itemKind: hotbarSkuToHeldKind(sku),
        iconId: visual.iconId,
        propsIconId: visual.propsIconId,
        labelVi: labelForSku(sku, snapshot),
        qty: stack.qty,
        quality: stack.key.quality,
        ...(isWaterTool ? { waterFillLevel: waterFillBySku?.[sku] ?? 72 } : {}),
      };
    }
    return base;
  }

  const allowed = new Set<string>(MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST);
  const priorityIndex = new Map<string, number>(
    MAIN_GAME_HOTBAR_SLOT_PRIORITY.map((sku, index) => [sku, index]),
  );
  const ordered = [...stacks.values()]
    .filter((entry) => allowed.has(entry.key.itemSku))
    .sort((a, b) => {
      const pa = priorityIndex.get(a.key.itemSku) ?? 999;
      const pb = priorityIndex.get(b.key.itemSku) ?? 999;
      if (pa !== pb) return pa - pb;
      return (
        a.key.ownerScope.localeCompare(b.key.ownerScope) ||
        a.key.quality.localeCompare(b.key.quality)
      );
    });
  for (const [slotIndex, stack] of ordered.slice(0, base.length).entries()) {
    const sku = stack.key.itemSku;
    const visual = hotbarVisualForSku(sku);
    const isWaterTool = sku === 'water_pitcher' || sku === 'tool_watering_can';
    base[slotIndex] = {
      slotIndex,
      ownerScope: stack.key.ownerScope,
      itemSku: sku,
      itemKind: hotbarSkuToHeldKind(sku),
      iconId: visual.iconId,
      propsIconId: visual.propsIconId,
      labelVi: labelForSku(sku, snapshot),
      qty: stack.qty,
      quality: stack.key.quality,
      ...(isWaterTool ? { waterFillLevel: waterFillBySku?.[sku] ?? 72 } : {}),
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