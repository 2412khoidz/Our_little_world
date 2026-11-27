import { describe, expect, it } from 'vitest';
import {
  resolveWorldCalendar,
  DEFAULT_CALENDAR_DAY_MS,
  DAYS_PER_SEASON,
} from '../../src/shared/world/worldCalendar';
import {
  weatherForWorldDay,
  forecastWeatherDays,
} from '../../src/shared/donor/webfarmville-c420bc2/weatherRules';
import {
  DEEP_FIELD_CROP_SKUS,
  DEEP_FLOWER_SKUS,
  FERTILIZER_DEFS,
  SPRINKLER_DEFS,
  applyFertilizerToPlot,
  computeEffectiveCropCycle,
  expandToolPlotFootprint,
  getDeepCropDefinition,
  isPlotCoveredBySprinkler,
  placeSprinklerOnPlot,
} from '../../src/shared/farming/deepCropSimulation';
import {
  FARM_GREENHOUSE_PLOT_START,
  FARM_GREENHOUSE_PLOT_END,
  isGreenhousePlot,
} from '../../src/shared/farming/farmPlotIndex';
import { createFarm, plant, till } from '../../src/shared/farming/crops';
import { projectFarmPlots } from '../../src/shared/farming/farmGrowthClock';
import { applyFarmAction, emptyFarm } from '../../src/shared/farming/serverApply';
import type { Farm } from '../../src/shared/farming/types';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';

function makeInv(skus: readonly [string, number][]): InventoryEntry[] {
  return skus.map(([itemSku, qty]) => ({
    worldId: 'test-w',
    ownerScope: 'shared',
    itemSku,
    qty,
    quality: 'normal',
    updatedAt: '',
  }));
}

