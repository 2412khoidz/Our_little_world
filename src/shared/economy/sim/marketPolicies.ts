/**
 * Experimental market / soft-saturation policies (Phase 3 supplementary work).
 *
 * The production catalog and the production Shipping Bin keep using
 * `DEFAULT_SATURATION` (threshold 20 units per group per day, -1% per unit past
 * the threshold, floor -30%). The policies below are EXPERIMENTS: they are only
 * injected into simulator runs and never mutate `ITEM_CATALOG` or the bin rules.
 *
 * A policy returns a multiplier in basis points (`10_000 = 1.0`) for the next
 * unit of a SKU. The engine applies it to the base sell price (quality and
 * demand already resolved). Policies must always return a finite multiplier in
 * `[floorBp, 10_000]` so a sale can never become negative or explode.
 */

import { BP_DENOM, saturationMultiplierBp } from '../ledgerMath.ts';
import { DEFAULT_SATURATION } from '../types.ts';
import type { SaturationConfig } from '../types.ts';

/** Saturation disabled: the engine uses this to obtain the raw base price. */
export const NO_SATURATION: SaturationConfig = {
  threshold: 2_000_000_000,
  stepBp: 0,
  floorBp: BP_DENOM,
};

export interface MarketPriceInput {
  readonly sku: string;
  readonly group: string;
  /** Units of this SKU already sold today. */
  readonly soldSkuUnits: number;
  /** Units of this item group already sold today. */
  readonly soldGroupUnits: number;
  /** Coins already earned from bin sales today. */
  readonly soldValueCoins: number;
  readonly nowMs: number;
  /** First bin sale of the current local day, or null. */
  readonly firstSaleAtMs: number | null;
}

