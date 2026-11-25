import { describe, expect, it } from 'vitest';
import { applyFarmShippingBinSale } from '../../src/shared/farming/farmShipping';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';

const nowMs = Date.UTC(2026, 10, 25, 10, 0);

const row = (sku: string, qty: number, quality: 'normal' | 'silver' | 'gold' = 'normal'): InventoryEntry => ({
  worldId: 'w',
  ownerScope: 'shared',
  itemSku: sku,
  qty,
  quality,
  updatedAt: new Date(nowMs).toISOString(),
});

describe('farmShipping', () => {
  it('sells wheat via shipping bin with coins and debit', () => {
    const sold = applyFarmShippingBinSale(
      10,
      [row('wheat', 2)],
      { soldByGroup: {}, dayIndex: 0 },
      {
        lines: [{ sku: 'wheat', qty: 1, quality: 'normal' }],
        nowMs,
        idempotencyKey: 'ship-1',
        actorId: 'u1',
      },
    );
    expect(sold.ok).toBe(true);
    if (!sold.ok) throw new Error(sold.messageVi);
    expect(sold.walletCoins).toBeGreaterThan(10);
    expect(sold.items.find((i) => i.itemSku === 'wheat')?.qty).toBe(1);
  });
});