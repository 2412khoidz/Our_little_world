/**
 * P2 — independent simulator oracle.
 *
 * These checks re-derive facts from the run output instead of trusting the
 * engine's own invariant helper: item conservation from the journal, the ledger
 * replay, stack limits, quality validity and time accounting.
 */

import { describe, expect, it } from 'vitest';
import { replayLedger } from '../../src/shared/economy/ledgerMath';
import { requireItem } from '../../src/shared/economy/catalogConfig';
import { compareStrategies, measureZeroWalletRecovery, runSimulation } from '../../src/shared/economy/sim/run';

const SEED = 20261125;

const RUN = runSimulation({
  seed: SEED,
  profileId: 'v021',
  personaId: 'optimizer_mixed',
  days: 60,
});

describe('P2 — inventory conservation oracle', () => {
  it('reconstructs the final inventory from the item journal', () => {
    const totals = new Map<string, number>();
    for (const entry of RUN.itemJournal) {
      totals.set(entry.sku, (totals.get(entry.sku) ?? 0) + entry.qty);
    }
    for (const [sku, qty] of Object.entries(RUN.finalInventory)) {
      expect(totals.get(sku) ?? 0, `journal lệch cho ${sku}`).toBe(qty);
    }
    for (const [sku, qty] of totals) {
      if (qty === 0) {
        expect(RUN.finalInventory[sku] ?? 0).toBe(0);
      }
    }
  });

  it('never exceeds the catalog stack limit', () => {
    for (const [sku, qty] of Object.entries(RUN.finalInventory)) {
      expect(qty, `${sku} vượt stackLimit`).toBeLessThanOrEqual(requireItem(sku).stackLimit);
      expect(qty).toBeGreaterThanOrEqual(0);
    }
    expect(RUN.invariants.ok).toBe(true);
  });

  it('only journals quality tiers the item actually supports', () => {
    for (const entry of RUN.itemJournal) {
      if (entry.qty <= 0 || entry.quality === undefined) {
        continue;
      }
      expect(requireItem(entry.sku).qualityTiers).toContain(entry.quality);
    }
  });
});

describe('P2 — ledger oracle', () => {
  it('replays the exposed ledger to the final wallet', () => {
    const summary = replayLedger(0, RUN.ledger);
    expect(summary.issues).toEqual([]);
    expect(summary.endingCoins).toBe(RUN.finalWallet);
  });

  it('never journals or earns a negative amount', () => {
    for (const entry of RUN.ledger) {
      expect(entry.deltaCoins).toBeGreaterThan(0);
      expect(Number.isInteger(entry.deltaCoins)).toBe(true);
    }
  });
});

describe('P2 — time accounting', () => {
  it('counts real online time and never claims work beyond it', () => {
    const last = RUN.snapshots[RUN.snapshots.length - 1];
    expect(last).toBeDefined();
    if (!last) return;
    expect(last.workedSeconds).toBeLessThanOrEqual(last.activeSeconds);
    expect(last.idleSeconds).toBeGreaterThanOrEqual(0);
    expect(last.overrunSeconds).toBeGreaterThanOrEqual(0);
    expect(last.activeSeconds).toBeGreaterThan(0);
    // Selling may overrun a session; that overrun is included in online time.
    expect(last.activeSeconds + last.idleSeconds).toBeGreaterThanOrEqual(last.workedSeconds);
  });
});

describe('P2 — strategy policies are genuinely different', () => {
  it('balanced and monoculture take different crop decisions for the same persona', () => {
    const monoculture = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer',
      days: 30,
      strategy: 'monoculture',
    });
    const balanced = runSimulation({
      seed: SEED,
      profileId: 'v021',
      personaId: 'optimizer',
      days: 30,
      strategy: 'balanced',
    });
    const monoGroups = Object.keys(
      monoculture.snapshots[monoculture.snapshots.length - 1]?.groupUnitsSold ?? {},
    );
    const balancedGroups = Object.keys(
      balanced.snapshots[balanced.snapshots.length - 1]?.groupUnitsSold ?? {},
    );
    // Monoculture concentrates on one group; the balanced policy rotates groups.
    expect(monoGroups.length).toBeLessThanOrEqual(1);
    expect(balancedGroups.length).toBeGreaterThan(1);
  });

  it('compareStrategies is not degenerate for the optimizer persona', () => {
    const comparison = compareStrategies({
      profileId: 'v021',
      personaId: 'optimizer',
      seed: SEED,
      days: 30,
    });
    expect(comparison.monocultureCrop).not.toBeNull();
    expect(comparison.ratio).not.toBe(1);
    expect(Number.isFinite(comparison.ratio)).toBe(true);
  });
});

describe('P2 — recovery probe uses real availability', () => {
  it('claims an actual node and respects the respawn clock', () => {
    const probe = measureZeroWalletRecovery('v020', 'casual', SEED);
    expect(probe.recovered).toBe(true);
    expect(probe.secondsToRecover).toBeLessThanOrEqual(600);
    expect(probe.log.some((line) => line.includes('gate_herb'))).toBe(true);
    expect(probe.walletAfterRecovery).toBeGreaterThanOrEqual(probe.requiredCoins);
  });
});
