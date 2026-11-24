import { describe, expect, it } from 'vitest';
import { analyzeArbitrage } from '../../src/shared/economy/arbitrage';
import { requireItem, validateCatalog } from '../../src/shared/economy/catalogConfig';
import {
  ACTION_SECONDS,
  DOMINANT_STRATEGY_GUARD,
  PERSONAS,
  PROFILES,
  RECOVERY_DEADLINE_SECONDS,
  RECOVERY_TARGET_SKU,
} from '../../src/shared/economy/sim/config';
import {
  compareStrategies,
  measureZeroWalletRecovery,
  runBatch,
  runSimulation,
} from '../../src/shared/economy/sim/run';
import { renderTextReport, reportFailures, type SimReportBundle } from '../../src/shared/economy/sim/report';
import type { SimResult } from '../../src/shared/economy/sim/types';

const SEED = 20261125;

function run(overrides: Partial<Parameters<typeof runSimulation>[0]> = {}): SimResult {
  return runSimulation({
    seed: SEED,
    profileId: 'v020',
    personaId: 'casual',
    days: 30,
    ...overrides,
  });
}

describe('economy simulator — catalog preconditions', () => {
  it('starts from a valid, arbitrage-free catalog', () => {
    expect(validateCatalog().ok).toBe(true);
    const arbitrage = analyzeArbitrage();
    expect(arbitrage.ok).toBe(true);
    expect(arbitrage.timeGatedItems.length).toBeGreaterThan(0);
  });
});

describe('economy simulator — determinism', () => {
  it('produces byte-identical results for the same seed and options', () => {
    const first = run({ days: 60 });
    const second = run({ days: 60 });
    expect(first.snapshots).toEqual(second.snapshots);
    expect(first.finalWallet).toBe(second.finalWallet);
    expect(first.actionLog).toEqual(second.actionLog);
  });

  it('changes results when the seed changes', () => {
    const first = run({ days: 30 });
    const second = run({ days: 30, seed: SEED + 1 });
    expect(second.snapshots).not.toEqual(first.snapshots);
  });
});

