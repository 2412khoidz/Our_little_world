import { describe, expect, it } from 'vitest';
import { STARTER_FURNITURE_CATALOG } from '../../src/shared/catalog';
import { replayLedger } from '../../src/shared/economy/ledgerMath';
import { requireItem } from '../../src/shared/economy/catalogConfig';
import {
  FEATURE_DEFINITIONS,
  LIFESTYLE_FEATURES,
  PROPOSED_FURNITURE_PRICE_BY_FOOTPRINT,
  applyExpansion,
  gardenPlotCount,
  isFeatureAvailable,
  isFeatureGatedByEconomy,
  nextToolUpgrade,
  proposedFurniturePrice,
  quoteCatalogPurchase,
  quoteExpansion,
  quoteFurniturePurchase,
  quoteToolUpgrade,
  roundShopPrice,
  type ProgressionState,
} from '../../src/shared/shop';

const wallet = (coins: number) => ({ coins });

function progression(overrides: Partial<ProgressionState> = {}): ProgressionState {
  return {
    wallet: wallet(0),
    inventory: {},
    unlocked: [],
    milestone: 'V0.2.4',
    ...overrides,
  };
}

describe('shop — catalog purchases', () => {
  it('prices from the catalog and quotes the wallet after', () => {
    const quote = quoteCatalogPurchase({
      wallet: wallet(20),
      sku: 'seed_wheat',
      qty: 3,
      milestone: 'V0.2.0',
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.unitPriceCoins).toBe(requireItem('seed_wheat').storeBuy);
    expect(quote.totalCoins).toBe(12);
    expect(quote.walletAfter).toBe(8);
  });

  it('rejects invalid quantities, unknown items, unsellable items and locked milestones', () => {
    const base = { wallet: wallet(100), milestone: 'V0.2.0' as const };
    const invalid = quoteCatalogPurchase({ ...base, sku: 'seed_wheat', qty: 0 });
    expect(invalid.ok === false && invalid.code).toBe('INVALID_QTY');

    const unknown = quoteCatalogPurchase({ ...base, sku: 'nope', qty: 1 });
    expect(unknown.ok === false && unknown.code).toBe('UNKNOWN_ITEM');

    const unsellable = quoteCatalogPurchase({ ...base, sku: 'wood_branch', qty: 1 });
    expect(unsellable.ok === false && unsellable.code).toBe('NOT_FOR_SALE');

    const locked = quoteCatalogPurchase({ ...base, sku: 'sugar_pack', qty: 1 });
    expect(locked.ok === false && locked.code).toBe('MILESTONE_LOCKED');
  });

  it('rejects purchases above the wallet balance', () => {
    const quote = quoteCatalogPurchase({
      wallet: wallet(3),
      sku: 'seed_cabbage',
      qty: 1,
      milestone: 'V0.2.0',
    });
    expect(quote.ok).toBe(false);
    if (quote.ok) return;
    expect(quote.code).toBe('INSUFFICIENT_FUNDS');
  });
});

describe('shop — furniture and tools', () => {
  it('prices every starter furniture item inside the documented band', () => {
    for (const item of STARTER_FURNITURE_CATALOG) {
      const price = proposedFurniturePrice(item.sku);
      expect(price, item.sku).not.toBeNull();
      expect(price ?? 0).toBeGreaterThanOrEqual(120);
      expect(price ?? 0).toBeLessThanOrEqual(550);
    }
    expect(PROPOSED_FURNITURE_PRICE_BY_FOOTPRINT['2x2']).toBe(260);
    const bed = quoteFurniturePurchase({ wallet: wallet(300), sku: 'bed_cozy' });
    expect(bed.ok).toBe(true);
    if (!bed.ok) return;
    expect(bed.totalCoins).toBe(260);
    expect(bed.walletAfter).toBe(40);
  });

  it('rejects a furniture purchase above budget and an unknown SKU', () => {
    const poor = quoteFurniturePurchase({ wallet: wallet(10), sku: 'bed_cozy' });
    expect(poor.ok === false && poor.code).toBe('INSUFFICIENT_FUNDS');
    const unknown = quoteFurniturePurchase({ wallet: wallet(1000), sku: 'chair_magic' });
    expect(unknown.ok === false && unknown.code).toBe('UNKNOWN_ITEM');
  });

  it('walks tool upgrades one tier at a time and stops at the top', () => {
    expect(nextToolUpgrade('hoe', 1)?.costCoins).toBe(250);
    const quote = quoteToolUpgrade({ wallet: wallet(300), toolId: 'hoe', currentTier: 1 });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.totalCoins).toBe(250);
    expect(quote.walletAfter).toBe(50);

    const top = quoteToolUpgrade({ wallet: wallet(9_999), toolId: 'hoe', currentTier: 3 });
    expect(top.ok === false && top.code).toBe('MAX_TIER');
    expect(nextToolUpgrade('hoe', 3)).toBeNull();

    const poor = quoteToolUpgrade({ wallet: wallet(1), toolId: 'watering_can', currentTier: 1 });
    expect(poor.ok === false && poor.code).toBe('INSUFFICIENT_FUNDS');
  });
});