export interface MarketPolicy {
  readonly id: string;
  readonly labelVi: string;
  /** Multiplier in basis points, always clamped to `[floorBp, 10_000]`. */
  multiplierBp(input: MarketPriceInput): number;
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function safeTime(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clampMultiplier(value: number, floorBp: number): number {
  if (!Number.isFinite(value)) {
    return floorBp;
  }
  return Math.max(floorBp, Math.min(BP_DENOM, Math.floor(value)));
}

/** A — the approved baseline: 20 units per group per day, then -1% each. */
export function baselinePolicy(config: SaturationConfig = DEFAULT_SATURATION): MarketPolicy {
  return {
    id: 'A_baseline',
    labelVi: 'A · Baseline (20 đơn vị/nhóm/ngày, -1%/đơn vị, sàn -30%)',
    multiplierBp: (input) => saturationMultiplierBp(safeCount(input.soldGroupUnits), config),
  };
}

/** B — same shape, lower threshold (more protective). */
export function lowerThresholdPolicy(threshold: number, stepBp = 100, floorBp = 7_000): MarketPolicy {
  return {
    id: `B_threshold_${threshold}`,
    labelVi: `B · Ngưỡng thấp hơn (${threshold} đơn vị/nhóm/ngày)`,
    multiplierBp: (input) =>
      saturationMultiplierBp(safeCount(input.soldGroupUnits), { threshold, stepBp, floorBp }),
  };
}

export interface PerGroupPolicyOptions {
  /** Threshold per item group; unlisted groups use `defaultThreshold`. */
  readonly thresholds: Readonly<Record<string, number>>;
  readonly defaultThreshold: number;
  /** Optional stricter/looser override for a single SKU. */
  readonly skuOverrides?: Readonly<Record<string, number>>;
  readonly stepBp?: number;
  readonly floorBp?: number;
}

/**
 * C — threshold per group (or per SKU). Slow luxury goods saturate earlier than
 * staple vegetables, which is the intended "market absorption" idea.
 */
export function perGroupPolicy(options: PerGroupPolicyOptions): MarketPolicy {
  const stepBp = options.stepBp ?? 100;
  const floorBp = options.floorBp ?? 7_000;
  return {
    id: 'C_per_group',
    labelVi: 'C · Ngưỡng riêng theo nhóm/SKU',
    multiplierBp: (input) => {
      const threshold =
        options.skuOverrides?.[input.sku] ??
        options.thresholds[input.group] ??
        options.defaultThreshold;
      return saturationMultiplierBp(safeCount(input.soldGroupUnits), {
        threshold,
        stepBp,
        floorBp,
      });
    },
  };
}

export interface ValueBasedPolicyOptions {
  /** Coins of bin revenue per local day that are sold at full price. */
  readonly valueThresholdCoins: number;
  /** Basis points lost per additional coin sold past the threshold. */
  readonly stepBpPerCoin: number;
  readonly floorBp?: number;
}

/**
 * D — saturation by total sold VALUE instead of unit count. Cheap staples can be
 * sold in volume without flooding the market, while a few expensive dishes or
 * fish eat the day's absorption budget quickly.
 */
export function valueBasedPolicy(options: ValueBasedPolicyOptions): MarketPolicy {
  const floorBp = options.floorBp ?? 7_000;
  if (options.valueThresholdCoins < 0 || options.stepBpPerCoin < 0) {
    throw new RangeError('valueBasedPolicy requires non-negative parameters');
  }
  return {
    id: 'D_value',
    labelVi: `D · Bão hòa theo tổng giá trị (${options.valueThresholdCoins} xu/ngày, -${options.stepBpPerCoin}bp/xu)`,
    multiplierBp: (input) => {
      const over = safeCount(input.soldValueCoins) - options.valueThresholdCoins;
      if (over <= 0) {
        return BP_DENOM;
      }
      return clampMultiplier(BP_DENOM - over * options.stepBpPerCoin, floorBp);
    },
  };
}

export interface RecoveryPolicyOptions {
  readonly base?: SaturationConfig;
  /** Half-life of the "sold units" memory; after this long only half counts. */
  readonly halfLifeMs: number;
  readonly floorBp?: number;
}

/**
 * E — demand recovers during the day. Sold units decay exponentially with time,
 * so a player who spreads sales over several hours (or returns later) is not
 * punished the way a single dump is. No forced login: the multiplier never goes
 * below the same floor as the baseline.
 */
export function recoveringPolicy(options: RecoveryPolicyOptions): MarketPolicy {
  const base = options.base ?? DEFAULT_SATURATION;
  const floorBp = options.floorBp ?? base.floorBp;
  return {
    id: 'E_recovery',
    labelVi: `E · Nhu cầu hồi phục (bán rải rác, chu kỳ bán rã ${Math.round(options.halfLifeMs / 3_600_000)}h)`,
    multiplierBp: (input) => {
      const elapsedMs =
        input.firstSaleAtMs === null
          ? 0
          : Math.max(0, safeTime(input.nowMs) - safeTime(input.firstSaleAtMs));
      const decay = Math.pow(2, -elapsedMs / Math.max(1, options.halfLifeMs));
      const effectiveUnits = Math.floor(safeCount(input.soldGroupUnits) * decay);
      return saturationMultiplierBp(effectiveUnits, {
        threshold: base.threshold,
        stepBp: base.stepBp,
        floorBp,
      });
    },
  };
}

/** Group thresholds used by policy C (slower luxury goods absorb less). */
export const PER_GROUP_THRESHOLDS: Readonly<Record<string, number>> = {
  grain: 12,
  veg: 10,
  fruit: 8,
  flower: 6,
  fish: 5,
  dish: 4,
  material: 20,
  seed: 20,
  pantry: 20,
  bait: 20,
  craft: 5,
};

/** The five variants compared by the experiment report (A–E). */
export function buildPolicySet(): readonly MarketPolicy[] {
  return [
    baselinePolicy(),
    lowerThresholdPolicy(8),
    perGroupPolicy({ thresholds: PER_GROUP_THRESHOLDS, defaultThreshold: 20 }),
    valueBasedPolicy({ valueThresholdCoins: 150, stepBpPerCoin: 40 }),
    recoveringPolicy({ halfLifeMs: 6 * 3_600_000 }),
  ];
}
