/**
 * Farm barn pantry — crop → processed goods (server-side debit/credit only).
 */

import { requireItem } from '../economy/catalogConfig';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import type { ItemQuality } from '../economy/types';

export const FARM_PANTRY_PROCESSABLE_SKUS = [
  'flour',
  'strawberry_jam',
  'carrot_soup',
] as const;

export type FarmPantryRecipeSku = (typeof FARM_PANTRY_PROCESSABLE_SKUS)[number];

export interface FarmPantryRecipeView {
  readonly outputSku: FarmPantryRecipeSku;
  readonly nameVi: string;
  readonly inputs: readonly { sku: string; qty: number }[];
}

export function listFarmPantryRecipes(): FarmPantryRecipeView[] {
  return FARM_PANTRY_PROCESSABLE_SKUS.map((outputSku) => {
    const def = requireItem(outputSku);
    const inputs = def.inputs ?? [];
    if (inputs.length === 0) {
      throw new Error(`Pantry recipe ${outputSku} has no catalog inputs`);
    }
    return { outputSku, nameVi: def.nameVi, inputs };
  });
}

function sharedQty(
  items: readonly InventoryEntry[],
  sku: string,
  quality: ItemQuality = 'normal',
): number {
  return items
    .filter((r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality)
    .reduce((n, r) => n + r.qty, 0);
}

function debitShared(
  items: InventoryEntry[],
  sku: string,
  qty: number,
  quality: ItemQuality = 'normal',
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

function creditShared(
  worldId: string,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  nowMs: number,
  quality: ItemQuality = 'normal',
): InventoryEntry[] {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
  );
  if (idx >= 0) next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty };
  else {
    next.push({
      worldId,
      ownerScope: 'shared',
      itemSku: sku,
      qty,
      quality,
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return next;
}

export function processFarmPantryRecipe(
  worldId: string,
  items: InventoryEntry[],
  outputSku: string,
  nowMs: number,
):
  | { ok: true; items: InventoryEntry[] }
  | { ok: false; code: string; messageVi: string } {
  if (!FARM_PANTRY_PROCESSABLE_SKUS.includes(outputSku as FarmPantryRecipeSku)) {
    return { ok: false, code: 'UNKNOWN_RECIPE', messageVi: 'Công thức chưa mở.' };
  }
  let def;
  try {
    def = requireItem(outputSku);
  } catch {
    return { ok: false, code: 'UNKNOWN_SKU', messageVi: 'Không tìm thấy sản phẩm.' };
  }
  const inputs = def.inputs ?? [];
  if (inputs.length === 0) {
    return { ok: false, code: 'NOT_CRAFTABLE', messageVi: 'Món này chưa chế biến được.' };
  }
  for (const line of inputs) {
    if (sharedQty(items, line.sku) < line.qty) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Thiếu nguyên liệu trong túi chung.' };
    }
  }
  let next = items.map((r) => ({ ...r }));
  for (const line of inputs) {
    const debited = debitShared(next, line.sku, line.qty);
    if (!debited) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Thiếu nguyên liệu trong túi chung.' };
    }
    next = debited;
  }
  next = creditShared(worldId, next, outputSku, 1, nowMs);
  return { ok: true, items: next };
}