import { describe, expect, it } from 'vitest';
import {
  baselinePolicy,
  buildPolicySet,
  lowerThresholdPolicy,
  perGroupPolicy,
  recoveringPolicy,
  valueBasedPolicy,
  type MarketPriceInput,
} from '../../src/shared/economy/sim/marketPolicies';
import {
  analyzeCatalogGaps,
  compareMarketPolicies,
  cookingChannelEconomics,
  incomeMetrics,
  recoverySplitExperiment,
} from '../../src/shared/economy/sim/experiments';
import { runSimulation } from '../../src/shared/economy/sim/run';

const SEED = 20261125;

function input(overrides: Partial<MarketPriceInput> = {}): MarketPriceInput {
  return {
    sku: 'wheat',
    group: 'grain',
    soldSkuUnits: 0,
    soldGroupUnits: 0,
    soldValueCoins: 0,
    nowMs: 3_600_000,
    firstSaleAtMs: null,
    ...overrides,
  };
}

describe('market policies — safety', () => {
  it('always returns a finite multiplier inside the floor and 1.0', () => {
    const extreme = [
      input({ soldGroupUnits: -5 }),
      input({ soldGroupUnits: Number.NaN }),
      input({ soldGroupUnits: Number.POSITIVE_INFINITY }),
      input({ soldGroupUnits: 1e9 }),
      input({ soldValueCoins: 1e9 }),
      input({ nowMs: Number.NaN }),
    ];
    for (const policy of buildPolicySet()) {
      for (const candidate of extreme) {
        const multiplier = policy.multiplierBp(candidate);
        expect(Number.isFinite(multiplier), `${policy.id}`).toBe(true);
        expect(multiplier).toBeGreaterThanOrEqual(0);
        expect(multiplier).toBeLessThanOrEqual(10_000);
      }
    }
  });

  it('exposes exactly the five A–E variants', () => {
    const ids = buildPolicySet().map((policy) => policy.id);
    expect(ids).toHaveLength(5);
    expect(ids[0]).toBe('A_baseline');
    expect(ids[1]?.startsWith('B_')).toBe(true);
    expect(ids[2]?.startsWith('C_')).toBe(true);
    expect(ids[3]?.startsWith('D_')).toBe(true);
    expect(ids[4]?.startsWith('E_')).toBe(true);
  });
});

describe('market policies — shapes', () => {
  it('baseline is inert below the threshold and floors at -30%', () => {
    const policy = baselinePolicy();
    expect(policy.multiplierBp(input({ soldGroupUnits: 0 }))).toBe(10_000);
    expect(policy.multiplierBp(input({ soldGroupUnits: 19 }))).toBe(10_000);
    expect(policy.multiplierBp(input({ soldGroupUnits: 20 }))).toBe(9_900);
    expect(policy.multiplierBp(input({ soldGroupUnits: 100 }))).toBe(7_000);
  });

  it('lower threshold policy reacts earlier than the baseline', () => {
    const baseline = baselinePolicy();
    const strict = lowerThresholdPolicy(8);
    expect(strict.multiplierBp(input({ soldGroupUnits: 8 }))).toBe(9_900);
    expect(baseline.multiplierBp(input({ soldGroupUnits: 8 }))).toBe(10_000);
  });

  it('per-group policy uses group thresholds and SKU overrides', () => {
    const policy = perGroupPolicy({
      thresholds: { veg: 6, grain: 30 },
      defaultThreshold: 20,
      skuOverrides: { wheat: 4 },
    });
    expect(policy.multiplierBp(input({ sku: 'barley', group: 'grain', soldGroupUnits: 29 }))).toBe(10_000);
    expect(policy.multiplierBp(input({ sku: 'barley', group: 'grain', soldGroupUnits: 30 }))).toBe(9_900);
    expect(policy.multiplierBp(input({ sku: 'carrot', group: 'veg', soldGroupUnits: 6 }))).toBe(9_900);
    // SKU override wins over the group threshold.
    expect(policy.multiplierBp(input({ sku: 'wheat', group: 'grain', soldGroupUnits: 4 }))).toBe(
      9_900,
    );
  });

  it('value-based policy saturates on coins, not units', () => {
    const policy = valueBasedPolicy({ valueThresholdCoins: 100, stepBpPerCoin: 50 });
    expect(policy.multiplierBp(input({ soldValueCoins: 100 }))).toBe(10_000);
    expect(policy.multiplierBp(input({ soldValueCoins: 110 }))).toBe(9_500);
    expect(policy.multiplierBp(input({ soldValueCoins: 1_000 }))).toBe(7_000);
  });

  it('recovering policy never punishes more than the baseline and recovers with time', () => {
    const baseline = baselinePolicy();
    const recovering = recoveringPolicy({ halfLifeMs: 6 * 3_600_000 });
    const sold = 24;
    const atZero = recovering.multiplierBp(
      input({ soldGroupUnits: sold, nowMs: 0, firstSaleAtMs: 0 }),
    );
    const afterSixHours = recovering.multiplierBp(
      input({ soldGroupUnits: sold, nowMs: 6 * 3_600_000, firstSaleAtMs: 0 }),
    );
    expect(atZero).toBe(baseline.multiplierBp(input({ soldGroupUnits: sold })));
    expect(afterSixHours).toBeGreaterThan(atZero);
    expect(afterSixHours).toBeLessThanOrEqual(10_000);
  });
});

