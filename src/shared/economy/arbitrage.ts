/**
 * Arbitrage analysis over the item catalog (docs/economy/ECONOMY_MODEL.md §2,
 * docs/economy/ECONOMY_SIMULATOR_SPEC.md "Zero Arbitrage").
 *
 * Two checks:
 * 1. Direct resale: buying a shop item and instantly selling it at a profit.
 * 2. Instant multi-step production: a recipe chain that can be executed with no
 *    waiting at all (`batchDurationMs === 0` on every step) from shop inputs only
 *    and still sells above its input cost.
 *
 * Growth, cooking and fishing all have a non-zero production duration, so they
 * are labour, not arbitrage. They are reported separately by the simulator as a
 * coins-per-minute rate instead of being treated as failures.
 */

import { ITEM_CATALOG } from './catalogConfig';
import type { ItemDefinition } from './types';

export type ArbitrageKind = 'direct_resale' | 'instant_craft';

export interface ArbitrageFinding {
  readonly kind: ArbitrageKind;
  /** Item path involved (input chain for `instant_craft`). */
  readonly path: readonly string[];
  /** Minimum acquisition cost in whole coins. */
  readonly costPerUnit: number;
  /** Base sell price in whole coins. */
  readonly sellPerUnit: number;
  /** `sellPerUnit - costPerUnit` (always positive in a finding). */
  readonly profitPerUnit: number;
  readonly detailVi: string;
}

export interface ArbitrageReport {
  readonly findings: readonly ArbitrageFinding[];
  /** Items with a known instant acquisition cost (checked for `instant_craft`). */
  readonly instantCostsChecked: number;
  /** Items that cannot be produced without waiting. */
  readonly timeGatedItems: readonly string[];
  readonly ok: boolean;
}

/**
 * Minimum cost in whole coins to obtain one unit with zero waiting, or `null`
 * when the item cannot be bought and cannot be instantly crafted.
 */
function instantCostPerUnit(
  sku: string,
  bySku: ReadonlyMap<string, ItemDefinition>,
  memo: Map<string, number | null>,
  visiting: Set<string>,
): number | null {
  const cached = memo.get(sku);
  if (cached !== undefined) {
    return cached;
  }
  if (visiting.has(sku)) {
    // Recipe cycles are rejected by validateCatalog; guard anyway.
    return null;
  }
  const definition = bySku.get(sku);
  if (!definition) {
    memo.set(sku, null);
    return null;
  }
  if (definition.storeBuy !== null) {
    const cost = definition.storeBuy;
    memo.set(sku, cost);
    return cost;
  }
  if (definition.inputs.length === 0 || definition.batchDurationMs > 0) {
    memo.set(sku, null);
    return null;
  }
  visiting.add(sku);
  let batchCost = 0;
  let resolvable = true;
  for (const input of definition.inputs) {
    const inputCost = instantCostPerUnit(input.sku, bySku, memo, visiting);
    if (inputCost === null) {
      resolvable = false;
      break;
    }
    batchCost += inputCost * input.qty;
  }
  visiting.delete(sku);
  if (!resolvable) {
    memo.set(sku, null);
    return null;
  }
  // Round the unit cost up: never understate what the player must pay.
  const perUnit = Math.ceil(batchCost / definition.batchQty);
  memo.set(sku, perUnit);
  return perUnit;
}

/** Shop items whose instant resale would print coins. */
export function findDirectResaleArbitrage(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
): ArbitrageFinding[] {
  const findings: ArbitrageFinding[] = [];
  for (const definition of catalog) {
    if (definition.storeBuy === null || definition.sellPrice <= 0) {
      continue;
    }
    if (definition.sellPrice > definition.storeBuy) {
      findings.push({
        kind: 'direct_resale',
        path: [definition.sku],
        costPerUnit: definition.storeBuy,
        sellPerUnit: definition.sellPrice,
        profitPerUnit: definition.sellPrice - definition.storeBuy,
        detailVi: `Mua ${definition.sku} giá ${definition.storeBuy}c rồi bán ${definition.sellPrice}c`,
      });
    }
  }
  return findings;
}

/** Full zero-wait arbitrage scan (direct + multi-step instant production). */
export function analyzeArbitrage(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
): ArbitrageReport {
  const bySku = new Map(catalog.map((definition) => [definition.sku, definition]));
  const memo = new Map<string, number | null>();
  const findings: ArbitrageFinding[] = [...findDirectResaleArbitrage(catalog)];
  const timeGated: string[] = [];
  let checked = 0;

  for (const definition of catalog) {
    if (definition.storeBuy !== null) {
      checked += 1;
      continue;
    }
    if (definition.inputs.length === 0) {
      continue;
    }
    if (definition.batchDurationMs > 0) {
      timeGated.push(definition.sku);
      continue;
    }
    const cost = instantCostPerUnit(definition.sku, bySku, memo, new Set());
    if (cost === null) {
      continue;
    }
    checked += 1;
    if (definition.sellPrice > cost && definition.sellChannels.length > 0) {
      findings.push({
        kind: 'instant_craft',
        path: definition.inputs.map((input) => input.sku),
        costPerUnit: cost,
        sellPerUnit: definition.sellPrice,
        profitPerUnit: definition.sellPrice - cost,
        detailVi: `Chế tạo tức thời ${definition.sku}: ${cost}c -> bán ${definition.sellPrice}c`,
      });
    }
  }

  return {
    findings,
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
