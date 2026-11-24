import { describe, expect, it } from 'vitest';
import {
  CROP_DEFINITIONS,
  GARDEN_PLOT_COUNT,
  MINUTE_MS,
  breedFlowers,
  createFarm,
  getNeighbourPlotIndices,
  growthProgress03,
  harvest,
  isReady,
  plant,
  water,
} from '../../src/shared/farming';
import type {
  BreedResult,
  Farm,
  FarmingResult,
  HarvestResult,
  HarvestedItem,
  PlantedCrop,
  PlotState,
  QualityTier,
} from '../../src/shared/farming';
import { rollQuality } from '../../src/shared/farming/crops';
import { createRng } from '../../src/shared/rng';

const WHEAT = CROP_DEFINITIONS.wheat;
const TOMATO = CROP_DEFINITIONS.tomato;
const PEACH = CROP_DEFINITIONS.peach;
const ROSE_PINK = CROP_DEFINITIONS.rose_pink;
const ROSE_SAKURA = CROP_DEFINITIONS.rose_sakura;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/** Far future timestamp that is ready for every crop definition. */
const READY_AT = 10_000_000;

type HarvestSuccess = Extract<HarvestResult, { ok: true }>;
type BreedSuccess = Extract<BreedResult, { ok: true }>;

function plotAt(farm: Farm, plotIndex: number): PlotState {
  const plot = farm.plots[plotIndex];
  if (!plot) {
    throw new Error(`missing plot ${plotIndex}`);
  }
  return plot;
}

function cropAt(farm: Farm, plotIndex: number): PlantedCrop {
  const crop = plotAt(farm, plotIndex).crop;
  if (!crop) {
    throw new Error(`missing crop at plot ${plotIndex}`);
  }
  return crop;
}

function plantOk(farm: Farm, plotIndex: number, cropSku: string, nowMs = 0): Farm {
  const result = plant(farm, { plotIndex, cropSku, nowMs });
  if (!result.ok) {
    throw new Error(`plant failed: ${result.code}`);
  }
  return result.farm;
}

function harvestOk(farm: Farm, plotIndex: number, nowMs: number, rng: () => number): HarvestSuccess {
  const result = harvest(farm, { plotIndex, nowMs, rng });
  if (!result.ok) {
    throw new Error(`harvest failed: ${result.code}`);
  }
  return result;
}

function breedOk(farm: Farm, plotIndex: number, nowMs: number, rng: () => number): BreedSuccess {
  const result = breedFlowers(farm, { plotIndex, nowMs, rng });
  if (!result.ok) {
    throw new Error(`breed failed: ${result.code}`);
  }
  return result;
}

function expectFailure<T extends object>(result: FarmingResult<T>, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`expected rejection ${code}, received success`);
  }
  expect(result.code).toBe(code);
  expect(result.messageVi.length).toBeGreaterThan(0);
}

function plantAt(farm: Farm, indices: readonly number[], cropSku: string): Farm {
  return indices.reduce((current, plotIndex) => plantOk(current, plotIndex, cropSku, 0), farm);
}

describe('crop definitions', () => {
  it('mirrors PRODUCTION_CHAINS.md stable output SKUs and growth minutes', () => {
    expect(CROP_DEFINITIONS.wheat.seedSku).toBe('seed_wheat');
    expect(CROP_DEFINITIONS.wheat.growMs).toBe(5 * MINUTE_MS);
    expect(CROP_DEFINITIONS.carrot.seedSku).toBe('seed_carrot');
    // Documented inference: carrot has no minutes in the doc, 15m is used.
    expect(CROP_DEFINITIONS.carrot.growMs).toBe(15 * MINUTE_MS);
    expect(CROP_DEFINITIONS.tomato.growMs).toBe(45 * MINUTE_MS);
    expect(CROP_DEFINITIONS.tomato.harvestQty).toBe(2);
    expect(CROP_DEFINITIONS.strawberry.growMs).toBe(90 * MINUTE_MS);
    expect(CROP_DEFINITIONS.strawberry.harvestQty).toBe(2);
    expect(CROP_DEFINITIONS.sunflower.growMs).toBe(60 * MINUTE_MS);
    expect(CROP_DEFINITIONS.rose_pink.growMs).toBe(90 * MINUTE_MS);
    expect(CROP_DEFINITIONS.cabbage.growMs).toBe(120 * MINUTE_MS);
    expect(CROP_DEFINITIONS.peach.harvestQty).toBe(3);
    expect(CROP_DEFINITIONS.peach.regrowMs).toBe(120 * MINUTE_MS);
    expect(CROP_DEFINITIONS.peach.regrowHarvests ?? 0).toBeGreaterThan(0);
    expect(ROSE_SAKURA.seedSku).toBeNull();
    expect(ROSE_SAKURA.qualityTiers).toEqual(['silver', 'gold']);
  });
});

