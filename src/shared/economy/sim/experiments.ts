/**
 * Economy balance experiments (V0.2.x).
 *
 * These helpers never mutate the approved catalog: every knob is an override
 * passed to a fresh simulator run. They exist to answer "what changes if…" for
 * the open questions found by the first simulator pass, and to compare four
 * different income metrics so a dominant-strategy conclusion is not based on a
 * single, flattering denominator.
 *
 * Metrics:
 * - `coinsPerWorkedMinute`  — coins per minute of actual interaction (planting,
 *   harvesting, fishing, cooking, selling). This is the "effort" rate.
 * - `coinsPerSessionMinute` — coins per minute of being online, including idle
 *   time. This is what a player feels per evening.
 * - `coinsPerRealDay`       — coins per wall-clock day, including the days the
 *   player was absent. This is the pacing rate.
 */

import {
  catalogFingerprint,
  computeSellPrice,
  ITEM_CATALOG,
  requireItem,
  validateCatalog,
} from '../catalogConfig.ts';
import { DEFAULT_SATURATION } from '../types.ts';
import { divFloor, mulBp } from '../ledgerMath.ts';
import type { SaturationConfig } from '../types.ts';
import { createRng, deriveSeed } from '../../rng.ts';
import {
  ACTION_SECONDS,
  DAY_MS,
  DECOR_SINKS,
  START_MS,
  STARTING_COINS,
  getPersona,
  getProfile,
} from './config.ts';
import { advanceDay, availableCrops, createWorld, resetDayAccounting, runDay } from './engine.ts';
import { baselinePolicy, buildPolicySet, recoveringPolicy } from './marketPolicies.ts';
import type { MarketPolicy } from './marketPolicies.ts';
import { runSimulation } from './run.ts';
import type { PersonaId, ProfileId, SimResult } from './types.ts';

