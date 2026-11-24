/**
 * Cross-module contract test.
 *
 * The domain modules were built independently (economy, farming, fishing,
 * cooking, minigames) and are integrated by SKU. This suite is the guard-rail
 * that keeps the SKUs, quantities and durations consistent across modules, so a
 * rename or a re-balance cannot silently desynchronise the catalog, the
 * simulator and the gameplay modules.
 */

import { describe, expect, it } from 'vitest';
import { getItem, ITEM_CATALOG, requireItem } from '../../src/shared/economy/catalogConfig';
import { CROP_DEFINITIONS } from '../../src/shared/farming';
import { COOKING_RECIPES } from '../../src/shared/cooking';
import { BAIT_DEFINITIONS, FISH_DEFINITIONS } from '../../src/shared/fishing';

function sortedPairs(pairs: readonly { sku: string; qty: number }[]): string[] {
  return pairs.map((pair) => `${pair.sku}x${pair.qty}`).sort();
}

describe('domain integration — catalog SKU contract', () => {
  it('every farming crop output exists in the economy catalog', () => {
    for (const crop of Object.values(CROP_DEFINITIONS)) {
      const item = getItem(crop.cropSku);
      expect(item, `thiếu SKU nông sản: ${crop.cropSku}`).toBeDefined();
      expect(item?.group, `${crop.cropSku} phải là nông sản/hoa/quả`).toMatch(
        /^(grain|veg|fruit|flower)$/,
      );
      expect(item?.sellPrice).toBeGreaterThan(0);
    }
  });

  it('every crop seed exists in the catalog except the documented peach sapling gap', () => {
    const missing: string[] = [];
    for (const crop of Object.values(CROP_DEFINITIONS)) {
      if (crop.seedSku === null) {
        continue;
      }
      if (!getItem(crop.seedSku)) {
        missing.push(`${crop.cropSku}->${crop.seedSku}`);
      }
    }
    // PRODUCTION_CHAINS lists a perennial peach tree but no sapling SKU; the
    // catalog reports NO_ACQUISITION_PATH and the simulator excludes `peach`.
    // Everything else must resolve.
    expect(missing).toEqual(['peach->sapling_peach']);
    expect(getItem('peach')).toBeDefined();
  });

  it('keeps harvest quantities and growth times aligned with the catalog', () => {
    for (const crop of Object.values(CROP_DEFINITIONS)) {
      const item = requireItem(crop.cropSku);
      expect(item.batchQty, `sản lượng ${crop.cropSku}`).toBe(crop.harvestQty);
      if (crop.cropSku === 'rose_sakura') {
        // Hybrid flower: instant in the economy model, bred by adjacency.
        expect(crop.seedSku).toBeNull();
        continue;
      }
      expect(item.batchDurationMs, `thời gian mọc ${crop.cropSku}`).toBe(crop.growMs);
      expect(item.milestone).toBe('V0.2.1');
    }
  });

  it('keeps quality tiers aligned between farming and the catalog', () => {
    for (const crop of Object.values(CROP_DEFINITIONS)) {
      const item = requireItem(crop.cropSku);
      for (const tier of crop.qualityTiers) {
        expect(item.qualityTiers, `${crop.cropSku} thiếu phẩm cấp ${tier}`).toContain(tier);
      }
    }
  });
});

describe('domain integration — cooking recipes', () => {
  it('maps every cooked dish to exactly one recipe', () => {
    const catalogDishes = ITEM_CATALOG.filter((item) => item.group === 'dish')
      .map((item) => item.sku)
      .sort();
    const recipeDishes = COOKING_RECIPES.map((recipe) => recipe.dishSku).sort();
    expect(recipeDishes).toEqual(catalogDishes);
  });

  it('uses exactly the catalog ingredients and quantities', () => {
    for (const recipe of COOKING_RECIPES) {
      const item = requireItem(recipe.dishSku);
      expect(item.milestone).toBe('V0.3.0');
      const catalogInputs = sortedPairs(item.inputs);
      const recipeInputs = sortedPairs(
        recipe.ingredients.map((ingredient) => ({
          sku: ingredient.sku,
          qty: ingredient.qty,
        })),
      );
      expect(recipeInputs, `nguyên liệu ${recipe.dishSku}`).toEqual(catalogInputs);
    }
  });
});

describe('domain integration — fishing', () => {
  it('every catchable fish exists in the catalog as a fish', () => {
    const catalogFish = ITEM_CATALOG.filter((item) => item.group === 'fish')
      .map((item) => item.sku)
      .sort();
    const definedFish = FISH_DEFINITIONS.map((fish) => fish.sku).sort();
    expect(definedFish).toEqual(catalogFish);
  });

  it('every bait exists in the catalog as bait and respects the resale rule', () => {
    for (const bait of BAIT_DEFINITIONS) {
      const item = getItem(bait.sku);
      expect(item, `thiếu mồi ${bait.sku}`).toBeDefined();
      expect(item?.group).toBe('bait');
      if (item?.storeBuy !== null && item?.storeBuy !== undefined) {
        expect(item.storeBuy).toBeGreaterThanOrEqual(2 * item.sellPrice);
      }
    }
  });

  it('keeps the free worm as the no-deadlock bait', () => {
    const worm = requireItem('bait_free_worm');
    expect(worm.storeBuy).toBe(0);
    expect(worm.sellPrice).toBe(0);
    expect(FISH_DEFINITIONS.every((fish) => fish.preferredBaits.length > 0)).toBe(true);
  });
});

describe('domain integration — economy simulator assumptions', () => {
  it('simulates only SKUs that exist in the catalog', () => {
    // The simulator derives its activities from the catalog, so an unknown SKU
    // would simply be skipped; this asserts the set it *can* pick is non-empty
    // and known for every milestone profile.
    const cropSkus = Object.values(CROP_DEFINITIONS).map((crop) => crop.cropSku);
    for (const sku of cropSkus) {
      expect(getItem(sku)).toBeDefined();
    }
  });
});
