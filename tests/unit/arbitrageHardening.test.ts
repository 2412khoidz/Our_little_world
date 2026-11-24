/**
 * P1 — Arbitrage detector regressions.
 *
 * The fixture is the exact counterexample from the GPT review: an input costing
 * 5 coins produces a batch of 2 items sold at 3 coins each (revenue 6, profit 1).
 * The previous detector rounded the unit cost up to 3 and reported nothing.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeArbitrage,
  findDirectResaleArbitrage,
  findResaleRuleViolations,
} from '../../src/shared/economy/arbitrage';
import { ITEM_CATALOG } from '../../src/shared/economy/catalogConfig';
import type { ItemDefinition } from '../../src/shared/economy/types';

function def(partial: Partial<ItemDefinition> & { sku: string }): ItemDefinition {
  return {
    nameVi: partial.sku,
    group: 'material',
    milestone: 'V0.2.0',
    stackLimit: 99,
    storeBuy: null,
    sellPrice: 0,
    laborMilli: 0,
    depreciation: 0,
    batchQty: 1,
    inputs: [],
    batchDurationMs: 0,
    standardValueBp: 0,
    orderMultiplierBp: null,
    qualityTiers: ['normal'],
    sellChannels: ['shipping_bin'],
    forageable: false,
    ...partial,
  };
}

const INPUT = def({ sku: 'in_x', storeBuy: 5, sellPrice: 2 });
const OUTPUT = def({
  sku: 'out_y',
  inputs: [{ sku: 'in_x', qty: 1 }],
  batchQty: 2,
  sellPrice: 3,
});

describe('P1 — whole-batch comparison (GPT counterexample)', () => {
  it('detects the 5c -> 2 x 3c fixture as a 1 coin batch profit', () => {
    const report = analyzeArbitrage([INPUT, OUTPUT]);
    expect(report.ok).toBe(false);
    expect(report.findings).toHaveLength(1);
    const finding = report.findings[0];
    expect(finding?.kind).toBe('instant_craft');
    expect(finding?.batchQty).toBe(2);
    expect(finding?.batchCostCoins).toBe(5);
    expect(finding?.batchRevenueCoins).toBe(6);
    expect(finding?.profitPerBatchCoins).toBe(1);
    expect(finding?.profitPerUnitMilli).toBe(500);
  });

  it('does not hide a cheap craft path behind an expensive shop price', () => {
    const shopMasked = { ...OUTPUT, storeBuy: 10 };
    const report = analyzeArbitrage([INPUT, shopMasked]);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.batchCostCoins).toBe(5);
  });

  it('does not flag a batch that loses money', () => {
    // 2 x 2c = 4c revenue against a 5c input: no profit, no finding.
    const losing = { ...OUTPUT, sellPrice: 2 };
    const report = analyzeArbitrage([INPUT, losing]);
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it('treats time-gated production as labour, not an exploit', () => {
    const slow = { ...OUTPUT, batchDurationMs: 60_000 };
    const report = analyzeArbitrage([INPUT, slow]);
    expect(report.ok).toBe(true);
    expect(report.timeGatedItems).toContain('out_y');
  });

  it('respects milestone gating', () => {
    const future = { ...OUTPUT, milestone: 'V0.3.0' as const };
    const report = analyzeArbitrage([INPUT, future], { milestone: 'V0.2.0' });
    expect(report.ok).toBe(true);
    expect(report.findings).toHaveLength(0);
  });

  it('does not flag a craft whose inputs cannot be bought or crafted', () => {
    const gatedInput = def({ sku: 'in_x' });
    const report = analyzeArbitrage([gatedInput, OUTPUT]);
    expect(report.ok).toBe(true);
  });
});

describe('P1 — quality and direct resale', () => {
  it('separates RNG-gated gold profit from a deterministic loop', () => {
    const goldOnly = def({
      sku: 'out_q',
      inputs: [{ sku: 'in_x', qty: 1 }],
      batchQty: 1,
      sellPrice: 5,
      qualityTiers: ['normal', 'gold'],
    });
    const report = analyzeArbitrage([INPUT, goldOnly]);
    // Normal quality breaks even exactly, so the audit passes...
    expect(report.ok).toBe(true);
    // ... but the gold ceiling is reported, not hidden.
    expect(report.qualityGatedFindings).toHaveLength(1);
    expect(report.qualityGatedFindings[0]?.qualityGated).toBe(true);
  });

  it('detects a direct resale loop and the design-rule violation', () => {
    const bad = def({ sku: 'shop_bad', storeBuy: 4, sellPrice: 5 });
    const findings = findDirectResaleArbitrage([bad]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.profitPerBatchCoins).toBe(1);
    expect(findResaleRuleViolations([bad])).toHaveLength(1);
  });
});

describe('P1 — shipped catalog stays clean', () => {
  it('has no repeatable arbitrage at normal quality', () => {
    const report = analyzeArbitrage(ITEM_CATALOG);
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.timeGatedItems.length).toBeGreaterThan(10);
  });

  it('does not report a quality-gated loop in the shipped catalog', () => {
    const report = analyzeArbitrage(ITEM_CATALOG);
    expect(report.qualityGatedFindings).toEqual([]);
  });
});