describe('simulator — mixed optimizer and plot-day metrics', () => {
  it('the mixed optimizer keeps working when the plots are full', () => {
    const mixed = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer_mixed',
      days: 60,
    });
    const pure = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer',
      days: 60,
    });
    const mixedLast = mixed.snapshots[mixed.snapshots.length - 1];
    const pureLast = pure.snapshots[pure.snapshots.length - 1];
    expect(mixedLast?.idleShare ?? 1).toBeLessThan(pureLast?.idleShare ?? 0);
    expect(mixedLast?.idleShare ?? 0).toBeLessThan(0.6);
    expect(mixedLast?.plotDays ?? 0).toBeGreaterThan(0);
    expect(mixedLast?.netPerPlotDay ?? 0).toBeGreaterThan(0);
    expect(mixed.invariants.ok).toBe(true);
    expect(pure.invariants.ok).toBe(true);
  });

  it('reports five different denominators for the same run', () => {
    const result = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'casual',
      days: 30,
    });
    const metrics = incomeMetrics(result);
    expect(metrics.coinsPerWorkedMinute).toBeGreaterThan(0);
    expect(metrics.coinsPerSessionMinute).toBeGreaterThan(0);
    expect(metrics.coinsPerRealDay).toBeGreaterThan(0);
    const last = result.snapshots[result.snapshots.length - 1];
    expect(last?.netPerPlotDay ?? 0).toBeGreaterThan(0);
    expect(last?.idleShare ?? 1).toBeLessThan(0.5);
  });
});

describe('market policy comparison', () => {
  it('is deterministic and differentiates the variants', () => {
    const options = {
      seeds: [SEED],
      days: 30,
      profileId: 'v021' as const,
      personas: ['casual', 'optimizer'] as const,
    };
    const first = compareMarketPolicies(options);
    const second = compareMarketPolicies(options);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5 * 2);

    const baseline = first.find(
      (row) => row.policyId === 'A_baseline' && row.personaId === 'optimizer',
    );
    const value = first.find(
      (row) => row.policyId === 'D_value' && row.personaId === 'optimizer',
    );
    expect(baseline).toBeDefined();
    expect(value).toBeDefined();
    if (!baseline || !value) return;
    // Value-based saturation must actually bite at this volume.
    expect(value.medianWealth).toBeLessThan(baseline.medianWealth);
    // ... and it must not make the player lose money overall.
    expect(value.medianWealth).toBeGreaterThan(0);
  });

  it('keeps every policy profitable and non-negative', () => {
    const rows = compareMarketPolicies({
      seeds: [SEED],
      days: 30,
      profileId: 'v021',
      personas: ['casual'],
    });
    for (const row of rows) {
      expect(row.medianWealth).toBeGreaterThan(0);
      expect(row.coinsPerSessionMinute).toBeGreaterThan(0);
      expect(row.coinsPerWorkedMinute).toBeGreaterThanOrEqual(row.coinsPerSessionMinute);
    }
  });
});

describe('cooking channels and catalog consistency', () => {
  it('ranks bins < order < restaurant inside the approved band', () => {
    const rows = cookingChannelEconomics();
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      // Restaurant tiers are monotonic; the order premium (1.35x-1.70x) can
      // exceed the 1.60x restaurant tier, so only 2.00x must beat the order.
      expect(row.restaurant180PerMinute).toBeGreaterThanOrEqual(row.restaurant160PerMinute);
      expect(row.restaurant200PerMinute).toBeGreaterThanOrEqual(row.restaurant180PerMinute);
      expect(row.orderPerMinute).toBeGreaterThan(row.binPerMinute);
      expect(row.restaurant200PerMinute).toBeGreaterThanOrEqual(row.orderPerMinute);
    }
  });

  it('explains the carp_pond drift with the exact arithmetic', () => {
    const gaps = analyzeCatalogGaps();
    const carp = gaps.find((gap) => gap.id === 'carp_pond_drift');
    expect(carp).toBeDefined();
    if (!carp) return;
    expect(carp.evidence.derivedBp).toBe(120_000);
    expect(carp.evidence.authoredBp).toBe(110_000);
    expect(carp.evidence.inputValueBp).toBe(10_000);
    expect(carp.evidence.laborBp).toBe(90_000);
    expect(carp.evidence.depreciationBp).toBe(20_000);
  });

  it('flags the peach acquisition gap with the sapling proposal', () => {
    const gaps = analyzeCatalogGaps();
    const peach = gaps.find((gap) => gap.id === 'peach_no_acquisition');
    expect(peach).toBeDefined();
    if (!peach) return;
    expect(peach.evidence.revenuePerHarvestCoins).toBe(54);
    expect(peach.proposalVi).toContain('sapling_peach');
  });

  it('spreading sales never earns less than one dump under recovery', () => {
    const [row] = recoverySplitExperiment();
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.splitAcrossThreeSessionsCoins).toBeGreaterThanOrEqual(row.dumpCoins);
    expect(row.recoveredShare).toBeGreaterThanOrEqual(0);
    expect(row.recoveredShare).toBeLessThan(0.2);
  });
});
