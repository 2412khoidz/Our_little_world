/**
 * Starter cooking recipes (`V0.3`).
 *
 * Dish SKUs, exact ingredient lists and prep-step counts follow
 * `docs/economy/PRODUCTION_CHAINS.md` §2 verbatim. Heat numbers are gameplay
 * tuning owned by this module:
 *
 * - `heat01` uses a 0..1000 scale (100 = one adjustment step).
 * - `idealHeat01` / `heatTolerance01` define the safe band for stars.
 * - `burnWindowMs` is both the out-of-band burn timer and the overcook grace
 *   period after `cookMs` (see cookingMachine.ts for the exact rules).
 *
 * NO PRICE FIELD: coin values live only in the economy catalog. The cooking
 * domain returns `dishSku` + star quality and the economy layer decides reward
 * value and restaurant-order multipliers (1.60x–2.00x).
 */

import type { RecipeDefinition } from './types';

/**
 * Kitchen tuning rationale:
 * - `cookMs` stays inside the design's 8–15 s stove window, so the 90–150 s
 *   restaurant timer is dominated by player coordination, not stove time.
 * - `gentle` dishes are forgiving on heat (wide band, long burn window);
 *   `herb_carp` is explicitly the risky starter dish via a short burn window.
 * - `precise` dishes have tight bands and short burn windows, so ★★★ demands
 *   active stirring / heat management.
 * - `peach_tea` uses `heatProfile: 'none'`: heat drifts never leave the band,
 *   only prep and timing affect stars.
 * - `prepStationSteps` is the number of prep batches (one tap each), NOT the
 *   sum of ingredient quantities. Ingredients beyond the batch count are
 *   ready-to-use garnishes (e.g. the herb beside the carp).
 */
export const COOKING_RECIPES: readonly RecipeDefinition[] = [
  {
    sku: 'carrot_soup',
    dishSku: 'carrot_soup',
    nameVi: 'Súp cà rốt ấm',
    ingredients: [
      { sku: 'carrot', qty: 2 },
      { sku: 'wild_herb', qty: 1 },
    ],
    prepStationSteps: 2,
    cookMs: 12_000,
    idealHeat01: 470,
    heatTolerance01: 110,
    burnWindowMs: 6_000,
    minOrderStars: 2,
    heatProfile: 'gentle',
  },
  {
    sku: 'herb_carp',
    dishSku: 'herb_carp',
    nameVi: 'Cá chép thảo mộc',
    ingredients: [
      { sku: 'carp_pond', qty: 1 },
      { sku: 'wild_herb', qty: 1 },
    ],
    prepStationSteps: 1,
    cookMs: 10_000,
    idealHeat01: 520,
    heatTolerance01: 90,
    burnWindowMs: 4_000,
    minOrderStars: 2,
    heatProfile: 'gentle',
  },
  {
    sku: 'peach_tea',
    dishSku: 'peach_tea',
    nameVi: 'Trà đào mật ong',
    ingredients: [
      { sku: 'peach', qty: 2 },
      { sku: 'sugar_pack', qty: 1 },
    ],
    prepStationSteps: 1,
    cookMs: 8_000,
    idealHeat01: 500,
    heatTolerance01: 500,
    burnWindowMs: 12_000,
    minOrderStars: 2,
    heatProfile: 'none',
  },
  {
    sku: 'strawberry_tart',
    dishSku: 'strawberry_tart',
    nameVi: 'Bánh tart dâu',
    ingredients: [
      { sku: 'flour', qty: 1 },
      { sku: 'strawberry', qty: 2 },
      { sku: 'spice', qty: 1 },
    ],
    prepStationSteps: 3,
    cookMs: 14_000,
    idealHeat01: 600,
    heatTolerance01: 70,
    burnWindowMs: 4_000,
    minOrderStars: 3,
    heatProfile: 'precise',
  },
  {
    sku: 'koinori_platter',
    dishSku: 'koinori_platter',
    nameVi: 'Đĩa Koinori đặc sản',
    ingredients: [
      { sku: 'koi_pastel', qty: 1 },
      { sku: 'cabbage', qty: 1 },
      { sku: 'carrot', qty: 1 },
    ],
    prepStationSteps: 3,
    cookMs: 15_000,
    idealHeat01: 560,
    heatTolerance01: 80,
    burnWindowMs: 5_000,
    minOrderStars: 3,
    heatProfile: 'precise',
  },
];

/** SKU lookup for O(1) recipe resolution. */
export const COOKING_RECIPES_BY_SKU: ReadonlyMap<string, RecipeDefinition> = new Map(
  COOKING_RECIPES.map((recipe) => [recipe.sku, recipe]),
);

/** Returns the recipe for `sku`, or `undefined` when unknown. */
export function getRecipe(sku: string): RecipeDefinition | undefined {
  return COOKING_RECIPES_BY_SKU.get(sku);
}

/** Returns the recipe for `sku`; throws for an unknown SKU. */
export function requireRecipe(sku: string): RecipeDefinition {
  const recipe = COOKING_RECIPES_BY_SKU.get(sku);
  if (!recipe) {
    throw new RangeError(`Unknown cooking recipe: ${String(sku)}`);
  }
  return recipe;
}
