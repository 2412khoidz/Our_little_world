import { describe, expect, it } from 'vitest';
import {
  CATALOG_VERSION,
  catalogFingerprint,
  computeSellLot,
  computeSellPrice,
  computeSellPriceBp,
  deriveStandardValueBp,
  getItem,
  isItemAvailable,
  ITEM_CATALOG,
  itemsForMilestone,
  requireItem,
  STABLE_SKU_PATTERN,
  validateCatalog,
} from '../../src/shared/economy/catalogConfig';
import { analyzeArbitrage, findResaleRuleViolations } from '../../src/shared/economy/arbitrage';
import type { ItemDefinition } from '../../src/shared/economy/types';

function withOverrides(sku: string, patch: Partial<ItemDefinition>): ItemDefinition {
  return { ...requireItem(sku), ...patch };
}

describe('economy catalog — structure and SKU stability', () => {
  it('validates the shipped catalog with no errors', () => {
    const result = validateCatalog(ITEM_CATALOG);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('documents exactly the known design-table gaps', () => {
    const result = validateCatalog(ITEM_CATALOG);
    // carp_pond: the design table says V = 11.0 but its own inputs/labor/depreciation
    // sum to 12.0 under ECONOMY_MODEL §1. Downstream rows (herb_carp) were authored
    // against 11.0, so the authored value wins and the drift is reported, not hidden.
    // peach: PRODUCTION_CHAINS lists a perennial tree but no sapling SKU to buy.
    expect(
      result.warnings
        .map((warning) => `${warning.code}:${warning.sku}`)
        .sort(),
    ).toEqual(['NO_ACQUISITION_PATH:peach', 'STANDARD_VALUE_DRIFT:carp_pond']);
    expect(deriveStandardValueBp(requireItem('carp_pond'))).toBe(120_000);
  });

  it('keeps every SKU unique and stable-format', () => {
    const skus = ITEM_CATALOG.map((entry) => entry.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const sku of skus) {
      expect(STABLE_SKU_PATTERN.test(sku), `bad sku: ${sku}`).toBe(true);
    }
    expect(CATALOG_VERSION).toMatch(/^olw-economy-v/);
  });

  it('prices every shop item so direct resale cannot profit (storeBuy >= 2 × sell)', () => {
    for (const entry of ITEM_CATALOG) {
      if (entry.storeBuy === null) {
        continue;
      }
      expect(entry.storeBuy, entry.sku).toBeGreaterThanOrEqual(2 * entry.sellPrice);
    }
    expect(findResaleRuleViolations(ITEM_CATALOG)).toEqual([]);
  });

  it('has no arbitrage in the shipped catalog', () => {
    const report = analyzeArbitrage(ITEM_CATALOG);
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    // Time-gated chains (growth/cooking/fishing) are labour, not arbitrage.
    expect(report.timeGatedItems).toContain('wheat');
    expect(report.timeGatedItems).toContain('strawberry_tart');
  });

  it('rejects a catalog that breaks the resale rule', () => {
    const broken = ITEM_CATALOG.map((entry) =>
      entry.sku === 'seed_wheat' ? { ...entry, storeBuy: 3 } : entry,
    );
    const result = validateCatalog(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'RESALE_RULE' && issue.sku === 'seed_wheat')).toBe(true);
  });

  it('detects recipe cycles instead of looping forever', () => {
    const cycle: ItemDefinition[] = [
      withOverrides('wheat', {
        sku: 'test_a',
        inputs: [{ sku: 'test_b', qty: 1 }],
        storeBuy: null,
      }),
      withOverrides('wheat', {
        sku: 'test_b',
        inputs: [{ sku: 'test_a', qty: 1 }],
        storeBuy: null,
      }),
    ];
    const result = validateCatalog(cycle);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'RECIPE_CYCLE')).toBe(true);
  });

  it('flags unknown inputs and duplicate SKUs', () => {
    const unknownInput = [
      withOverrides('flour', { inputs: [{ sku: 'not_a_real_item', qty: 1 }] }),
    ];
    const unknownResult = validateCatalog(unknownInput);
    expect(unknownResult.errors.some((issue) => issue.code === 'UNKNOWN_INPUT')).toBe(true);

    const duplicates = [requireItem('wheat'), requireItem('wheat')];
    const duplicateResult = validateCatalog(duplicates);
    expect(duplicateResult.errors.some((issue) => issue.code === 'SKU_DUPLICATE')).toBe(true);
  });

  it('flags an input that ships in a later milestone', () => {
    const wrongMilestone = ITEM_CATALOG.map((entry) =>
      entry.sku === 'seed_wheat' ? { ...entry, milestone: 'V0.3.0' as const } : entry,
    );
    const result = validateCatalog(wrongMilestone);
    expect(result.errors.some((issue) => issue.code === 'INPUT_MILESTONE_AHEAD')).toBe(true);
  });
});