describe('economy simulator — invariants', () => {
  it('keeps wallet and inventory invariants for every persona × profile', () => {
    for (const profile of PROFILES) {
      for (const persona of PERSONAS) {
        const result = runSimulation({
          seed: SEED,
          profileId: profile.id,
          personaId: persona.id,
          days: 90,
        });
        expect(
          result.invariants.ok,
          `${profile.id}/${persona.id}: ${result.invariants.issues[0]?.messageVi ?? ''}`,
        ).toBe(true);
        expect(result.snapshots.map((snapshot) => snapshot.day)).toEqual([7, 30, 90]);
        for (const snapshot of result.snapshots) {
          expect(snapshot.walletCoins).toBeGreaterThanOrEqual(0);
          expect(snapshot.inventoryValueCoins).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('never produces negative quantities and never deadlocks over 180 days', () => {
    for (const persona of PERSONAS) {
      const result = runSimulation({
        seed: SEED,
        profileId: 'v021',
        personaId: persona.id,
        days: 180,
      });
      expect(result.invariants.issues.filter((issue) => issue.code === 'DEADLOCK')).toEqual([]);
      expect(result.finalWallet).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('economy simulator — V0.2.0 scope', () => {
  it('does not assume farming, fishing or cooking', () => {
    const result = run({ days: 30, personaId: 'coop' });
    const last = result.snapshots[result.snapshots.length - 1];
    expect(last?.stats.harvests).toBe(0);
    expect(last?.stats.fishCaught).toBe(0);
    expect(last?.stats.dishesCooked).toBe(0);
    expect(Object.keys(last?.groupUnitsSold ?? {})).toEqual(['material']);
  });

  it('recovers a zero wallet with forage + Shipping Bin in under 10 minutes', () => {
    for (const persona of PERSONAS) {
      const probe = measureZeroWalletRecovery('v020', persona.id, SEED);
      expect(probe.recovered, `${persona.id} không phục hồi được`).toBe(true);
      expect(probe.secondsToRecover).toBeLessThanOrEqual(RECOVERY_DEADLINE_SECONDS);
      // One forage action + one sale of a 5c herb is the documented floor.
      expect(probe.secondsToRecover).toBe(ACTION_SECONDS.forage + ACTION_SECONDS.sell);
      expect(probe.walletAfterRecovery).toBeGreaterThanOrEqual(probe.requiredCoins);
      expect(probe.requiredCoins).toBe(requireItem(RECOVERY_TARGET_SKU).storeBuy);
    }
  });

  it('recovers again after the wallet is wiped mid-simulation', () => {
    const result = run({ days: 90, resetWalletAtDay: 30 });
    const after = result.snapshots.find((snapshot) => snapshot.day === 90);
    expect(result.invariants.ok).toBe(true);
    expect(after?.walletCoins).toBeGreaterThan(0);
  });
});

describe('economy simulator — absence and sinks', () => {
  it('applies no tax or loss while a persona is away (long_absence)', () => {
    const result = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'long_absence',
      days: 90,
    });
    expect(result.absentDays).toBeGreaterThan(0);
    expect(result.invariants.ok).toBe(true);
    const day7 = result.snapshots.find((snapshot) => snapshot.day === 7);
    const day30 = result.snapshots.find((snapshot) => snapshot.day === 30);
    // Wealth must not shrink during the 14–30 day absence.
    expect(day30?.wealthCoins).toBeGreaterThanOrEqual(day7?.wealthCoins ?? 0);
  });

  it('only buys decoration tiers that exist in the profile milestone', () => {
    const result = runSimulation({
      seed: SEED,
      profileId: 'v020',
      personaId: 'decorator',
      days: 180,
    });
    const sinks = result.snapshots[result.snapshots.length - 1]?.sinks ?? {};
    expect(Object.keys(sinks)).not.toContain('decor_room_corner');
    expect(Object.keys(sinks)).not.toContain('decor_house_upgrade');
  });
});

describe('economy simulator — balance guards', () => {
  it('reports the dominant-strategy ratio for farming profiles', () => {
    const comparison = compareStrategies({
      profileId: 'v021',
      personaId: 'coop',
      seed: SEED,
      days: 30,
    });
    expect(comparison.guardLimit).toBe(DOMINANT_STRATEGY_GUARD);
    expect(comparison.monocultureCrop).not.toBeNull();
    expect(comparison.monocultureCoinsPerMinute).toBeGreaterThan(0);
    expect(comparison.balancedCoinsPerMinute).toBeGreaterThan(0);
    expect(Number.isFinite(comparison.ratio)).toBe(true);
    // The shipped numbers must stay inside the documented guard.
    expect(comparison.withinGuard).toBe(true);
  });

  it('has no dominant strategy for the V0.2.0 profile (single income channel)', () => {
    const comparison = compareStrategies({
      profileId: 'v020',
      personaId: 'coop',
      seed: SEED,
      days: 30,
    });
    expect(comparison.monocultureCrop).toBeNull();
    // Same seed, same random stream: both arms are the same run by construction.
    expect(comparison.ratio).toBe(1);
  });
});

describe('economy simulator — batch + report', () => {
  it('runs a seeded batch with no invariant failures or deadlocks', () => {
    const batch = runBatch({ sessions: 14, profileId: 'v020', baseSeed: SEED, days: 60 });
    expect(batch.sessions).toBe(14);
    expect(batch.invariantFailures).toBe(0);
    expect(batch.deadlocks).toBe(0);
    expect(batch.arbitrageFindings).toBe(0);
    expect(Object.keys(batch.perPersona)).toHaveLength(PERSONAS.length);
  });

  it('renders a report whose failure list is empty for a healthy bundle', () => {
    const profiles = PROFILES.map((profile) => ({
      profileId: profile.id,
      labelVi: profile.labelVi,
      results: [
        runSimulation({
          seed: SEED,
          profileId: profile.id,
          personaId: 'casual',
          days: 30,
        }),
      ],
      recovery: [measureZeroWalletRecovery(profile.id, 'casual', SEED)],
      strategies: [],
    }));
    const bundle: SimReportBundle = {
      seed: SEED,
      sessions: 1,
      days: 30,
      catalogVersion: 'test',
      catalogFingerprint: 'test',
      catalog: validateCatalog(),
      arbitrage: analyzeArbitrage(),
      profiles,
      batches: [runBatch({ sessions: 2, profileId: 'v020', baseSeed: SEED, days: 30 })],
    };
    expect(reportFailures(bundle)).toEqual([]);
    const text = renderTextReport(bundle);
    expect(text).toContain('ECONOMY SIMULATOR');
    expect(text).toContain('Đường phục hồi ví 0');
  });
});