describe('createFarm', () => {
  it('creates a fixed 6x4 grid of empty plots keyed by integer index', () => {
    const farm = createFarm(1234);
    expect(farm.seed).toBe(1234);
    expect(farm.plots).toHaveLength(GARDEN_PLOT_COUNT);
    expect(farm.plots.map((plot) => plot.plotId)).toEqual(
      Array.from({ length: GARDEN_PLOT_COUNT }, (_unused, index) => index),
    );
    expect(farm.plots.every((plot) => plot.soil === 'empty')).toBe(true);
    expect(farm.plots.every((plot) => plot.crop === undefined)).toBe(true);
  });
});

describe('plant', () => {
  it('plants on an empty plot and leaves the previous farm untouched', () => {
    const farm = createFarm(7);
    const result = plant(farm, { plotIndex: 3, cropSku: 'wheat', nowMs: 500 });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.messageVi);
    }
    expect(cropAt(result.farm, 3)).toEqual({
      cropSku: 'wheat',
      plantedAtMs: 500,
      waterCount: 0,
      regrowRemaining: 0,
      isRegrowCycle: false,
    });
    expect(plotAt(result.farm, 3).soil).toBe('planted');
    expect(plotAt(farm, 3).soil).toBe('empty');
  });

  it('rejects occupied plots, unknown crops, hybrids and invalid indices', () => {
    const farm = plantOk(createFarm(7), 1, 'wheat', 0);
    expectFailure(plant(farm, { plotIndex: 1, cropSku: 'carrot', nowMs: 0 }), 'PLOT_OCCUPIED');
    expectFailure(plant(createFarm(7), { plotIndex: 2, cropSku: 'banana', nowMs: 0 }), 'UNKNOWN_CROP');
    expectFailure(
      plant(createFarm(7), { plotIndex: 2, cropSku: 'rose_sakura', nowMs: 0 }),
      'NOT_PLANTABLE',
    );
    expectFailure(plant(createFarm(7), { plotIndex: -1, cropSku: 'wheat', nowMs: 0 }), 'INVALID_PLOT');
    expectFailure(
      plant(createFarm(7), { plotIndex: GARDEN_PLOT_COUNT, cropSku: 'wheat', nowMs: 0 }),
      'INVALID_PLOT',
    );
    expectFailure(plant(createFarm(7), { plotIndex: 1.5, cropSku: 'wheat', nowMs: 0 }), 'INVALID_PLOT');
  });
});

describe('growth', () => {
  it('derives integer per-mille progress purely from nowMs', () => {
    const farm = plantOk(createFarm(1), 0, 'wheat', 0);
    const crop = cropAt(farm, 0);
    expect(growthProgress03(crop, 0)).toBe(0);
    expect(growthProgress03(crop, -5_000)).toBe(0);
    expect(growthProgress03(crop, 150_000)).toBe(500);
    expect(growthProgress03(crop, 299_999)).toBe(999);
    expect(growthProgress03(crop, 300_000)).toBe(1000);
    expect(growthProgress03(crop, WHEAT.growMs * 100)).toBe(1000);
  });

  it('never reports readiness before the effective deadline', () => {
    const farm = plantOk(createFarm(1), 0, 'tomato', 0);
    const crop = cropAt(farm, 0);
    expect(isReady(crop, TOMATO.growMs - 1)).toBe(false);
    expect(isReady(crop, TOMATO.growMs)).toBe(true);
  });
});

