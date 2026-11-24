import { describe, expect, it } from 'vitest';
import { catalogFingerprint, ITEM_CATALOG } from '../../src/shared/economy/catalogConfig';
import {
  cookEconomics,
  cropEconomics,
  daysToAfford,
  diversityMetrics,
  incomeMetrics,
  runBalanceExperiments,
  runSaturationSweep,
} from '../../src/shared/economy/sim/experiments';
import { runSimulation } from '../../src/shared/economy/sim/run';

const SEED = 20261125;

describe('experiments — income metrics separate the denominators', () => {
  it('keeps worked time inside session time and reports finite rates', () => {
    const result = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer',
      days: 30,
    });
    const metrics = incomeMetrics(result);
    expect(metrics.workedMinutes).toBeLessThanOrEqual(metrics.sessionMinutes);
    expect(metrics.sessionMinutes).toBeGreaterThan(0);
    expect(Number.isFinite(metrics.coinsPerWorkedMinute)).toBe(true);
    expect(Number.isFinite(metrics.coinsPerSessionMinute)).toBe(true);
    expect(Number.isFinite(metrics.coinsPerRealDay)).toBe(true);
    // An optimizer idles after filling the plots: the effort rate is much higher
    // than the per-session rate. That gap is exactly why both must be reported.
    expect(metrics.coinsPerWorkedMinute).toBeGreaterThan(metrics.coinsPerSessionMinute);
  });

  it('measures diversity concentration', () => {
    const casual = runSimulation({ seed: SEED, profileId: 'v021', personaId: 'casual', days: 30 });
    const optimizer = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer',
      days: 30,
    });
    const casualDiversity = diversityMetrics(casual);
    const optimizerDiversity = diversityMetrics(optimizer);
    expect(casualDiversity.topGroupShare).toBeGreaterThan(0);
    expect(casualDiversity.topGroupShare).toBeLessThan(1);
    expect(casualDiversity.distinctGroups).toBeGreaterThan(1);
    expect(optimizerDiversity.topGroupShare).toBe(1);
    expect(optimizerDiversity.distinctGroups).toBe(1);
  });
});

describe('experiments — pacing', () => {
  it('reaches the cheap decoration before the expensive expansion', () => {
    const cheap = daysToAfford({ profileId: 'v021', personaId: 'casual', seed: SEED, cost: 45 });
    const expensive = daysToAfford({
      profileId: 'v021',
      personaId: 'casual',
      seed: SEED,
      cost: 1_400,
    });
    expect(cheap.days).not.toBeNull();
    expect(expensive.days).not.toBeNull();
    expect(cheap.days ?? 0).toBeGreaterThanOrEqual(1);
    expect(expensive.days ?? 0).toBeGreaterThanOrEqual(cheap.days ?? 0);
    expect(cheap.sessionMinutes).toBeLessThan(expensive.sessionMinutes);
  });

  it('returns null when the goal is unreachable in the horizon', () => {
    const result = daysToAfford({
      profileId: 'v020',
      personaId: 'long_absence',
      seed: SEED,
      cost: 1_000_000,
      maxDays: 30,
    });
    expect(result.days).toBeNull();
  });
});

describe('experiments — crop and cooking analytics', () => {
  it('ranks crops and separates action rate from plot-occupancy value', () => {
    const rows = cropEconomics();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1]?.profitPerPlotDay ?? 0).toBeGreaterThanOrEqual(
        rows[index]?.profitPerPlotDay ?? 0,
      );
    }
    for (const row of rows) {
      expect(row.sessionCyclesPerPlotDay).toBeGreaterThanOrEqual(1);
      expect(row.wallClockCyclesPerPlotDay).toBeGreaterThanOrEqual(row.sessionCyclesPerPlotDay);
      expect(row.profitPerPlotDayCeiling).toBeGreaterThanOrEqual(row.profitPerPlotDay);
      const expected = (row.revenueCoins - row.seedCostCoins) / (row.actionSeconds / 60);
      expect(row.profitPerActionMinute).toBeCloseTo(expected, 2);
    }
  });

  it('shows that cooking only pays through orders and the restaurant', () => {
    const rows = cookEconomics();
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.profitCoins).toBe(row.dishSaleCoins - row.inputValueCoins);
      expect(row.orderProfitPerActionMinute).toBeGreaterThan(row.profitPerActionMinute);
      expect(row.restaurantProfitPerActionMinute).toBeGreaterThan(
        row.orderProfitPerActionMinute,
      );
    }
  });
});

describe('experiments — saturation sweep', () => {
  it('runs deterministically and shows where the cap starts to bite', () => {
    const options = { seeds: [SEED, 7], days: 30, profileId: 'v021' as const };
    const first = runSaturationSweep(options);
    const second = runSaturationSweep(options);
    expect(first).toEqual(second);

    const strict = first.find((row) => row.threshold === 5 && row.personaId === 'optimizer');
    const approved = first.find((row) => row.threshold === 20 && row.personaId === 'optimizer');
    expect(strict).toBeDefined();
    expect(approved).toBeDefined();
    if (!strict || !approved) return;
    // A 5-unit cap costs the monoculture money; the approved 20-unit cap does not.
    expect(strict.coinsPerSessionMinute).toBeLessThan(approved.coinsPerSessionMinute);
    expect(strict.coinsPerSessionMinute).toBeLessThan(approved.coinsPerSessionMinute - 0.1);
  });
});

describe('experiments — safety', () => {
  it('never mutates the approved catalog', () => {
    const before = catalogFingerprint();
    const wheat = ITEM_CATALOG.find((item) => item.sku === 'wheat')?.sellPrice;
    const report = runBalanceExperiments({ seeds: [SEED], days: 30 });
    expect(catalogFingerprint()).toBe(before);
    expect(ITEM_CATALOG.find((item) => item.sku === 'wheat')?.sellPrice).toBe(wheat);
    expect(report.catalogFingerprint).toBe(before);
  });

  it('reports the known catalog warnings instead of hiding them', () => {
    const report = runBalanceExperiments({ seeds: [SEED], days: 30 });
    const joined = report.catalogWarnings.join('\n');
    expect(joined).toContain('carp_pond');
    expect(joined).toContain('peach');
    expect(report.crops.length).toBeGreaterThan(0);
    expect(report.pacing.length).toBeGreaterThan(0);
  });
});
