import { MAX_INVENTORY_QUANTITY } from '../../src/shared/inventory/inventoryLedger.mjs';
import { describe, expect, it } from 'vitest';
import {
  applyInventoryDeltaInPlace,
  canActorAccessScope,
  FREE_KIBBLE_CLAIM_QTY,
  getSharedKibbleQty,
  getV015CatalogItem,
  isEligibleForDailyFreeKibble,
  PET_KIBBLE_BASIC_SKU,
  V015_ITEM_CATALOG,
} from '../../src/shared/inventory/inventoryRules';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';

describe('V0.1.5 Inventory Rules (K5)', () => {
  it('provides non-tradeable starter SKUs with valid stack limits', () => {
    expect(V015_ITEM_CATALOG.length).toBeGreaterThanOrEqual(5);
    for (const item of V015_ITEM_CATALOG) {
      expect(item.stackLimit).toBeGreaterThan(0);
      expect(item.tradeable).toBe(false);
    }
    expect(getV015CatalogItem(PET_KIBBLE_BASIC_SKU)?.purpose).toBe('pet_food');
  });

  it('enforces scope visibility strictly for shared and caller personal pockets', () => {
    const alice = '11111111-1111-4111-8111-111111111111';
    const bob = '22222222-2222-4222-8222-222222222222';
    expect(canActorAccessScope(alice, 'shared')).toBe(true);
    expect(canActorAccessScope(alice, `user:${alice}`)).toBe(true);
    expect(canActorAccessScope(alice, `user:${bob}`)).toBe(false);
  });

  it('applies atomic add/consume deltas, deleting zero rows and rejecting overflow/negative', () => {
    const items: InventoryEntry[] = [];
    const nowIso = '2026-11-25T00:00:00.000Z';

    const r1 = applyInventoryDeltaInPlace(items, 'w1', 'shared', PET_KIBBLE_BASIC_SKU, FREE_KIBBLE_CLAIM_QTY, nowIso);
    expect(r1).toEqual({ ok: true, qty: 3 });
    expect(getSharedKibbleQty(items)).toBe(3);

    const overflow = applyInventoryDeltaInPlace(items, 'w1', 'shared', PET_KIBBLE_BASIC_SKU, MAX_INVENTORY_QUANTITY, nowIso);
    expect(overflow).toEqual({ ok: false, code: 'STACK_FULL' });

    const consumeAll = applyInventoryDeltaInPlace(items, 'w1', 'shared', PET_KIBBLE_BASIC_SKU, -3, nowIso);
    expect(consumeAll).toEqual({ ok: true, qty: 0 });
    expect(items).toHaveLength(0);

    const underflow = applyInventoryDeltaInPlace(items, 'w1', 'shared', PET_KIBBLE_BASIC_SKU, -1, nowIso);
    expect(underflow).toEqual({ ok: false, code: 'INSUFFICIENT_ITEMS' });
  });

  it('allows daily free kibble only once per UTC day when shared kibble stock is zero', () => {
    const nowMs = Date.parse('2026-11-25T10:00:00.000Z');
    const items: InventoryEntry[] = [];
    expect(isEligibleForDailyFreeKibble(items, null, nowMs)).toBe(true);
    expect(isEligibleForDailyFreeKibble(items, '2026-11-24', nowMs)).toBe(true);
    expect(isEligibleForDailyFreeKibble(items, '2026-11-25', nowMs)).toBe(false);

    applyInventoryDeltaInPlace(items, 'w1', 'shared', PET_KIBBLE_BASIC_SKU, 1, '2026-11-25T00:00:00.000Z');
    expect(isEligibleForDailyFreeKibble(items, '2026-11-24', nowMs)).toBe(false);
  });
});