describe('Checkpoint B — deep crop simulation', () => {
  it('progresses deterministically across 4 seasons × 28 days and weather rules without server timers', () => {
    const springDay1 = resolveWorldCalendar(0, 0);
    expect(springDay1.season).toBe('spring');
    expect(springDay1.dayOfSeason).toBe(1);
    expect(springDay1.year).toBe(1);

    const summerStart = resolveWorldCalendar(DAYS_PER_SEASON * DEFAULT_CALENDAR_DAY_MS, 0);
    expect(summerStart.season).toBe('summer');
    expect(summerStart.dayOfSeason).toBe(1);

    const fallStart = resolveWorldCalendar(DAYS_PER_SEASON * 2 * DEFAULT_CALENDAR_DAY_MS, 0);
    expect(fallStart.season).toBe('fall');

    const winterStart = resolveWorldCalendar(DAYS_PER_SEASON * 3 * DEFAULT_CALENDAR_DAY_MS, 0);
    expect(winterStart.season).toBe('winter');

    const year2Spring = resolveWorldCalendar(DAYS_PER_SEASON * 4 * DEFAULT_CALENDAR_DAY_MS, 0);
    expect(year2Spring.season).toBe('spring');
    expect(year2Spring.year).toBe(2);

    const day1Weather = weatherForWorldDay('w1', 1, 'spring');
    expect(day1Weather.id).toBe('sunny');

    const fc = forecastWeatherDays('w1', 1, 7, (d) => resolveWorldCalendar((d - 1) * DEFAULT_CALENDAR_DAY_MS, 0).season);
    expect(fc).toHaveLength(7);
  });

  it('registers all 40 field crops and 20 flowers with seasonal, regrow & multi-yield rules', () => {
    expect(DEEP_FIELD_CROP_SKUS).toHaveLength(40);
    expect(DEEP_FLOWER_SKUS).toHaveLength(20);
    for (const sku of DEEP_FIELD_CROP_SKUS) {
      const def = getDeepCropDefinition(sku);
      expect(def, sku).toBeDefined();
      expect(def!.seedSku).toBe(`seed_${sku}`);
      expect(def!.seasons.length).toBeGreaterThanOrEqual(1);
    }
    const blueprint = getDeepCropDefinition('blueberry')!;
    expect(blueprint.regrowMs).toBeGreaterThan(0);
    expect(blueprint.yieldMax).toBeGreaterThan(blueprint.yieldMin);
  });

  it('slows out-of-season outdoor crops to 50% without withering, and runs Greenhouse plots at 100%', () => {
    expect(isGreenhousePlot(0)).toBe(false);
    expect(isGreenhousePlot(FARM_GREENHOUSE_PLOT_START)).toBe(true);
    expect(isGreenhousePlot(FARM_GREENHOUSE_PLOT_END)).toBe(true);
    expect(isGreenhousePlot(FARM_GREENHOUSE_PLOT_END + 1)).toBe(false);

    let farm = createFarm(7);
    farm = { ...farm, weatherEpochMs: 0 };
    // Plant pumpkin (fall crop) in outdoor plot 0 and greenhouse plot 120 during Spring (day 1 sunny!)
    for (const p of [0, FARM_GREENHOUSE_PLOT_START]) {
      const t = till(farm, { plotIndex: p });
      if (!t.ok) throw new Error(t.messageVi);
      const pl = plant(t.farm, { plotIndex: p, cropSku: 'pumpkin', nowMs: 0 });
      if (!pl.ok) throw new Error(pl.messageVi);
      farm = pl.farm;
    }

    const envOutdoor = computeEffectiveCropCycle(farm, 0, farm.plots[0]!.crop!, 0, { worldEpochMs: 0 });
    const envGreenhouse = computeEffectiveCropCycle(farm, FARM_GREENHOUSE_PLOT_START, farm.plots[FARM_GREENHOUSE_PLOT_START]!.crop!, 0, { worldEpochMs: 0 });
    expect(envOutdoor.seasonMatch).toBe(false);
    expect(envOutdoor.combinedSpeedBp).toBe(5_000);
    expect(envGreenhouse.greenhouse).toBe(true);
    expect(envGreenhouse.seasonMatch).toBe(true);
    expect(envGreenhouse.effectiveCycleMs * 2).toBe(envOutdoor.effectiveCycleMs);

    // 30 real days offline never kills or loses either plot
    const projectedAfter30Days = projectFarmPlots(farm, 30 * 86_400_000, 1, { worldEpochMs: 0 });
    expect(projectedAfter30Days[0]!.ready).toBe(true);
    expect(projectedAfter30Days[FARM_GREENHOUSE_PLOT_START]!.ready).toBe(true);
  });

  it('applies sprinklers (4-adj / 3x3 / 5x5) and fertilizers via lazy reconciliation without grid wrap', () => {
    let farm = createFarm(11);
    // Place basic sprinkler on plot 13 (row 1, col 1 of 12-col farm_main grid) -> covers 1, 12, 14, 25
    const sp = placeSprinklerOnPlot(farm, 13, 'sprinkler_basic');
    expect(sp.ok).toBe(true);
    if (!sp.ok) throw new Error(sp.messageVi);
    farm = sp.farm;
    expect(SPRINKLER_DEFS.sprinkler_basic.coveragePattern).toBe('cross4');
    expect(isPlotCoveredBySprinkler(farm, 14)).toBe(true);
    expect(isPlotCoveredBySprinkler(farm, 0)).toBe(false);

    // Edge tile sprinkler on plot 120 (col 0 row 0 of farm_annex) must NOT leak to farm_main
    const spEdge = placeSprinklerOnPlot(farm, 120, 'sprinkler_quality');
    expect(spEdge.ok).toBe(true);
    if (!spEdge.ok) throw new Error(spEdge.messageVi);
    farm = spEdge.farm;
    expect(isPlotCoveredBySprinkler(farm, 119)).toBe(false);
    expect(isPlotCoveredBySprinkler(farm, 121)).toBe(true);
    expect(isPlotCoveredBySprinkler(farm, 128)).toBe(true);

    // Fertilizer accelerates growth
    const t = till(farm, { plotIndex: 1 });
    if (!t.ok) throw new Error(t.messageVi);
    const f = applyFertilizerToPlot(t.farm, 1, 'fert_speed');
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error(f.messageVi);
    const pl = plant(f.farm, { plotIndex: 1, cropSku: 'lettuce', nowMs: 0 });
    if (!pl.ok) throw new Error(pl.messageVi);
    const speedView = projectFarmPlots(pl.farm, 260_000, 1)[1]!;
    expect(FERTILIZER_DEFS.fert_speed.speedBp).toBe(13_000);
    expect(speedView.growthPermille).toBeGreaterThan(600);
  });

  it('supports upgraded area tools (2x2 / 3x3), multi-yield harvests, and farming XP gain', () => {
    expect(expandToolPlotFootprint(0, 'tool_hoe_iron')).toEqual([0, 1, 12, 13]);
    expect(expandToolPlotFootprint(13, 'tool_hoe_gold')).toHaveLength(9);

    let farm: Farm = { ...emptyFarm(99), weatherEpochMs: 0 };
    let inv = makeInv([
      ['tool_hoe', 1],
      ['tool_hoe_iron', 1],
      ['tool_sickle_wide', 1],
      ['seed_potato', 4],
      ['fert_quality', 1],
    ]);

    // Till 2x2 patch at plot 0 (tills 0, 1, 12, 13)
    const tilled = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 100,
      inventoryItems: inv,
      nowMs: 0,
      params: { worldId: 'w', plotIndex: 0, action: 'till', toolSku: 'tool_hoe_iron', idempotencyKey: 't1' },
    });
    expect(tilled.ok).toBe(true);
    if (!tilled.ok) throw new Error(tilled.messageVi);
    farm = tilled.farm;
    expect(farm.plots[13]!.soil).toBe('tilled');

    // Fertilize plot 0 + plant across 2 plots
    const fert = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 100,
      inventoryItems: tilled.inventory,
      nowMs: 0,
      params: { worldId: 'w', plotIndex: 0, action: 'fertilize', fertilizerSku: 'fert_quality', idempotencyKey: 'f1' },
    });
    expect(fert.ok).toBe(true);
    if (!fert.ok) throw new Error(fert.messageVi);
    farm = fert.farm;
    inv = fert.inventory;

    const p0 = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 100,
      inventoryItems: inv,
      nowMs: 0,
      params: { worldId: 'w', plotIndex: 0, action: 'plant', seedSku: 'seed_potato', toolSku: 'tool_seed_spreader', idempotencyKey: 'p1' },
    });
    expect(p0.ok).toBe(true);
    if (!p0.ok) throw new Error(p0.messageVi);
    farm = p0.farm;
    inv = p0.inventory;

    // Also plant plot 1 manually then batch-harvest with wide sickle after maturity
    const p1 = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 100,
      inventoryItems: inv,
      nowMs: 0,
      params: { worldId: 'w', plotIndex: 1, action: 'plant', seedSku: 'seed_potato', idempotencyKey: 'p2' },
    });
    if (!p1.ok) throw new Error(p1.messageVi);
    farm = p1.farm;
    inv = p1.inventory;

    const later = 800_000;
    const harvested = applyFarmAction({
      worldId: 'w',
      farm,
      farmVersion: 1,
      walletCoins: 100,
      inventoryItems: inv,
      nowMs: later,
      params: { worldId: 'w', plotIndex: 0, action: 'harvest', toolSku: 'tool_sickle_wide', useEnvironment: true, idempotencyKey: 'h1' },
    });
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) throw new Error(harvested.messageVi);
    expect(harvested.harvested?.length).toBe(2);
    expect(harvested.farm.farmingXp).toBeGreaterThan(0);
  });
});