describe('watering', () => {
  it('speeds growth by 25% once per cycle and rejects a second watering', () => {
    const farm = plantOk(createFarm(1), 0, 'wheat', 0);
    const watered = water(farm, { plotIndex: 0, nowMs: 0 });
    expect(watered.ok).toBe(true);
    if (!watered.ok) {
      throw new Error(watered.messageVi);
    }
    expect(cropAt(watered.farm, 0).waterCount).toBe(1);
    expect(growthProgress03(cropAt(watered.farm, 0), 150_000)).toBe(666);
    expect(growthProgress03(cropAt(farm, 0), 150_000)).toBe(500);
    expect(isReady(cropAt(watered.farm, 0), 225_000)).toBe(true);
    expect(isReady(cropAt(farm, 0), 225_000)).toBe(false);

    expectFailure(water(watered.farm, { plotIndex: 0, nowMs: 1 }), 'ALREADY_WATERED');
    expectFailure(water(watered.farm, { plotIndex: 0, nowMs: WHEAT.growMs }), 'ALREADY_READY');
    expectFailure(water(createFarm(1), { plotIndex: 0, nowMs: 0 }), 'NO_CROP');
    expectFailure(water(farm, { plotIndex: GARDEN_PLOT_COUNT, nowMs: 0 }), 'INVALID_PLOT');

    // Pure: the input farm never changes.
    expect(cropAt(farm, 0).waterCount).toBe(0);
    expect(plotAt(farm, 0).soil).toBe('planted');
  });
});

describe('harvest', () => {
  it('rejects harvesting before the deadline and leaves the farm unchanged', () => {
    const farm = plantOk(createFarm(3), 4, 'wheat', 1_000);
    let rngCalls = 0;
    const result = harvest(farm, {
      plotIndex: 4,
      nowMs: 1_000 + WHEAT.growMs - 1,
      rng: () => {
        rngCalls += 1;
        return 0.5;
      },
    });
    expectFailure(result, 'NOT_READY');
    // Rejections must not consume randomness.
    expect(rngCalls).toBe(0);
    expect(cropAt(farm, 4).plantedAtMs).toBe(1_000);
    expect(plotAt(farm, 4).soil).toBe('planted');
  });

  it('harvests a full-grown crop with the correct qty/quality and clears the plot', () => {
    const farm = plantOk(createFarm(5), 2, 'tomato', 0);
    const result = harvestOk(farm, 2, TOMATO.growMs, () => 0.5);
    expect(result.harvested.items).toEqual([{ sku: 'tomato', qty: 2, quality: 'normal' }]);
    expect(result.harvested.regrew).toBe(false);
    expect(result.harvested.plotIndex).toBe(2);
    expect(plotAt(result.farm, 2)).toEqual({ plotId: 2, soil: 'empty' });
    // Original farm is unchanged (pure action).
    expect(plotAt(farm, 2).soil).toBe('planted');
    expectFailure(harvest(result.farm, { plotIndex: 2, nowMs: TOMATO.growMs, rng: () => 0.5 }), 'NO_CROP');
  });

  it('returns the same item list for identical seeds and can differ across seeds', () => {
    const run = (seed: number): readonly HarvestedItem[] => {
      const farm = plantOk(createFarm(99), 0, 'wheat', 0);
      const stream = createRng(seed);
      return harvestOk(farm, 0, WHEAT.growMs, () => stream.next()).harvested.items;
    };
    expect(run(7)).toEqual(run(7));
    const qualities = new Set<QualityTier>();
    for (let seed = 0; seed < 20; seed += 1) {
      const item = run(seed)[0];
      expect(item).toBeDefined();
      if (item) {
        qualities.add(item.quality);
      }
    }
    expect(qualities.size).toBeGreaterThan(1);
  });
});

describe('quality', () => {
  it('reaches every allowed tier and never exceeds gold', () => {
    const seen = new Set<QualityTier>();
    for (let seed = 0; seed < 300; seed += 1) {
      const farm = plantOk(createFarm(1), 0, 'wheat', 0);
      const stream = createRng(seed);
      const item = harvestOk(farm, 0, WHEAT.growMs, () => stream.next()).harvested.items[0];
      expect(item).toBeDefined();
      if (!item) {
        continue;
      }
      expect(WHEAT.qualityTiers).toContain(item.quality);
      expect(['normal', 'silver', 'gold']).toContain(item.quality);
      seen.add(item.quality);
    }
    expect(seen.has('normal')).toBe(true);
    expect(seen.has('silver')).toBe(true);
    expect(seen.has('gold')).toBe(true);
  });

  it('improves weights with water and respects restricted tier lists', () => {
    expect(rollQuality(() => 0.01, 'wheat', 0)).toBe('normal');
    expect(rollQuality(() => 0.5, 'wheat', 0)).toBe('normal');
    expect(rollQuality(() => 0.5, 'wheat', 1)).toBe('silver');
    expect(rollQuality(() => 0.99, 'wheat', 0)).toBe('gold');

    for (let seed = 0; seed < 200; seed += 1) {
      const stream = createRng(seed);
      const quality = rollQuality(() => stream.next(), 'rose_sakura', 1);
      expect(quality === 'silver' || quality === 'gold').toBe(true);
      expect(ROSE_SAKURA.qualityTiers).toContain(quality);
    }
  });
});

