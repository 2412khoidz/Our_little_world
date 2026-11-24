/**
 * Simulation runners: single runs, 1000-session batches, zero-wallet recovery
 * probes and the dominant-strategy comparison.
 */

import { analyzeArbitrage } from '../arbitrage.ts';
import type { ArbitrageReport } from '../arbitrage.ts';
import { CATALOG_VERSION, catalogFingerprint, requireItem } from '../catalogConfig.ts';
import { replayLedger } from '../ledgerMath.ts';
import { createRng, deriveSeed } from '../../rng.ts';
import {
  ACTION_SECONDS,
  DAY_MS,
  DECOR_SINKS,
  DEFAULT_MILESTONES,
  DOMINANT_STRATEGY_GUARD,
  PERSONAS,
  RECOVERY_DEADLINE_SECONDS,
  RECOVERY_TARGET_SKU,
  STARTING_COINS,
  START_MS,
  getPersona,
  getProfile,
} from './config.ts';
import {
  addItems,
  availableCrops,
  checkInvariants,
  createWorld,
  inventoryValueCoins,
  pickBestCropForReport,
  plotValueCoins,
  resetWorldForProbe,
  runDay,
  sellAll,
} from './engine.ts';
import type { WorldState } from './engine.ts';
import type {
  BatchSessionSummary,
  InvariantIssue,
  MilestoneSnapshot,
  PersonaId,
  ProfileId,
  RecoveryProbe,
  SimOptions,
  SimResult,
  StrategyComparison,
  StrategyId,
} from './types.ts';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function makeSnapshot(
  state: WorldState,
  day: number,
  startingCoins: number,
): MilestoneSnapshot {
  const summary = replayLedger(0, state.ledger);
  const inventoryValue = inventoryValueCoins(state.inventory);
  const standingCrops = plotValueCoins(state);
  const wealth = state.coins + inventoryValue + standingCrops;
  const minutes = state.activeSeconds / 60;
  const netIncome = wealth - startingCoins;
  return {
    day,
    walletCoins: state.coins,
    inventoryValueCoins: inventoryValue,
    standingCropsValueCoins: standingCrops,
    wealthCoins: wealth,
    activeSeconds: state.activeSeconds,
    netIncomeCoins: netIncome,
    incomePerMinute: minutes > 0 ? round2(netIncome / minutes) : 0,
    sources: summary.sources,
    sinks: summary.sinks,
    groupUnitsSold: { ...state.groupUnitsSold },
    stats: { ...state.stats },
  };
}