describe('economy catalog — milestone gating', () => {
  it('V0.2.0 exposes seeds and foraging only', () => {
    const skus = itemsForMilestone('V0.2.0').map((entry) => entry.sku);
    expect(skus).toContain('wild_herb');
    expect(skus).toContain('seed_wheat');
    expect(skus).not.toContain('wheat');
    expect(skus).not.toContain('carp_pond');
    expect(skus).not.toContain('flour');
    expect(skus.length).toBe(9);
  });

  it('enables farming at V0.2.1, fishing at V0.2.2 and cooking at V0.3.0', () => {
    expect(isItemAvailable('wheat', 'V0.2.1')).toBe(true);
    expect(isItemAvailable('wheat', 'V0.2.0')).toBe(false);
    expect(isItemAvailable('carp_pond', 'V0.2.2')).toBe(true);
    expect(isItemAvailable('carp_pond', 'V0.2.1')).toBe(false);
    expect(isItemAvailable('strawberry_tart', 'V0.3.0')).toBe(true);
    expect(isItemAvailable('strawberry_tart', 'V0.2.2')).toBe(false);
  });
});

describe('economy catalog — standard value (labour theory)', () => {
  it('matches the design table where the table is internally consistent', () => {
    expect(deriveStandardValueBp(requireItem('seed_wheat'))).toBe(40_000);
    expect(deriveStandardValueBp(requireItem('wheat'))).toBe(70_000);
    expect(deriveStandardValueBp(requireItem('tomato'))).toBe(105_000);
    expect(deriveStandardValueBp(requireItem('carrot_soup'))).toBe(410_000);
    expect(deriveStandardValueBp(requireItem('flour'))).toBe(190_000);
    expect(deriveStandardValueBp(requireItem('sakura_bouquet'))).toBe(930_000);
  });

  it('does not add growth waiting time to labour', () => {
    // wheat labour is 0.4 units -> 2 coins regardless of its 5 minute growth time.
    const wheat = requireItem('wheat');
    expect(wheat.laborMilli).toBe(400);
    expect(wheat.batchDurationMs).toBe(300_000);
    const withoutSeed = deriveStandardValueBp({ ...wheat, inputs: [] });
    expect(withoutSeed).toBe(30_000); // 2 coins labour + 1 coin depreciation
  });

  it('divides batch inputs by batch quantity', () => {
    // 1 seed (14c) + 5c labour + 2c depreciation over 2 tomatoes -> 10.5c
    expect(deriveStandardValueBp(requireItem('tomato'))).toBe(105_000);
    expect(requireItem('tomato').batchQty).toBe(2);
  });
});

