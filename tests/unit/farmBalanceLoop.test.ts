import { describe, expect, it } from 'vitest';
import { applyFarmAction, buySeed, emptyFarm, FARM_STARTER_COINS } from '../../src/shared/farming/serverApply';
import { applyFarmShippingBinSale } from '../../src/shared/farming/farmShipping';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';

const TOOLS: InventoryEntry[] = [
  {
    worldId: 'w',
    ownerScope: 'shared',
    itemSku: 'tool_hoe',
    qty: 1,
    quality: 'normal',
    updatedAt: '',
  },
  {
    worldId: 'w',
    ownerScope: 'shared',
    itemSku: 'tool_watering_can',
    qty: 1,
    quality: 'normal',
    updatedAt: '',
  },
  {
    worldId: 'w',
    ownerScope: 'shared',
    itemSku: 'seed_wheat',
    qty: 3,
    quality: 'normal',
    updatedAt: '',
  },
];

/** One till→plant→water→harvest→ship→buy loop under fast growth (simulated time). */
describe('farmBalanceLoop', () => {
  it('completes reinvest loop within a few simulated minutes', () => {
    const startMs = 1_000_000;
    const growMs = 5 * 60_000;
    let farm = emptyFarm(42);
    let items = [...TOOLS];
    let coins = FARM_STARTER_COINS;
    const timeScale = 120;

    let applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: coins,
      inventoryItems: items,
      nowMs: startMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'till', idempotencyKey: 't1' },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error(applied.messageVi);
    farm = applied.farm;
    items = applied.inventory;

    applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: coins,
      inventoryItems: items,
      nowMs: startMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'plant', seedSku: 'seed_wheat', idempotencyKey: 'p1' },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error(applied.messageVi);
    farm = applied.farm;
    items = applied.inventory;

    applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: coins,
      inventoryItems: items,
      nowMs: startMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'water', idempotencyKey: 'w1' },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error(applied.messageVi);
    farm = applied.farm;
    items = applied.inventory;

    const harvestMs = startMs + Math.ceil(growMs / timeScale) + 1000;
    applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: coins,
      inventoryItems: items,
      nowMs: harvestMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'harvest', idempotencyKey: 'h1' },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) throw new Error(applied.messageVi);
    items = applied.inventory;

    const shipped = applyFarmShippingBinSale(
      coins,
      items,
      { soldByGroup: {}, dayIndex: 0 },
      {
        lines: [{ sku: 'wheat', qty: 1, quality: 'normal' }],
        nowMs: harvestMs,
        idempotencyKey: 's1',
        actorId: 'p1',
      },
    );
    expect(shipped.ok).toBe(true);
    if (!shipped.ok) throw new Error(shipped.messageVi);
    coins = shipped.walletCoins;
    items = shipped.items;

    const bought = buySeed('w', coins, items, 'seed_wheat', 1, harvestMs);
    expect(bought.ok).toBe(true);
    if (!bought.ok) throw new Error(bought.messageVi);
    expect(bought.walletCoins).toBeLessThan(coins);
    expect(bought.items.some((i) => i.itemSku === 'seed_wheat')).toBe(true);
  });
});