describe('regrowth', () => {
  it('regrows a peach repeatedly, then empties the plot when charges run out', () => {
    const initialGrowMs = PEACH.growMs;
    const regrowMs = PEACH.regrowMs ?? 0;
    const totalHarvests = 1 + (PEACH.regrowHarvests ?? 0);
    expect(regrowMs).toBeGreaterThan(0);
    expect(totalHarvests).toBeGreaterThan(2);

    let farm = plantOk(createFarm(9), 10, 'peach', 0);
    let nowMs = initialGrowMs;
    let harvests = 0;

    for (let index = 0; index < totalHarvests; index += 1) {
      const result = harvestOk(farm, 10, nowMs, () => 0.5);
      expect(result.harvested.items[0]?.qty).toBe(3);
      harvests += 1;
      if (index < totalHarvests - 1) {
        expect(result.harvested.regrew).toBe(true);
        const regrowing = cropAt(result.farm, 10);
        expect(regrowing.isRegrowCycle).toBe(true);
        expect(regrowing.plantedAtMs).toBe(nowMs);
        expect(regrowing.regrowRemaining).toBe(totalHarvests - 2 - index);
        expect(isReady(regrowing, nowMs + regrowMs - 1)).toBe(false);
        expect(isReady(regrowing, nowMs + regrowMs)).toBe(true);
        farm = result.farm;
        nowMs += regrowMs;
      } else {
        expect(result.harvested.regrew).toBe(false);
        farm = result.farm;
      }
    }

    expect(harvests).toBe(totalHarvests);
    expect(plotAt(farm, 10).soil).toBe('empty');
    expectFailure(harvest(farm, { plotIndex: 10, nowMs: nowMs + regrowMs, rng: () => 0.5 }), 'NO_CROP');
  });
  it('allows a fresh watering on each new regrowth cycle', () => {
    const farm = plantOk(createFarm(9), 10, 'peach', 0);
    const first = harvestOk(farm, 10, PEACH.growMs, () => 0.5);
    expect(first.harvested.regrew).toBe(true);

    const regrowMs = PEACH.regrowMs ?? 0;
    const reduction = Math.floor(regrowMs * 0.25);
    const watered = water(first.farm, { plotIndex: 10, nowMs: PEACH.growMs });
    expect(watered.ok).toBe(true);
    if (!watered.ok) {
      throw new Error(watered.messageVi);
    }
    expect(cropAt(watered.farm, 10).waterCount).toBe(1);
    expect(isReady(cropAt(watered.farm, 10), PEACH.growMs + regrowMs - reduction - 1)).toBe(false);
    expect(isReady(cropAt(watered.farm, 10), PEACH.growMs + regrowMs - reduction)).toBe(true);
  });
});

describe('offline growth', () => {
  it('a plot left for 30 real days is ready, harvestable and never dead', () => {
    const farm = plantOk(createFarm(2), 5, 'wheat', 0);
    const crop = cropAt(farm, 5);
    expect(growthProgress03(crop, THIRTY_DAYS_MS)).toBe(1000);
    expect(isReady(crop, THIRTY_DAYS_MS)).toBe(true);
    expect(Object.keys(crop)).not.toContain('dead');
    expect(Object.keys(crop)).not.toContain('wilted');

    const result = harvestOk(farm, 5, THIRTY_DAYS_MS, () => 0.5);
    expect(result.harvested.items).toHaveLength(1);
    expect(plotAt(result.farm, 5).soil).toBe('empty');
  });
});

