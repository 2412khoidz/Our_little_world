import { describe, expect, it } from 'vitest';
import { emptyFarm, applyFarmAction } from '../../src/shared/farming/serverApply';
import { growthClockMs, harvestReadyAtMs, projectFarmPlots } from '../../src/shared/farming/farmGrowthClock';
import { plant, till } from '../../src/shared/farming/crops';
import { MINUTE_MS } from '../../src/shared/farming/crops';

describe('farmGrowthClock', () => {
  it('projectFarmPlots uses timeScale for growth permille (dev fast-grow)', () => {
    const start = 1_000_000;
    const timeScale = 120;
    let farm = emptyFarm(1);
    const tilled = till(farm, { plotIndex: 0 });
    expect(tilled.ok).toBe(true);
    if (!tilled.ok) throw new Error('till');
    farm = tilled.farm;
    const planted = plant(farm, { plotIndex: 0, cropSku: 'wheat', nowMs: start });
    expect(planted.ok).toBe(true);
    if (!planted.ok) throw new Error('plant');
    farm = planted.farm;

    const soonMs = start + 1_000;
    const plotsSlow = projectFarmPlots(farm, soonMs, 1);
    const plotsFast = projectFarmPlots(farm, soonMs, timeScale);
    expect(plotsSlow[0]!.growthPermille).toBeLessThan(50);
    expect(plotsFast[0]!.growthPermille).toBeGreaterThan(plotsSlow[0]!.growthPermille);
    expect(plotsFast[0]!.ready).toBe(false);
  });

  it('harvestReadyAtMs compresses wall clock when timeScale > 1', () => {
    const start = 1_000_000;
    const timeScale = 120;
    let farm = emptyFarm(1);
    const tilledOnly = till(farm, { plotIndex: 0 });
    if (!tilledOnly.ok) throw new Error('till');
    farm = tilledOnly.farm;
    const planted = plant(farm, { plotIndex: 0, cropSku: 'wheat', nowMs: start });
    if (!planted.ok) throw new Error('plant');
    const crop = planted.farm.plots[0]!.crop!;
    const readyAt = harvestReadyAtMs(crop, timeScale);
    expect(readyAt - start).toBeLessThan(5 * MINUTE_MS);
  });

  it('applyFarm harvest uses same clock as projectFarmPlots', () => {
    const startMs = 1_000_000;
    const timeScale = 120;
    let farm = emptyFarm(42);
    let applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 0,
      inventoryItems: [
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
          itemSku: 'seed_wheat',
          qty: 1,
          quality: 'normal',
          updatedAt: '',
        },
      ],
      nowMs: startMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'till', idempotencyKey: '1' },
    });
    if (!applied.ok) throw new Error(applied.messageVi);
    farm = applied.farm;
    applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 0,
      inventoryItems: applied.inventory,
      nowMs: startMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'plant', seedSku: 'seed_wheat', idempotencyKey: '2' },
    });
    if (!applied.ok) throw new Error(applied.messageVi);
    farm = applied.farm;

    const growMs = 5 * MINUTE_MS;
    const harvestMs = startMs + Math.ceil(growMs / timeScale) + 500;
    const view = projectFarmPlots(farm, harvestMs, timeScale)[0]!;
    expect(view.ready).toBe(true);

    applied = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 0,
      inventoryItems: applied.inventory,
      nowMs: harvestMs,
      timeScale,
      params: { worldId: 'w', plotIndex: 0, action: 'harvest', idempotencyKey: '3' },
    });
    expect(applied.ok).toBe(true);
  });

  it('growthClockMs identity at scale 1', () => {
    expect(growthClockMs(1000, 5000, 1)).toBe(5000);
    expect(growthClockMs(1000, 5000, 120)).toBe(1000 + (5000 - 1000) * 120);
  });
});