import { adjustInventoryQuantity } from './inventoryLedger.mjs';
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
) {
  if (!getV015CatalogItem(itemSku)) {
    return { ok: false, code: 'NOT_FOUND' } as const;
  }
  return adjustInventoryQuantity(entries, worldId, ownerScope, itemSku, delta, nowIso);
}