describe('shop — home progression', () => {
  it('quotes an expansion with coins + materials and consumes both', () => {
    const state = progression({
      wallet: wallet(2_000),
      inventory: { wood_branch: 20 },
    });
    const applied = applyExpansion(state, 'garden_24', { nowMs: 1_000 });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.wallet.coins).toBe(500);
    expect(applied.state.inventory.wood_branch ?? 0).toBe(5);
    expect(applied.state.unlocked).toContain('garden_24');
    expect(gardenPlotCount(applied.state.unlocked)).toBe(24);
    const replay = replayLedger(2_000, [applied.ledgerEntry]);
    expect(replay.issues).toEqual([]);
    expect(replay.endingCoins).toBe(applied.state.wallet.coins);
  });

  it('enforces prerequisites, milestone, materials and ownership', () => {
    const noPrereq = quoteExpansion(progression({ wallet: wallet(9_000), inventory: { wood_branch: 100 } }), 'greenhouse');
    expect(noPrereq.ok === false && noPrereq.code).toBe('PREREQUISITE_MISSING');

    const locked = quoteExpansion(progression({ wallet: wallet(9_000), milestone: 'V0.2.2' }), 'garden_24');
    expect(locked.ok === false && locked.code).toBe('MILESTONE_LOCKED');

    const noMaterial = quoteExpansion(progression({ wallet: wallet(9_000) }), 'garden_24');
    expect(noMaterial.ok === false && noMaterial.code).toBe('INSUFFICIENT_MATERIALS');

    const poor = quoteExpansion(progression({ wallet: wallet(10), inventory: { wood_branch: 20 } }), 'garden_24');
    expect(poor.ok === false && poor.code).toBe('INSUFFICIENT_FUNDS');

    const owned = quoteExpansion(progression({ unlocked: ['garden_24'] }), 'garden_24');
    expect(owned.ok === false && owned.code).toBe('ALREADY_OWNED');
  });

  it('reports the garden size for the unlocked tier', () => {
    expect(gardenPlotCount([])).toBe(12);
    expect(gardenPlotCount(['garden_24'])).toBe(24);
    expect(gardenPlotCount(['garden_24', 'garden_36'])).toBe(36);
  });
});

describe('shop — lifestyle utilities are never gated', () => {
  it('marks every lifestyle feature as non-economic and always available', () => {
    expect(LIFESTYLE_FEATURES.length).toBeGreaterThan(0);
    for (const feature of LIFESTYLE_FEATURES) {
      expect(feature.alwaysUnlocked).toBe(true);
      expect(isFeatureGatedByEconomy(feature.key)).toBe(false);
      // Even with a zero wallet, no inventory and no unlocks.
      expect(
        isFeatureAvailable(
          { wallet: wallet(0), inventory: {}, unlocked: [], milestone: 'V0.2.0' },
          feature.key,
        ),
        `${feature.key} bị khóa nhầm`,
      ).toBe(true);
    }
  });

  it('still gates gameplay progression features', () => {
    const locked = { wallet: wallet(0), inventory: {}, unlocked: [], milestone: 'V0.2.4' as const };
    expect(isFeatureAvailable(locked, 'greenhouse')).toBe(false);
    expect(isFeatureGatedByEconomy('greenhouse')).toBe(true);
    expect(isFeatureAvailable({ ...locked, unlocked: ['greenhouse'] }, 'greenhouse')).toBe(true);
    expect(FEATURE_DEFINITIONS.some((feature) => feature.key === 'greenhouse')).toBe(true);
  });
});

describe('shop — display helpers', () => {
  it('rounds prices down to a tidy shop value', () => {
    expect(roundShopPrice(183)).toBe(180);
    expect(roundShopPrice(185)).toBe(185);
    expect(roundShopPrice(179)).toBe(175);
  });
});
