/**
 * Arbitrage analysis over the item catalog.
 *
 * Hardened after the independent GPT review (SHA 5eda187), which reproduced a
 * false negative: an input costing 5 coins producing a batch of 2 items sold at
 * 3 coins each yields 6 - 5 = 1 coin of profit, but the old detector rounded the
 * per-unit cost up to 3 and missed it.
 *
 * Rules now:
 * - Costs are compared **per produced batch**, never per rounded unit.
 * - Costs are exact fractions (numerator/denominator), so chained recipes cannot
 *   lose or invent fractions of a coin.
 * - Both acquisition paths are considered (shop purchase and zero-wait crafting);
 *   a shop price no longer hides a cheaper craft path.
 * - Milestone gating is respected.
 * - A finding means "repeatable without waiting": every input is instantly
 *   acquirable and every recipe step has `batchDurationMs === 0`. Time-gated
 *   production is labour, not an infinite loop.
 * - Quality is RNG-gated, so gold-only profitability is reported separately as
 *   `qualityGatedFindings` and does not by itself fail the audit.
 */

import { ITEM_CATALOG } from './catalogConfig.ts';
import { isMilestoneAtOrBefore, QUALITY_MULTIPLIER_BP } from './types.ts';
import type { ItemDefinition, ItemQuality, MilestoneId } from './types.ts';
import { divFloor, mulBp } from './ledgerMath.ts';

export type ArbitrageKind = 'direct_resale' | 'instant_craft';

export interface ArbitrageFinding {
  readonly kind: ArbitrageKind;
  /** Item path involved (single SKU for direct resale). */
  readonly path: readonly string[];
  /** Whole coins for one produced batch. */
  readonly batchQty: number;
  /** Exact acquisition cost of one batch, floored for display. */
  readonly batchCostCoins: number;
  /** Revenue of one batch at the analysed quality. */
  readonly batchRevenueCoins: number;
  /** `batchRevenueCoins - batchCostCoins` (can be fractional; floored). */
  readonly profitPerBatchCoins: number;
  /** Profit expressed per unit, in thousandths of a coin (informational). */
  readonly profitPerUnitMilli: number;
  /** True when the profit only exists at a lucky quality tier. */
  readonly qualityGated: boolean;
  readonly detailVi: string;
}

export interface ArbitrageReport {
  readonly findings: readonly ArbitrageFinding[];
  readonly qualityGatedFindings: readonly ArbitrageFinding[];
  /** Items with a known instant acquisition cost. */
  readonly instantCostsChecked: number;
  /** Items that cannot be produced without waiting. */
  readonly timeGatedItems: readonly string[];
  /** True when no repeatable profitable loop exists at normal quality. */
  readonly ok: boolean;
}

export interface ArbitrageOptions {
  /** Only consider items unlocked at or before this milestone. */
  readonly milestone?: MilestoneId;
  /** Quality used for the revenue side; defaults to `normal`. */
  readonly quality?: ItemQuality;
}

interface Fraction {
  readonly n: number;
  readonly d: number;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a === 0 ? 1 : a;
}

function fraction(n: number, d = 1): Fraction {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0) {
    throw new RangeError('fraction requires safe integers and a non-zero denominator');
  }
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return { n: (n * sign) / divisor, d: Math.abs(d) / divisor };
}

function multiplyByInteger(value: Fraction, factor: number): Fraction {
  return fraction(value.n * factor, value.d);
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  return fraction(left.n * right.d + right.n * left.d, left.d * right.d);
}

function compareFractions(left: Fraction, right: Fraction): number {
  const diff = left.n * right.d - right.n * left.d;
  return diff === 0 ? 0 : diff > 0 ? 1 : -1;
}

function floorFraction(value: Fraction): number {
  return Math.floor(value.n / value.d);
}

/** Cost of one produced batch of `sku`, or `null` when not instantly acquirable. */
function batchCost(
  sku: string,
  bySku: ReadonlyMap<string, ItemDefinition>,
  milestone: MilestoneId,
  memo: Map<string, Fraction | null>,
  visiting: Set<string>,
): Fraction | null {
  const cached = memo.get(sku);
  if (cached !== undefined) {
    return cached;
  }
  if (visiting.has(sku)) {
    memo.set(sku, null);
    return null;
  }
  const definition = bySku.get(sku);
  if (!definition || !isMilestoneAtOrBefore(definition.milestone, milestone)) {
    memo.set(sku, null);
    return null;
  }

  const shopCost: Fraction | null =
    definition.storeBuy !== null
      ? fraction(definition.storeBuy * definition.batchQty)
      : null;

  let craftCost: Fraction | null = null;
  if (definition.inputs.length > 0 && definition.batchDurationMs === 0) {
    visiting.add(sku);
    let total = fraction(0);
    let resolvable = true;
    for (const input of definition.inputs) {
      const inputDefinition = bySku.get(input.sku);
      if (!inputDefinition) {
        resolvable = false;
        break;
      }
      const inputBatch = batchCost(input.sku, bySku, milestone, memo, visiting);
      if (inputBatch === null) {
        resolvable = false;
        break;
      }
      // Unit cost of the input, exactly: inputBatch / inputDefinition.batchQty.
      const unitCost = fraction(inputBatch.n, inputBatch.d * inputDefinition.batchQty);
      total = addFractions(total, multiplyByInteger(unitCost, input.qty));
    }
    visiting.delete(sku);
    if (resolvable) {
      craftCost = total;
    }
  }

  const chosen: Fraction | null =
    shopCost && craftCost
      ? compareFractions(shopCost, craftCost) <= 0
        ? shopCost
        : craftCost
      : (shopCost ?? craftCost);
  memo.set(sku, chosen);
  return chosen;
}

