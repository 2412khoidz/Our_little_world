/**
 * Shipping bin sales against shared inventory rows (quality-aware stacks).
 */

import {
  rollSaturationDay,
  sellToShippingBin,
  type SellLine,
  type ShippingBinState,
} from '../economy/shippingBin';
import { createWallet, inventoryQty } from '../economy/ledgerMath';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import type { ItemQuality } from '../economy/types';

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

export const FARM_SHOP_SEED_SKUS = [
  'seed_wheat',
  'seed_carrot',
  'seed_tomato',
  'seed_strawberry',
] as const;

export const FARM_SELLABLE_CROP_SKUS = ['wheat', 'carrot', 'tomato', 'strawberry', 'sunflower', 'cabbage'] as const;