describe('economy catalog — sell pricing', () => {
  it('computes base prices from the design table', () => {
    expect(computeSellPrice('wheat')).toBe(8);
    expect(computeSellPrice('carrot')).toBe(15);
    expect(computeSellPrice('tomato')).toBe(13);
    expect(computeSellPrice('rose_sakura')).toBe(48);
    expect(computeSellPrice('lotus_trout')).toBe(36);
    expect(computeSellPrice('strawberry_tart')).toBe(78);
    expect(computeSellPrice('wood_chair')).toBe(26);
  });

  it('applies quality tiers and ignores quality on items without tiers', () => {
    expect(computeSellPrice('wheat', 'normal')).toBe(8);
    expect(computeSellPrice('wheat', 'silver')).toBe(10); // floor(8 * 1.25)
    expect(computeSellPrice('wheat', 'gold')).toBe(12); // floor(8 * 1.55)
    // Seeds cannot be silver/gold, so the tier is ignored instead of mis-scaling.
    expect(computeSellPrice('seed_wheat', 'gold')).toBe(2);
    expect(requireItem('seed_wheat').qualityTiers).toEqual(['normal']);
  });

  it('rounds down after every multiplier in the documented order', () => {
    // base 13c = 130000bp -> gold (×1.55) -> demand 1.45 -> saturation at unit 20 (0.99)
    const byQuality = (13 * 10_000 * 15_500) / 10_000; // 201500
    const byDemand = Math.floor((byQuality * 14_500) / 10_000); // 292175
    const bySaturation = Math.floor((byDemand * 9_900) / 10_000); // 289253
    expect(computeSellPriceBp('tomato', 'gold', 20, { demandBp: 14_500 })).toBe(bySaturation);
    expect(computeSellPrice('tomato', 'gold', 20, { demandBp: 14_500 })).toBe(28);
  });

  it('applies soft saturation progressively and stops at the -30% floor', () => {
    expect(computeSellPriceBp('wheat', 'normal', 19)).toBe(80_000);
    expect(computeSellPriceBp('wheat', 'normal', 20)).toBe(79_200); // -1%
    expect(computeSellPriceBp('wheat', 'normal', 21)).toBe(78_400);
    const floored = computeSellPriceBp('wheat', 'normal', 500);
    expect(floored).toBe(56_000); // 80000 * 0.70
  });

  it('pays the same whether a lot is split or sold at once', () => {
    const single = computeSellLot('wheat', 'normal', 0, 30);
    const splitTotal = [0, 10, 20]
      .map((start) => computeSellLot('wheat', 'normal', start, 10).totalCoins)
      .reduce((sum, coins) => sum + coins, 0);
    expect(single.totalCoins).toBe(splitTotal);
    expect(single.totalCoins).toBe(230);
    expect(single.perUnitCoins).toHaveLength(30);
    expect(single.perUnitCoins[0]).toBe(8);
    expect(single.unitPrice).toBe(8);
  });

  it('supports demand/season multipliers (orders and NPC specialisation)', () => {
    expect(computeSellPrice('wheat', 'normal', 0, { demandBp: 14_500 })).toBe(11);
    expect(computeSellPrice('sunflower', 'normal', 0, { demandBp: 11_500 })).toBe(28); // +15% season
    expect(requireItem('wheat').orderMultiplierBp).toBe(14_000);
  });

  it('rejects unknown SKUs and invalid quantities', () => {
    expect(() => computeSellPrice('missing_sku')).toThrow(/Unknown item SKU/);
    expect(() => computeSellLot('wheat', 'normal', 0, 0)).toThrow(/qty/);
    expect(() => getItem('missing_sku')).not.toThrow();
    expect(getItem('missing_sku')).toBeUndefined();
  });
});

describe('economy catalog — fingerprint', () => {
  it('is stable for identical input and changes when a price changes', () => {
    const first = catalogFingerprint(ITEM_CATALOG);
    expect(catalogFingerprint(ITEM_CATALOG)).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}$/);

    const changed = ITEM_CATALOG.map((entry) =>
      entry.sku === 'wheat' ? { ...entry, sellPrice: 9 } : entry,
    );
    expect(catalogFingerprint(changed)).not.toBe(first);
  });
});