/** Runs one persona through one milestone profile, day by day. */
export function runSimulation(options: SimOptions): SimResult {
  const profile = getProfile(options.profileId);
  const persona = getPersona(options.personaId);
  const strategy: StrategyId = options.strategy ?? 'balanced';
  const days = Math.max(1, Math.floor(options.days));
  const milestones = options.milestones ?? DEFAULT_MILESTONES;
  const startingCoins = options.startingCoins ?? STARTING_COINS;
  // Strategy is not part of the seed: both arms see the same random stream so a
  // comparison measures the strategy, not a different roll of the dice.
  const rng = createRng(deriveSeed(options.seed, profile.id, persona.id));
  const state = createWorld(startingCoins, START_MS);
  const snapshots: MilestoneSnapshot[] = [];
  const issues: InvariantIssue[] = [];
  let nextPlayDay = 1;
  let playDays = 0;
  let absentDays = 0;
  let zeroWealthStreak = 0;
  let deadlockReported = false;

  for (let day = 1; day <= days; day += 1) {
    state.day = day;
    state.nowMs = START_MS + (day - 1) * DAY_MS;
    state.soldTodayByGroup = {};
    if (options.resetWalletAtDay === day) {
      resetWorldForProbe(state);
    }

    const playsToday = persona.playEveryDays === null || day >= nextPlayDay;
    if (playsToday) {
      runDay(state, persona, profile, rng, strategy, DECOR_SINKS);
      playDays += 1;
      if (persona.awayDaysRange) {
        nextPlayDay = day + rng.int(persona.awayDaysRange[0], persona.awayDaysRange[1] + 1);
      }
    } else {
      absentDays += 1;
    }

    const isMilestone = milestones.includes(day);
    // Full ledger replay is O(n²) over 180 days; sample it instead of every day.
    if (isMilestone || day % 7 === 0) {
      const invariant = checkInvariants(state);
      for (const issue of invariant.issues) {
        issues.push({ day, ...issue });
      }
    }

    // Deadlock = seven consecutive days of zero total wealth (wallet + inventory
    // + standing crops). A single broke day is spending, not a lock.
    const wealthNow =
      state.coins + inventoryValueCoins(state.inventory) + plotValueCoins(state);
    if (wealthNow <= 0) {
      zeroWealthStreak += 1;
    } else {
      zeroWealthStreak = 0;
    }
    if (zeroWealthStreak >= 7 && !deadlockReported) {
      deadlockReported = true;
      issues.push({
        day,
        code: 'DEADLOCK',
        messageVi: `Tổng tài sản 0 xu suốt 7 ngày liên tiếp (tới ngày ${day})`,
      });
    }

    if (isMilestone) {
      snapshots.push(makeSnapshot(state, day, startingCoins));
    }
  }

  return {
    seed: options.seed,
    profileId: profile.id,
    personaId: persona.id,
    strategy,
    catalogVersion: CATALOG_VERSION,
    catalogFingerprint: catalogFingerprint(),
    days,
    startingCoins,
    snapshots,
    finalWallet: state.coins,
    activeSeconds: state.activeSeconds,
    totalPlayDays: playDays,
    absentDays,
    invariants: { ok: issues.length === 0, issues },
    actionLog: [...state.actionLog],
  };
}

