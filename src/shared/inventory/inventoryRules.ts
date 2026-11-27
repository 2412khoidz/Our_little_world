import type {
  InventoryCatalogItem,
  InventoryEntry,
  InventoryOwnerScope,
} from './inventoryTypes';

export const PET_KIBBLE_BASIC_SKU = 'pet_kibble_basic';
export const FREE_KIBBLE_CLAIM_QTY = 3;

import { CANONICAL_K5_STARTER_CATALOG } from '../catalog/canonicalCatalog.ts';

/** Starter V0.1.5 projection from canonical catalog (no currency/prices). */
export const V015_ITEM_CATALOG: readonly InventoryCatalogItem[] = CANONICAL_K5_STARTER_CATALOG;

const CATALOG_MAP = new Map(V015_ITEM_CATALOG.map((item) => [item.sku, item]));

export function getV015CatalogItem(sku: string): InventoryCatalogItem | undefined {
  return CATALOG_MAP.get(sku);
}

export function getUtcDateString(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function isValidOwnerScope(scope: string): scope is InventoryOwnerScope {
  return scope === 'shared' || /^user:[0-9a-f-]{6,}$/i.test(scope);
}

export function canActorAccessScope(actorUserId: string, scope: string): boolean {
  return scope === 'shared' || scope === `user:${actorUserId}`;
}

export function getSharedKibbleQty(items: readonly InventoryEntry[]): number {
  const row = items.find(
    (it) => it.ownerScope === 'shared' && it.itemSku === PET_KIBBLE_BASIC_SKU,
  );
  return row ? row.qty : 0;
}

export function isEligibleForDailyFreeKibble(
  items: readonly InventoryEntry[],
  lastClaimDateUtc: string | null | undefined,
  serverNowMs: number,
): boolean {
  if (getSharedKibbleQty(items) > 0) return false;
  const todayUtc = getUtcDateString(serverNowMs);
  return lastClaimDateUtc !== todayUtc;
}

export function applyInventoryDeltaInPlace(
  entries: InventoryEntry[],
  worldId: string,
  ownerScope: InventoryOwnerScope,
  itemSku: string,
  delta: number,
  nowIso: string,
): { ok: true; qty: number } | { ok: false; code: 'NOT_FOUND' | 'INSUFFICIENT_ITEMS' | 'STACK_FULL' } {
  const catalog = getV015CatalogItem(itemSku);
  if (!catalog) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  const idx = entries.findIndex(
    (e) => e.worldId === worldId && e.ownerScope === ownerScope && e.itemSku === itemSku,
  );
  const currentQty = idx >= 0 ? entries[idx]!.qty : 0;
  const nextQty = currentQty + delta;

  if (nextQty < 0) {
    return { ok: false, code: 'INSUFFICIENT_ITEMS' };
  }
  if (nextQty > catalog.stackLimit) {
    return { ok: false, code: 'STACK_FULL' };
  }

  if (nextQty === 0) {
    if (idx >= 0) entries.splice(idx, 1);
    return { ok: true, qty: 0 };
  }

  const nextRow: InventoryEntry = {
    worldId,
    ownerScope,
    itemSku,
    qty: nextQty,
    updatedAt: nowIso,
  };
  if (idx >= 0) {
    entries[idx] = nextRow;
  } else {
    entries.push(nextRow);
  }
  return { ok: true, qty: nextQty };
}