describe('flower breeding', () => {
  it('detects all 8 neighbours and yields only known flower SKUs', () => {
    const centre = 8;
    const neighbours = [...getNeighbourPlotIndices(centre)].sort((left, right) => left - right);
    expect(neighbours).toHaveLength(8);
    expect(neighbours).toEqual([1, 2, 3, 7, 9, 13, 14, 15]);

    const farm = plantAt(createFarm(1), neighbours, 'rose_pink');
    const result = breedOk(farm, centre, READY_AT, () => 0);
    const bred = result.bred;
    expect(bred).not.toBeNull();
    if (!bred) {
      throw new Error('expected a bred flower');
    }
    expect(bred.sku).toBe('rose_sakura');
    expect(ROSE_SAKURA.qualityTiers).toContain(bred.quality);
    expect(result.farm).toEqual(farm);
  });

  it('clamps safely at grid edges and never counts the centre as a parent', () => {
    expect(getNeighbourPlotIndices(0)).toEqual([1, 6, 7]);
    expect(getNeighbourPlotIndices(23)).toEqual([16, 17, 22]);
    for (const plotIndex of [0, 5, 18, 23]) {
      for (const neighbour of getNeighbourPlotIndices(plotIndex)) {
        expect(neighbour).toBeGreaterThanOrEqual(0);
        expect(neighbour).toBeLessThan(GARDEN_PLOT_COUNT);
        expect(neighbour).not.toBe(plotIndex);
      }
    }

    const cornerFarm = plantAt(createFarm(1), [1, 6], 'rose_pink');
    const corner = breedOk(cornerFarm, 0, READY_AT, () => 0);
    expect(corner.bred?.sku).toBe('rose_sakura');

    // Only one pink neighbour: if the planted centre were counted as a parent,
    // this would incorrectly produce a sakura. It must be null.
    const centreFarm = plantAt(createFarm(1), [0, 1], 'rose_pink');
    expect(breedOk(centreFarm, 0, READY_AT, () => 0).bred).toBeNull();
  });

  it('only lets ready flower neighbours participate (blooming-only)', () => {
    const farm = plantAt(createFarm(1), [1, 2], 'rose_pink');
    expect(breedOk(farm, 8, 100, () => 0).bred).toBeNull();
    const bloomed = breedOk(farm, 8, ROSE_PINK.growMs, () => 0);
    expect(bloomed.bred?.sku).toBe('rose_sakura');

    const wheatFarm = plantAt(createFarm(1), [1, 2], 'wheat');
    expect(breedOk(wheatFarm, 8, READY_AT, () => 0).bred).toBeNull();
  });

  it('falls back to rose_pink with a note for the pastel pair, and null for unknown pairs', () => {
    const pastelFarm = plantAt(plantOk(createFarm(1), 1, 'rose_pink', 0), [2], 'sunflower');
    const pastel = breedOk(pastelFarm, 8, READY_AT, () => 0);
    expect(pastel.bred?.sku).toBe('rose_pink');
    expect(pastel.bred?.noteVi).toContain('pastel');

    const sunflowerFarm = plantAt(createFarm(1), [1, 2], 'sunflower');
    expect(breedOk(sunflowerFarm, 8, READY_AT, () => 0).bred).toBeNull();
  });

  it('returns null with no neighbours, deterministically', () => {
    const farm = createFarm(77);
    const first = breedOk(farm, 8, READY_AT, () => 0);
    const second = breedOk(farm, 8, READY_AT, () => 0);
    expect(first.bred).toBeNull();
    expect(second.bred).toBeNull();
    expect(first.farm).toEqual(farm);
    expect(second.farm).toEqual(farm);
  });

  it('is deterministic across runs with the same seed and never invents a SKU', () => {
    const buildFarm = (): Farm => plantAt(createFarm(5), [1, 2, 3, 7, 9, 13, 14, 15], 'rose_pink');
    let foundBred = false;
    for (let seed = 0; seed < 40; seed += 1) {
      const run = (): BreedSuccess => {
        const stream = createRng(seed);
        return breedOk(buildFarm(), 8, READY_AT, () => stream.next());
      };
      const first = run();
      const second = run();
      expect(first.bred).toEqual(second.bred);
      if (first.bred) {
        foundBred = true;
        expect(CROP_DEFINITIONS[first.bred.sku]).toBeDefined();
      }
    }
    expect(foundBred).toBe(true);
  });

  it('rejects invalid plot indices and non-finite time', () => {
    expectFailure(
      breedFlowers(createFarm(1), { plotIndex: GARDEN_PLOT_COUNT, nowMs: 0, rng: () => 0 }),
      'INVALID_PLOT',
    );
    expectFailure(
      breedFlowers(createFarm(1), { plotIndex: 0, nowMs: Number.NaN, rng: () => 0 }),
      'INVALID_TIME',
    );
  });
});
