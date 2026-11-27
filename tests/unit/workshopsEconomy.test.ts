import { describe, expect, it } from 'vitest';
import {
  ALL_WORKSHOP_RECIPES,
  WORKSHOP_DEFS,
  cancelWorkshopJob,
  collectWorkshopReadyJobs,
  createWorkshopsState,
  queueWorkshopJob,
  recipesForWorkshop,
  upgradeWorkshopStation,
} from '../../src/shared/farming/workshops';
import { TOOL_UPGRADE_CATALOG, bestOwnedToolForFamily } from '../../src/shared/farming/toolUpgrades';
import {
  farmShopItemsByCategory,
  listShippableCatalogSkus,
} from '../../src/shared/farming/farmShipping';
import { generateOrderBoard, orderableItems } from '../../src/shared/economy/orderBoard';
import { runDeepEconomyBalanceAudit } from '../../src/shared/economy/balanceAudit';

describe('Checkpoint E — 8 workshops, production chains & economy balance audit', () => {
  it('transplants all 8 workshops and 80+ timestamped recipes with upgrade, queue & cancellation refund rules', () => {
    expect(WORKSHOP_DEFS).toHaveLength(8);
    expect(ALL_WORKSHOP_RECIPES.length).toBeGreaterThanOrEqual(80);
    for (const ws of WORKSHOP_DEFS) {
      expect(recipesForWorkshop(ws.id).length, ws.id).toBeGreaterThanOrEqual(7);
    }

    let state = createWorkshopsState();

    // Queue flour + olive_oil in mill
    const q1 = queueWorkshopJob(state, 'mill', 'flour', 1_000, 'u1');
    expect(q1.ok).toBe(true);
    if (!q1.ok) throw new Error(q1.messageVi);
    expect(q1.consumedInputs).toEqual([{ sku: 'wheat', qty: 2 }]);
    state = q1.state;

    const q2 = queueWorkshopJob(state, 'mill', 'olive_oil', 2_000, 'u2');
    expect(q2.ok).toBe(true);
    if (!q2.ok) throw new Error(q2.messageVi);
    // Second job chains seamlessly after q1.endMs!
    expect(q2.job.startMs).toBe(q1.job.endMs);
    state = q2.state;

    // Third job hits base capacity limit (2 slots)
    const full = queueWorkshopJob(state, 'mill', 'cornmeal', 3_000, 'u1');
    expect(full.ok).toBe(false);

    // Cancel second queued job mid-way -> refunds 100% inputs cleanly
    const cancelled = cancelWorkshopJob(state, 'mill', q2.job.jobId, 5_000);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) throw new Error(cancelled.messageVi);
    expect(cancelled.refundInputs).toEqual([{ sku: 'olive', qty: 1 }]);
    state = cancelled.state;

    // Storage cap blocks collection gracefully while leaving finished job intact
    const capped = collectWorkshopReadyJobs(state, 'mill', q1.job.endMs, () => 0.5, () => false);
    expect(capped.ok).toBe(false);

    // Upgrade mill to L2 and L3 and collect finished flour
    const col = collectWorkshopReadyJobs(state, 'mill', q1.job.endMs, () => 0.5, () => true);
    expect(col.ok).toBe(true);
    if (!col.ok) throw new Error(col.messageVi);
    expect(col.collected[0]!.sku).toBe('flour');
    state = col.state;

    const up2 = upgradeWorkshopStation(state, 'mill', 2_000);
    expect(up2.ok).toBe(true);
    if (!up2.ok) throw new Error(up2.messageVi);
    expect(up2.newLevel).toBe(2);
    state = up2.state;

    const up3 = upgradeWorkshopStation(state, 'mill', 2_000);
    expect(up3.ok).toBe(true);
    if (up3.ok) {
      expect(up3.newLevel).toBe(3);
      state = up3.state;
      // L3 speeds up craft by 30% & grants 25% bonus item chance!
      const fastJob = queueWorkshopJob(state, 'mill', 'flour', 100_000, 'u1');
      if (fastJob.ok) {
        expect(fastJob.job.endMs - fastJob.job.startMs).toBe(42_000);
        const l3Col = collectWorkshopReadyJobs(fastJob.state, 'mill', 200_000, () => 0.1);
        expect(l3Col.ok).toBe(true);
        if (l3Col.ok) {
          expect(l3Col.collected[0]!.bonusAdded).toBe(true);
          expect(l3Col.collected[0]!.qty).toBe(2);
        }
      }
    }
  });

  it('connects seasonal shop, shipping bin, tool upgrades, fish dishes, and deep order board contracts', () => {
    expect(TOOL_UPGRADE_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(bestOwnedToolForFamily(new Set(['tool_hoe_copper', 'tool_hoe_gold']), 'hoe')?.sku).toBe('tool_hoe_gold');

    expect(farmShopItemsByCategory('seeds').length).toBeGreaterThanOrEqual(45);
    expect(farmShopItemsByCategory('saplings').length).toBe(12);
    expect(farmShopItemsByCategory('farm_care').length).toBe(7);
    expect(listShippableCatalogSkus().length).toBeGreaterThan(150);

    // Fish have meaningful artisan/cooking uses and V0.3.0 orders include deep items
    const orderPool = orderableItems('V0.3.0');
    expect(orderPool.some((i) => i.group === 'animal_product')).toBe(true);
    expect(orderPool.some((i) => i.group === 'fish')).toBe(true);
    const board = generateOrderBoard({ seed: 123, windowIndex: 5, milestone: 'V0.3.0', nowMs: 1_000 });
    expect(board.orders.filter(Boolean)).toHaveLength(3);
  });

  it('passes deep balance audit with 0 arbitrage, 0 impossible recipes, 0 dead-end items, and 0 extreme grind', () => {
    const audit = runDeepEconomyBalanceAudit();
    expect(audit.arbitrageFindings).toBe(0);
    expect(audit.impossibleRecipes).toEqual([]);
    expect(audit.deadEndItems).toEqual([]);
    expect(audit.extremeGrindItems).toEqual([]);
    expect(audit.ok).toBe(true);
    expect(audit.counts.fieldCrops).toBe(40);
    expect(audit.counts.orchardTrees).toBe(12);
    expect(audit.counts.flowers).toBe(20);
    expect(audit.counts.livestockSpecies).toBe(7);
    expect(audit.counts.workshopTypes).toBe(8);
  });
});