/** Same rounding as computeSellPrice at zero saturation and 1.0x demand. */
function unitPriceFor(definition: ItemDefinition, quality: ItemQuality): number {
  const qualityBp = definition.qualityTiers.includes(quality)
    ? QUALITY_MULTIPLIER_BP[quality]
    : QUALITY_MULTIPLIER_BP.normal;
  return divFloor(mulBp(definition.sellPrice * 10_000, qualityBp), 10_000);
}

function revenuePerBatch(definition: ItemDefinition, quality: ItemQuality): number {
  return unitPriceFor(definition, quality) * definition.batchQty;
}

function buildFinding(
  definition: ItemDefinition,
  cost: Fraction,
  quality: ItemQuality,
  kind: ArbitrageKind,
  qualityGated: boolean,
): ArbitrageFinding | null {
  const revenue = revenuePerBatch(definition, quality);
  if (compareFractions(cost, fraction(revenue)) >= 0) {
    return null;
  }
  // Exact integer profit: revenue*cost.d - cost.n over cost.d.
  const profitNum = revenue * cost.d - cost.n;
  const profitDen = cost.d;
  return {
    kind,
    path: [definition.sku],
    batchQty: definition.batchQty,
    batchCostCoins: floorFraction(cost),
    batchRevenueCoins: revenue,
    profitPerBatchCoins: Math.floor(profitNum / profitDen),
    profitPerUnitMilli: Math.floor((profitNum * 1_000) / (profitDen * definition.batchQty)),
    qualityGated,
    detailVi: `${definition.sku}: 1 lô ${definition.batchQty} sản phẩm bán ${revenue}c, chi phí ${floorFraction(cost)}c (${quality})`,
  };
}

/** Shop items whose instant resale prints coins. */
export function findDirectResaleArbitrage(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
  options: ArbitrageOptions = {},
): ArbitrageFinding[] {
  const quality = options.quality ?? 'normal';
  const milestone = options.milestone ?? 'V0.3.0';
  const findings: ArbitrageFinding[] = [];
  for (const definition of catalog) {
    if (
      definition.storeBuy === null ||
      definition.sellPrice <= 0 ||
      !isMilestoneAtOrBefore(definition.milestone, milestone)
    ) {
      continue;
    }
    const finding = buildFinding(
      definition,
      fraction(definition.storeBuy * definition.batchQty),
      quality,
      'direct_resale',
      quality !== 'normal',
    );
    if (finding) {
      findings.push(finding);
    }
  }
  return findings;
}

/** Full zero-wait arbitrage scan (direct + multi-step instant production). */
export function analyzeArbitrage(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
  options: ArbitrageOptions = {},
): ArbitrageReport {
  const milestone = options.milestone ?? 'V0.3.0';
  const quality = options.quality ?? 'normal';
  const bySku = new Map(catalog.map((definition) => [definition.sku, definition]));
  const memo = new Map<string, Fraction | null>();
  const timeGated: string[] = [];
  const findings: ArbitrageFinding[] = [...findDirectResaleArbitrage(catalog, options)];
  const qualityGatedFindings: ArbitrageFinding[] = [];
  let checked = 0;

  for (const definition of catalog) {
    if (!isMilestoneAtOrBefore(definition.milestone, milestone)) {
      continue;
    }
    if (definition.storeBuy !== null) {
      checked += 1;
    }
    if (definition.inputs.length === 0) {
      continue;
    }
    if (definition.batchDurationMs > 0) {
      timeGated.push(definition.sku);
      continue;
    }
    const cost = batchCost(definition.sku, bySku, milestone, memo, new Set());
    if (cost === null) {
      continue;
    }
    if (definition.storeBuy === null) {
      checked += 1;
    }
    const normal = buildFinding(definition, cost, quality, 'instant_craft', false);
    if (normal && definition.sellChannels.length > 0) {
      findings.push(normal);
      continue;
    }
    // Gold quality is RNG-gated; report it, but do not fail the audit on luck.
    const gated =
      quality === 'normal'
        ? buildFinding(definition, cost, 'gold', 'instant_craft', true)
        : null;
    if (gated && definition.sellChannels.length > 0 && definition.qualityTiers.includes('gold')) {
      qualityGatedFindings.push(gated);
    }
  }

  return {
    findings,
    qualityGatedFindings,
    instantCostsChecked: checked,
    timeGatedItems: timeGated,
    ok: findings.length === 0,
  };
}

/** Items violating the design rule `storeBuy >= 2 × sellPrice`. */
export function findResaleRuleViolations(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
): { readonly sku: string; readonly storeBuy: number; readonly sellPrice: number }[] {
  const violations: { sku: string; storeBuy: number; sellPrice: number }[] = [];
  for (const definition of catalog) {
    if (definition.storeBuy === null) {
      continue;
    }
    if (definition.storeBuy < 2 * definition.sellPrice) {
      violations.push({
        sku: definition.sku,
        storeBuy: definition.storeBuy,
        sellPrice: definition.sellPrice,
      });
    }
  }
  return violations;
}