export interface BatchOptions {
  readonly sessions: number;
  readonly profileId: ProfileId;
  readonly baseSeed: number;
  readonly days?: number;
  readonly personas?: readonly PersonaId[];
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/** Runs N seeded sessions across personas (at least 1000 for the acceptance run). */
export function runBatch(options: BatchOptions): BatchSessionSummary {
  const personas = options.personas ?? PERSONAS.map((persona) => persona.id);
  const days = options.days ?? 180;
  const perPersona: Record<string, { sessions: number; ok: boolean; medianWallet: number }> = {};
  const wallets: Record<string, number[]> = {};
  const seeds: number[] = [];
  let invariantFailures = 0;
  let deadlocks = 0;

  for (const personaId of personas) {
    perPersona[personaId] = { sessions: 0, ok: true, medianWallet: 0 };
    wallets[personaId] = [];
  }

  for (let index = 0; index < options.sessions; index += 1) {
    const personaId = personas[index % personas.length] as PersonaId;
    const seed = (options.baseSeed + index * 104_729) >>> 0;
    if (seeds.length < 5) {
      seeds.push(seed);
    }
    const result = runSimulation({
      seed,
      profileId: options.profileId,
      personaId,
      days,
    });
    const bucket = perPersona[personaId];
    if (!bucket) {
      continue;
    }
    bucket.sessions += 1;
    if (!result.invariants.ok) {
      invariantFailures += 1;
      bucket.ok = false;
    }
    if (result.invariants.issues.some((issue) => issue.code === 'DEADLOCK')) {
      deadlocks += 1;
    }
    (wallets[personaId] ??= []).push(result.finalWallet);
  }

  for (const personaId of personas) {
    const bucket = perPersona[personaId];
    if (!bucket) {
      continue;
    }
    bucket.medianWallet = median(wallets[personaId] ?? []);
  }

  const arbitrage = analyzeArbitrage();
  return {
    sessions: options.sessions,
    profileId: options.profileId,
    seeds,
    perPersona,
    invariantFailures,
    deadlocks,
    arbitrageFindings: arbitrage.findings.length,
  };
}

/**
 * Fastest legal zero-wallet recovery: forage one free unit, sell it through the
 * Shipping Bin, and repeat until the cheapest seed is affordable
 * (docs/economy/MARKET_AND_NPC.md §3).
 */
export function measureZeroWalletRecovery(
  profileId: ProfileId,
  personaId: PersonaId,
  seed: number,
): RecoveryProbe {
  const profile = getProfile(profileId);
  const target = requireItem(RECOVERY_TARGET_SKU);
  const requiredCoins = target.storeBuy ?? 0;
  const log: string[] = [];
  const state = createWorld(0, START_MS);
  let seconds = 0;

  if (!profile.features.forage) {
    return {
      profileId,
      personaId,
      seed,
      recovered: false,
      secondsToRecover: 0,
      walletAfterRecovery: 0,
      requiredCoins,
      log: ['Hồ sơ này không có điểm hái lượm miễn phí'],
    };
  }

  for (let attempt = 0; attempt < 8 && state.coins < requiredCoins; attempt += 1) {
    const sku = profile.forage.skus[attempt % profile.forage.skus.length] ?? 'wild_herb';
    addItems(state.inventory, sku, 1, 'normal');
    seconds += ACTION_SECONDS.forage;
    seconds += sellAll(state);
    log.push(`Hái ${sku} (+${ACTION_SECONDS.forage}s) và bán qua Shipping Bin -> ${state.coins} xu`);
  }

  return {
    profileId,
    personaId,
    seed,
    recovered: state.coins >= requiredCoins && seconds <= RECOVERY_DEADLINE_SECONDS,
    secondsToRecover: seconds,
    walletAfterRecovery: state.coins,
    requiredCoins,
    log,
  };
}

export interface StrategyOptions {
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly seed: number;
  readonly days?: number;
}

/** Monoculture (highest coins/second crop) vs a balanced rotation. */
export function compareStrategies(options: StrategyOptions): StrategyComparison {
  const days = options.days ?? 30;
  const profile = getProfile(options.profileId);
  const milestones = [
    ...new Set([...DEFAULT_MILESTONES.filter((day) => day <= days), days]),
  ].sort((left, right) => left - right);

  const monoculture = runSimulation({
    seed: options.seed,
    profileId: options.profileId,
    personaId: options.personaId,
    days,
    strategy: 'monoculture',
    milestones,
  });
  const balanced = runSimulation({
    seed: options.seed,
    profileId: options.profileId,
    personaId: options.personaId,
    days,
    strategy: 'balanced',
    milestones,
  });

  const monoRate = monoculture.snapshots[monoculture.snapshots.length - 1]?.incomePerMinute ?? 0;
  const balancedRate = balanced.snapshots[balanced.snapshots.length - 1]?.incomePerMinute ?? 0;
  const ratio =
    balancedRate > 0 ? monoRate / balancedRate : monoRate > 0 ? Number.POSITIVE_INFINITY : 1;

  return {
    profileId: profile.id,
    personaId: options.personaId,
    days,
    monocultureCoinsPerMinute: monoRate,
    balancedCoinsPerMinute: balancedRate,
    ratio: round2(ratio),
    withinGuard: ratio <= DOMINANT_STRATEGY_GUARD,
    guardLimit: DOMINANT_STRATEGY_GUARD,
    monocultureCrop: pickBestCropForReport(availableCrops(profile))?.sku ?? null,
  };
}

/** Full catalog + balance audit used by the CLI and tests. */
export interface BalanceAudit {
  readonly arbitrage: ArbitrageReport;
  readonly guard: number;
  readonly ok: boolean;
}

export function auditBalance(): BalanceAudit {
  const arbitrage = analyzeArbitrage();
  return {
    arbitrage,
    guard: DOMINANT_STRATEGY_GUARD,
    ok: arbitrage.ok,
  };
}