export interface IncomeMetrics {
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly days: number;
  readonly coinsPerWorkedMinute: number;
  readonly coinsPerSessionMinute: number;
  readonly coinsPerRealDay: number;
  readonly workedMinutes: number;
  readonly sessionMinutes: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Four denominators for the same run, so they can be compared explicitly. */
export function incomeMetrics(result: SimResult): IncomeMetrics {
  const last = result.snapshots[result.snapshots.length - 1];
  const net = last?.netIncomeCoins ?? 0;
  const workedMinutes = (last?.workedSeconds ?? 0) / 60;
  const sessionMinutes = (last?.activeSeconds ?? 0) / 60;
  const days = last?.day ?? result.days;
  return {
    profileId: result.profileId,
    personaId: result.personaId,
    days,
    coinsPerWorkedMinute: workedMinutes > 0 ? round2(net / workedMinutes) : 0,
    coinsPerSessionMinute: sessionMinutes > 0 ? round2(net / sessionMinutes) : 0,
    coinsPerRealDay: days > 0 ? round2(net / days) : 0,
    workedMinutes: round2(workedMinutes),
    sessionMinutes: round2(sessionMinutes),
  };
}

export interface AffordabilityResult {
  readonly days: number | null;
  readonly sessionMinutes: number;
  readonly workedMinutes: number;
  readonly walletCoins: number;
}

/**
 * First day the household can afford `cost` (running the real engine, honouring
 * absence days). Used for furniture pacing checks.
 */
export function daysToAfford(input: {
  profileId: ProfileId;
  personaId: PersonaId;
  seed: number;
  cost: number;
  maxDays?: number;
  saturation?: SaturationConfig;
}): AffordabilityResult {
  const profile = getProfile(input.profileId);
  const persona = getPersona(input.personaId);
  const maxDays = input.maxDays ?? 365;
  const rng = createRng(deriveSeed(input.seed, profile.id, persona.id, 'afford', input.cost));
  const state = createWorld(
    STARTING_COINS,
    START_MS,
    input.seed,
    baselinePolicy(input.saturation ?? DEFAULT_SATURATION),
  );
  let nextPlayDay = 1;

  for (let day = 1; day <= maxDays; day += 1) {
    state.day = day;
    state.nowMs = START_MS + (day - 1) * DAY_MS;
    resetDayAccounting(state);
    const playsToday = persona.playEveryDays === null || day >= nextPlayDay;
    if (playsToday) {
      runDay(state, persona, profile, rng, 'balanced', DECOR_SINKS);
      if (persona.awayDaysRange) {
        nextPlayDay = day + rng.int(persona.awayDaysRange[0], persona.awayDaysRange[1] + 1);
      }
    }
    if (state.coins >= input.cost) {
      return {
        days: day,
        sessionMinutes: round2(state.activeSeconds / 60),
        workedMinutes: round2(state.workedSeconds / 60),
        walletCoins: state.coins,
      };
    }
    advanceDay(state, DAY_MS);
  }
  return {
    days: null,
    sessionMinutes: round2(state.activeSeconds / 60),
    workedMinutes: round2(state.workedSeconds / 60),
    walletCoins: state.coins,
  };
}

export interface DiversityMetrics {
  readonly distinctGroups: number;
  readonly topGroupShare: number;
  readonly groups: Readonly<Record<string, number>>;
}

/** How concentrated the sold basket is; a monoculture is close to 1.0. */
export function diversityMetrics(result: SimResult): DiversityMetrics {
  const last = result.snapshots[result.snapshots.length - 1];
  const groups = { ...(last?.groupUnitsSold ?? {}) };
  const total = Object.values(groups).reduce((sum, units) => sum + units, 0);
  const top = Object.values(groups).reduce((max, units) => Math.max(max, units), 0);
  return {
    distinctGroups: Object.keys(groups).length,
    topGroupShare: total > 0 ? round2(top / total) : 0,
    groups,
  };
}

// --------------------------------------------------------------------------
// Crop economics: fast vs slow crops and plot opportunity cost
// --------------------------------------------------------------------------

export interface CropEconomics {
  readonly sku: string;
  readonly seedCostCoins: number;
  readonly revenueCoins: number;
  readonly profitPerCycleCoins: number;
  readonly actionSeconds: number;
  readonly growSeconds: number;
  readonly profitPerActionMinute: number;
  /** Cycles one plot could finish in a 24h wall-clock day (upper bound). */
  readonly wallClockCyclesPerPlotDay: number;
  /**
   * Cycles one plot can actually finish inside one play session, given that all
   * plots share the same action-time budget.
   */
  readonly sessionCyclesPerPlotDay: number;
  /** Realistic profit per plot per day (session-bounded cycles). */
  readonly profitPerPlotDay: number;
  /** Theoretical ceiling with unlimited action time (saturation ignored). */
  readonly profitPerPlotDayCeiling: number;
  /** Profit-per-plot-day relative to the best crop (1 = best). */
  readonly relativePlotValue: number;
  /** Would `plotCount` plots exceed the daily saturation threshold? */
  readonly exceedsSaturationThreshold: boolean;
}

/**
 * Analytics for every plantable crop. Deliberately ignores saturation so the
 * "raw" crop value can be compared with the measured simulator runs.
 */
export function cropEconomics(options?: {
  plotCount?: number;
  quality?: 'normal' | 'silver' | 'gold';
  saturation?: SaturationConfig;
  /** Typical active session length used to bound cycles (default 12 minutes). */
  sessionSeconds?: number;
}): CropEconomics[] {
  const plotCount = options?.plotCount ?? 12;
  const quality = options?.quality ?? 'normal';
  const sessionSeconds = options?.sessionSeconds ?? 720;
  const threshold = (options?.saturation ?? DEFAULT_SATURATION).threshold;
  const crops = availableCrops(getProfile('v021'));

  const rows = crops.map((crop) => {
    const seedInput = crop.inputs[0];
    const seed = seedInput ? requireItem(seedInput.sku) : null;
    const seedCost = seed && seed.storeBuy !== null ? seed.storeBuy * (seedInput?.qty ?? 0) : 0;
    const unitPrice = computeSellPrice(crop.sku, quality);
    const revenue = unitPrice * crop.batchQty;
    const actionSeconds = ACTION_SECONDS.plant + ACTION_SECONDS.harvest;
    const growSeconds = crop.batchDurationMs / 1_000;
    const cycleSeconds = actionSeconds + growSeconds;
    const wallClockCyclesPerPlotDay = Math.max(
      1,
      Math.floor(DAY_MS / 1_000 / Math.max(1, cycleSeconds)),
    );
    // Growth overlaps between plots, but planting/harvesting shares one budget.
    const sessionCyclesPerPlotDay = Math.max(
      1,
      Math.floor(sessionSeconds / (growSeconds + plotCount * actionSeconds)),
    );
    const cyclesPerPlotDay = Math.min(wallClockCyclesPerPlotDay, sessionCyclesPerPlotDay);
    const profitPerCycle = revenue - seedCost;
    return {
      sku: crop.sku,
      seedCostCoins: seedCost,
      revenueCoins: revenue,
      profitPerCycleCoins: profitPerCycle,
      actionSeconds,
      growSeconds,
      profitPerActionMinute: round2(profitPerCycle / (actionSeconds / 60)),
      wallClockCyclesPerPlotDay,
      sessionCyclesPerPlotDay,
      profitPerPlotDay: round2(profitPerCycle * cyclesPerPlotDay),
      profitPerPlotDayCeiling: round2(profitPerCycle * wallClockCyclesPerPlotDay),
      relativePlotValue: 0,
      exceedsSaturationThreshold:
        plotCount * cyclesPerPlotDay * crop.batchQty > threshold,
    };
  });
  const best = rows.reduce((max, row) => Math.max(max, row.profitPerPlotDay), 0);
  return rows
    .map((row) => ({
      ...row,
      relativePlotValue: best > 0 ? round2(row.profitPerPlotDay / best) : 0,
    }))
    .sort((left, right) => right.profitPerPlotDay - left.profitPerPlotDay);
}

// --------------------------------------------------------------------------
// Raw vs cooked
// --------------------------------------------------------------------------

export interface CookEconomics {
  readonly dishSku: string;
  readonly inputValueCoins: number;
  readonly dishSaleCoins: number;
  readonly profitCoins: number;
  readonly actionMinutes: number;
  readonly profitPerActionMinute: number;
  readonly orderProfitPerActionMinute: number;
  readonly restaurantProfitPerActionMinute: number;
}

/** Compares selling ingredients raw vs cooking them, at several channels. */
export function cookEconomics(): CookEconomics[] {
  const dishes = ITEM_CATALOG.filter((item) => item.group === 'dish');
  return dishes.map((dish) => {
    const inputValue = dish.inputs.reduce(
      (sum, input) => sum + requireItem(input.sku).sellPrice * input.qty,
      0,
    );
    const actionMinutes = ACTION_SECONDS.cook / 60;
    const profit = dish.sellPrice - inputValue;
    const orderProfit =
      computeSellPrice(dish.sku, 'normal', 0, {
        demandBp: dish.orderMultiplierBp ?? 10_000,
      }) - inputValue;
    const restaurantProfit =
      computeSellPrice(dish.sku, 'normal', 0, { demandBp: 19_000 }) - inputValue;
    return {
      dishSku: dish.sku,
      inputValueCoins: inputValue,
      dishSaleCoins: dish.sellPrice,
      profitCoins: profit,
      actionMinutes,
      profitPerActionMinute: round2(profit / actionMinutes),
      orderProfitPerActionMinute: round2(orderProfit / actionMinutes),
      restaurantProfitPerActionMinute: round2(restaurantProfit / actionMinutes),
    };
  });
}



// --------------------------------------------------------------------------
// Saturation sweep
// --------------------------------------------------------------------------

export interface SweepRow {
  readonly threshold: number;
  readonly stepBp: number;
  readonly floorBp: number;
  readonly personaId: PersonaId;
  readonly coinsPerSessionMinute: number;
  readonly coinsPerWorkedMinute: number;
  readonly coinsPerRealDay: number;
  readonly topGroupShare: number;
  readonly distinctGroups: number;
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

export const DEFAULT_SWEEP_CONFIGS: readonly SaturationConfig[] = [
  { threshold: 5, stepBp: 100, floorBp: 7_000 },
  { threshold: 8, stepBp: 100, floorBp: 7_000 },
  { threshold: 12, stepBp: 100, floorBp: 7_000 },
  { threshold: 20, stepBp: 100, floorBp: 7_000 },
  { threshold: 20, stepBp: 500, floorBp: 7_000 },
  { threshold: 20, stepBp: 100, floorBp: 8_500 },
];

/** Runs every persona against every saturation config and aggregates medians. */
export function runSaturationSweep(input: {
  seeds: readonly number[];
  days: number;
  profileId: ProfileId;
  personas?: readonly PersonaId[];
  configs?: readonly SaturationConfig[];
}): SweepRow[] {
  const personas =
    input.personas ?? (['casual', 'coop', 'optimizer'] as readonly PersonaId[]);
  const configs = input.configs ?? DEFAULT_SWEEP_CONFIGS;
  const rows: SweepRow[] = [];

  for (const config of configs) {
    for (const personaId of personas) {
      const metrics: IncomeMetrics[] = [];
      const diversity: DiversityMetrics[] = [];
      for (const seed of input.seeds) {
        const result = runSimulation({
          seed,
          profileId: input.profileId,
          personaId,
          days: input.days,
          saturation: config,
        });
        metrics.push(incomeMetrics(result));
        diversity.push(diversityMetrics(result));
      }
      rows.push({
        threshold: config.threshold,
        stepBp: config.stepBp,
        floorBp: config.floorBp,
        personaId,
        coinsPerSessionMinute: round2(median(metrics.map((metric) => metric.coinsPerSessionMinute))),
        coinsPerWorkedMinute: round2(median(metrics.map((metric) => metric.coinsPerWorkedMinute))),
        coinsPerRealDay: round2(median(metrics.map((metric) => metric.coinsPerRealDay))),
        topGroupShare: round2(median(diversity.map((entry) => entry.topGroupShare))),
        distinctGroups: Math.round(median(diversity.map((entry) => entry.distinctGroups))),
      });
    }
  }
  return rows;
}

// --------------------------------------------------------------------------
// Report bundle
// --------------------------------------------------------------------------

export interface PacingRow {
  readonly personaId: PersonaId;
  readonly sinkId: string;
  readonly cost: number;
  readonly days: number | null;
  readonly sessionMinutes: number;
}

export interface ExperimentReport {
  readonly seeds: readonly number[];
  readonly days: number;
  readonly profileId: ProfileId;
  readonly catalogFingerprint: string;
  readonly catalogWarnings: readonly string[];
  readonly sweeps: readonly SweepRow[];
  readonly policies: readonly PolicyMetricsRow[];
  readonly crops: readonly CropEconomics[];
  readonly cooking: readonly CookEconomics[];
  readonly cookingChannels: readonly CookingChannelRow[];
  readonly gaps: readonly CatalogGapFinding[];
  readonly recoverySplit: readonly RecoverySplitRow[];
  readonly pacing: readonly PacingRow[];
  readonly orders: {
    readonly withOrders: IncomeMetrics;
    readonly withoutOrders: IncomeMetrics;
  };
}

export interface ExperimentOptions {
  readonly seeds?: readonly number[];
  readonly days?: number;
  readonly profileId?: ProfileId;
  readonly personas?: readonly PersonaId[];
  readonly configs?: readonly SaturationConfig[];
  readonly saturation?: SaturationConfig;
}



/** Full experiment bundle used by `npm run economy:experiments`. */
export function runBalanceExperiments(options: ExperimentOptions = {}): ExperimentReport {
  const seeds = options.seeds ?? [20261125, 7, 99];
  const days = options.days ?? 90;
  const profileId = options.profileId ?? 'v021';
  const personas =
    options.personas ?? (['casual', 'coop', 'optimizer'] as readonly PersonaId[]);

  const sweeps = runSaturationSweep({
    seeds,
    days,
    profileId,
    personas,
    configs: options.configs,
  });

  const planningPersonas: readonly PersonaId[] = ['casual', 'coop'];
  const pacing: PacingRow[] = [];
  for (const personaId of planningPersonas) {
    for (const sink of DECOR_SINKS) {
      const result = daysToAfford({
        profileId,
        personaId,
        seed: seeds[0] ?? 1,
        cost: sink.cost,
        saturation: options.saturation,
      });
      pacing.push({
        personaId,
        sinkId: sink.id,
        cost: sink.cost,
        days: result.days,
        sessionMinutes: result.sessionMinutes,
      });
    }
  }

  const withoutOrders = incomeMetrics(
    runSimulation({ seed: seeds[0] ?? 1, profileId: 'v022', personaId: 'casual', days }),
  );
  const withOrders = incomeMetrics(
    runSimulation({ seed: seeds[0] ?? 1, profileId: 'v025', personaId: 'casual', days }),
  );

  return {
    seeds,
    days,
    profileId,
    catalogFingerprint: catalogFingerprint(),
    catalogWarnings: validateCatalog().warnings.map(
      (warning) => `${warning.code} [${warning.sku}] ${warning.messageVi}`,
    ),
    sweeps,
    policies: compareMarketPolicies({ seeds, days, profileId }),
    crops: cropEconomics({ saturation: options.saturation }),
    cooking: cookEconomics(),
    cookingChannels: cookingChannelEconomics(),
    gaps: analyzeCatalogGaps(),
    recoverySplit: recoverySplitExperiment(),
    pacing,
    orders: { withOrders, withoutOrders },
  };
}




// --------------------------------------------------------------------------
// Market-policy comparison (A–E) with the five denominators
// --------------------------------------------------------------------------

export interface PolicyMetricsRow {
  readonly policyId: string;
  readonly policyLabel: string;
  readonly personaId: PersonaId;
  readonly coinsPerWorkedMinute: number;
  readonly coinsPerSessionMinute: number;
  readonly coinsPerRealDay: number;
  readonly netPerPlotDay: number;
  readonly idleShare: number;
  readonly topGroupShare: number;
  readonly distinctGroups: number;
  readonly medianWealth: number;
}

/** Runs each experimental market policy against each persona. */
export function compareMarketPolicies(input: {
  seeds: readonly number[];
  days: number;
  profileId: ProfileId;
  personas?: readonly PersonaId[];
  policies?: readonly MarketPolicy[];
}): PolicyMetricsRow[] {
  const personas =
    input.personas ?? (['casual', 'optimizer_mixed', 'optimizer'] as readonly PersonaId[]);
  const policies = input.policies ?? buildPolicySet();
  const rows: PolicyMetricsRow[] = [];

  for (const policy of policies) {
    for (const personaId of personas) {
      const metrics: IncomeMetrics[] = [];
      const diversity: DiversityMetrics[] = [];
      const wealth: number[] = [];
      const plotRates: number[] = [];
      const idle: number[] = [];
      for (const seed of input.seeds) {
        const result = runSimulation({
          seed,
          profileId: input.profileId,
          personaId,
          days: input.days,
          market: policy,
        });
        const last = result.snapshots[result.snapshots.length - 1];
        metrics.push(incomeMetrics(result));
        diversity.push(diversityMetrics(result));
        wealth.push(last?.wealthCoins ?? 0);
        plotRates.push(last?.netPerPlotDay ?? 0);
        idle.push(last?.idleShare ?? 0);
      }
      rows.push({
        policyId: policy.id,
        policyLabel: policy.labelVi,
        personaId,
        coinsPerWorkedMinute: round2(median(metrics.map((entry) => entry.coinsPerWorkedMinute))),
        coinsPerSessionMinute: round2(median(metrics.map((entry) => entry.coinsPerSessionMinute))),
        coinsPerRealDay: round2(median(metrics.map((entry) => entry.coinsPerRealDay))),
        netPerPlotDay: round2(median(plotRates)),
        idleShare: round2(median(idle)),
        topGroupShare: round2(median(diversity.map((entry) => entry.topGroupShare))),
        distinctGroups: Math.round(median(diversity.map((entry) => entry.distinctGroups))),
        medianWealth: Math.round(median(wealth)),
      });
    }
  }
  return rows;
}

// --------------------------------------------------------------------------
// Cooking channels inside the approved multiplier band
// --------------------------------------------------------------------------

export interface CookingChannelRow {
  readonly dishSku: string;
  readonly inputValueCoins: number;
  readonly binProfitCoins: number;
  readonly binPerMinute: number;
  readonly orderPerMinute: number;
  readonly restaurant160PerMinute: number;
  readonly restaurant180PerMinute: number;
  readonly restaurant200PerMinute: number;
}

/**
 * Raw vs cooked vs order vs restaurant, using ONLY the approved 1.60x–2.00x
 * restaurant band from docs/economy/MARKET_AND_NPC.md §1.
 */
export function cookingChannelEconomics(): CookingChannelRow[] {
  const dishes = ITEM_CATALOG.filter((item) => item.group === 'dish');
  const actionMinutes = ACTION_SECONDS.cook / 60;
  return dishes.map((dish) => {
    const inputValue = dish.inputs.reduce(
      (sum, input) => sum + requireItem(input.sku).sellPrice * input.qty,
      0,
    );
    const binProfit = dish.sellPrice - inputValue;
    const orderPrice = computeSellPrice(dish.sku, 'normal', 0, {
      demandBp: dish.orderMultiplierBp ?? 10_000,
    });
    const at = (bp: number): number =>
      round2(
        (computeSellPrice(dish.sku, 'normal', 0, { demandBp: bp }) - inputValue) / actionMinutes,
      );
    return {
      dishSku: dish.sku,
      inputValueCoins: inputValue,
      binProfitCoins: binProfit,
      binPerMinute: round2(binProfit / actionMinutes),
      orderPerMinute: round2((orderPrice - inputValue) / actionMinutes),
      restaurant160PerMinute: at(16_000),
      restaurant180PerMinute: at(18_000),
      restaurant200PerMinute: at(20_000),
    };
  });
}

// --------------------------------------------------------------------------
// Catalog consistency findings
// --------------------------------------------------------------------------

export interface CatalogGapFinding {
  readonly id: string;
  readonly severity: 'info' | 'warning';
  readonly summaryVi: string;
  readonly evidence: Readonly<Record<string, number | string>>;
  readonly proposalVi: string;
}

/**
 * Explains (with numbers) the two approved-table gaps found by `validateCatalog`:
 * `carp_pond` standard-value drift and the missing peach sapling acquisition.
 */
export function analyzeCatalogGaps(): CatalogGapFinding[] {
  const carp = requireItem('carp_pond');
  const bait = requireItem(carp.inputs[0]?.sku ?? 'bait_free_worm');
  const inputValueBp = (carp.inputs[0]?.qty ?? 0) * bait.standardValueBp;
  const laborBp = carp.laborMilli * 50;
  const depreciationBp = carp.depreciation * 10_000;
  const derivedBp = inputValueBp + laborBp + depreciationBp;
  const herbCarp = requireItem('herb_carp');
  const herbDerivedBp = herbCarp.inputs.reduce(
    (sum, input) => sum + input.qty * requireItem(input.sku).standardValueBp,
    0,
  ) + herbCarp.laborMilli * 50 + herbCarp.depreciation * 10_000;

  const peach = requireItem('peach');
  const peachHarvestCoins = peach.sellPrice * peach.batchQty;

  return [
    {
      id: 'carp_pond_drift',
      severity: 'warning',
      summaryVi:
        'V_i của carp_pond lệch 1 xu: bảng ghi 11,0 nhưng công thức (nguyên liệu + lao động + khấu hao) cho 12,0; herb_carp được tính theo 11,0 nên lệch dây chuyền.',
      evidence: {
        inputValueBp,
        laborBp,
        depreciationBp,
        derivedBp,
        authoredBp: carp.standardValueBp,
        herbCarpAuthoredBp: herbCarp.standardValueBp,
        herbCarpDerivedFrom11Bp: herbDerivedBp,
        sellPriceCarp: carp.sellPrice,
        sellPriceHerbCarp: herbCarp.sellPrice,
      },
      proposalVi:
        'Sửa bảng thành carp_pond 12,0 và herb_carp 30,0 (giá bán giữ nguyên 14/32), hoặc giữ 11,0/29,0 và ghi chú sai số PoC. Cần chủ dự án duyệt; giá người chơi thấy không đổi.',
    },
    {
      id: 'peach_no_acquisition',
      severity: 'warning',
      summaryVi:
        'peach có giá bán nhưng không có SKU cây giống: không mua được, không có nguyên liệu, không hái lượm được → hiện bị loại khỏi mô phỏng.',
      evidence: {
        sellPrice: peach.sellPrice,
        batchQty: peach.batchQty,
        revenuePerHarvestCoins: peachHarvestCoins,
        storeBuy: 'null',
        inputs: 0,
        forageable: 0,
      },
      proposalVi:
        'Thêm SKU sapling_peach (mua 240 xu, không bán lại) cho 6 vụ × 3 quả; khi đó lãi 14 xu/phút thao tác, ngang dâu tây. Nếu giữ giá cây 30 xu như farming đang giả định thì peach lãi ~49 xu/phút và phá trần dominant strategy 2,2×.',
    },
  ];
}
// --------------------------------------------------------------------------
// Demand-recovery shape (policy E) — analytic, because the simulator sells once
// per session and therefore cannot show intra-day spreading by itself.
// --------------------------------------------------------------------------

export interface RecoverySplitRow {
  readonly units: number;
  readonly dumpCoins: number;
  readonly splitAcrossThreeSessionsCoins: number;
  readonly recoveredShare: number;
}

/**
 * Compares dumping N units of the same group in one moment vs spreading them over
 * three moments (0h / 3h / 6h) with the recovering policy.
 */
export function recoverySplitExperiment(units = 24, unitBaseBp = 80_000): RecoverySplitRow[] {
  const base = baselinePolicy();
  const recovering = recoveringPolicy({ halfLifeMs: 6 * 3_600_000 });

  let dump = 0;
  for (let index = 0; index < units; index += 1) {
    const multiplier = base.multiplierBp({
      sku: 'wheat',
      group: 'grain',
      soldSkuUnits: index,
      soldGroupUnits: index,
      soldValueCoins: 0,
      nowMs: 0,
      firstSaleAtMs: 0,
    });
    dump += divFloor(mulBp(unitBaseBp, multiplier), 10_000);
  }

  let split = 0;
  const third = Math.ceil(units / 3);
  let sold = 0;
  for (let session = 0; session < 3; session += 1) {
    const nowMs = session * 3 * 3_600_000;
    const count = session === 2 ? units - sold : Math.min(third, units - sold);
    for (let index = 0; index < count; index += 1) {
      const multiplier = recovering.multiplierBp({
        sku: 'wheat',
        group: 'grain',
        soldSkuUnits: sold,
        soldGroupUnits: sold,
        soldValueCoins: 0,
        nowMs,
        firstSaleAtMs: 0,
      });
      split += divFloor(mulBp(unitBaseBp, multiplier), 10_000);
      sold += 1;
    }
  }

  return [
    {
      units,
      dumpCoins: dump,
      splitAcrossThreeSessionsCoins: split,
      recoveredShare: dump > 0 ? round2((split - dump) / dump) : 0,
    },
  ];
}