/**
 * Shipping bin sales against shared inventory rows (quality-aware stacks).
 */

import { ITEM_CATALOG } from '../economy/catalogConfig';
import {
  rollSaturationDay,
  sellToShippingBin,
  type SellLine,
  type ShippingBinState,
} from '../economy/shippingBin';
import { createWallet, inventoryQty } from '../economy/ledgerMath';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import type { ItemDefinition, ItemQuality } from '../economy/types';
import { farmShopSeedSkus } from '../shop/farmShopCatalog.ts';

export interface FarmShippingMeta {
  soldByGroup: Record<string, number>;
  dayIndex: number;
}

export interface FarmShipRequest {
  lines: SellLine[];
  nowMs: number;
  idempotencyKey: string;
  actorId: string;
}

function sharedQty(items: readonly InventoryEntry[], sku: string, quality: ItemQuality): number {
  return items
    .filter((r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality)
    .reduce((n, r) => n + r.qty, 0);
}

function sharedInventoryState(items: readonly InventoryEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of items) {
    if (row.ownerScope !== 'shared') continue;
    map[row.itemSku] = (map[row.itemSku] ?? 0) + row.qty;
  }
  return map;
}

function debitSharedRow(
  items: InventoryEntry[],
  sku: string,
  quality: ItemQuality,
  qty: number,
): InventoryEntry[] | null {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
  );
  if (idx < 0 || next[idx]!.qty < qty) return null;
  next[idx] = { ...next[idx]!, qty: next[idx]!.qty - qty };
  if (next[idx]!.qty === 0) next.splice(idx, 1);
  return next;
}

function validateLines(items: readonly InventoryEntry[], lines: readonly SellLine[]): string | null {
  const needed = new Map<string, number>();
  for (const line of lines) {
    const quality = line.quality ?? 'normal';
    if (sharedQty(items, line.sku, quality) < line.qty) {
      return `Không đủ ${line.sku} (${quality}) trong kho chung.`;
    }
    needed.set(line.sku, (needed.get(line.sku) ?? 0) + line.qty);
  }
  for (const [sku, qty] of needed) {
    if (inventoryQty(sharedInventoryState(items), sku) < qty) {
      return `Không đủ ${sku} trong kho chung.`;
    }
  }
  return null;
}

export function applyFarmShippingBinSale(
  walletCoins: number,
  items: InventoryEntry[],
  meta: FarmShippingMeta,
  request: FarmShipRequest,
):
  | {
      ok: true;
      walletCoins: number;
      items: InventoryEntry[];
      meta: FarmShippingMeta;
      totalCoins: number;
    }
  | { ok: false; code: string; messageVi: string } {
  const err = validateLines(items, request.lines);
  if (err) return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: err };

  const binState: ShippingBinState = rollSaturationDay(
    {
      wallet: createWallet(walletCoins),
      inventory: sharedInventoryState(items),
      soldByGroup: { ...meta.soldByGroup },
      dayIndex: meta.dayIndex,
    },
    request.nowMs,
  );

  const sale = sellToShippingBin(binState, request);
  if (!sale.ok) {
    return { ok: false, code: sale.code, messageVi: sale.messageVi };
  }

  let nextItems = items.map((r) => ({ ...r }));
  for (const line of request.lines) {
    const quality = line.quality ?? 'normal';
    const debited = debitSharedRow(nextItems, line.sku, quality, line.qty);
    if (!debited) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Không đủ nông sản trong kho chung.' };
    }
    nextItems = debited;
  }

  return {
    ok: true,
    walletCoins: sale.state.wallet.coins,
    items: nextItems,
    meta: { soldByGroup: { ...sale.state.soldByGroup }, dayIndex: sale.dayIndex },
    totalCoins: sale.totalCoins,
  };
}

/** @deprecated import `farmShopSeedSkus` — kept for tests & grep stability. */
export const FARM_SHOP_SEED_SKUS = farmShopSeedSkus('V0.2.0') as readonly string[];

export const FARM_SELLABLE_CROP_SKUS = [
  'wheat',
  'carrot',
  'tomato',
  'strawberry',
  'sunflower',
  'rose_pink',
  'rose_sakura',
  'cabbage',
  'peach',
] as const;

export const FARM_SELLABLE_FISH_SKUS = [
  'carp_pond',
  'fish_minnow',
  'fish_catfish',
  'fish_bass',
  'donor_trout_stream',
  'koi_pastel',
  'lotus_trout',
  'fish_pike',
  'fish_puffer',
  'fish_swordfish',
  'fish_golden_koi',
] as const;

export const FARM_SELLABLE_ALL_SKUS = [
  ...FARM_SELLABLE_CROP_SKUS,
  ...FARM_SELLABLE_FISH_SKUS,
] as const;

export type FarmShopCategoryId = 'seeds' | 'saplings' | 'farm_care' | 'pantry_feed' | 'tools';

export function farmShopItemsByCategory(cat: FarmShopCategoryId): readonly ItemDefinition[] {
  return ITEM_CATALOG.filter((item) => {
    if (item.storeBuy === null || item.storeBuy <= 0) return false;
    if (cat === 'seeds') return item.group === 'seed';
    if (cat === 'saplings') return item.group === 'tree_sapling';
    if (cat === 'farm_care') return item.group === 'fertilizer' || item.group === 'sprinkler';
    if (cat === 'pantry_feed') return item.group === 'feed' || item.group === 'pantry' || item.group === 'bait';
    return item.group === 'tool';
  });
}

export function listShippableCatalogSkus(): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of ITEM_CATALOG) {
    if (item.sellPrice > 0 && item.sellChannels.includes('shipping_bin') && !seen.has(item.sku)) {
      seen.add(item.sku);
      out.push(item.sku);
    }
  }
  for (const fishSku of FARM_SELLABLE_FISH_SKUS) {
    if (!seen.has(fishSku)) {
      seen.add(fishSku);
      out.push(fishSku);
    }
  }
  return out;
}