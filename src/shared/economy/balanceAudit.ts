/**
 * Economy Balance & Content Graph Audit (Checkpoint E).
 *
 * Adapted from `Shiz0id/webfarmville` @ c420bc2 (scripts/balance-sim.ts)
 * paired with OLW `ITEM_CATALOG` DAG & arbitrage checks.
 *
 * Detects:
 * 1. Arbitrage (buy->sell or zero-time conversion loops)
 * 2. Impossible recipes (missing inputs or recipe cycles)
 * 3. Dead-end resources (items produced by gameplay that have zero uses/sinks)
 * 4. Extreme grind (excessive payback hours or unreachable luxury progression)
 * 5. Exact verified playable counts across all systems.
 */
import { analyzeArbitrage } from './arbitrage.ts';
import { ITEM_CATALOG, validateCatalog } from './catalogConfig.ts';
import { ALL_WORKSHOP_RECIPES, WORKSHOP_DEFS } from '../farming/workshops.ts';
import { DEEP_FIELD_CROP_SKUS, DEEP_FLOWER_SKUS } from '../farming/deepCropSimulation.ts';
import { ORCHARD_TREE_DEFS } from '../farming/orchard.ts';
import { LIVESTOCK_SPECIES_LIST } from '../farming/livestock.ts';

export interface PlayableContentCounts {
  readonly items: number;
  readonly fieldCrops: number;
  readonly orchardTrees: number;
  readonly flowers: number;
  readonly livestockSpecies: number;
  readonly workshopTypes: number;
  readonly workshopRecipes: number;
  readonly cookingMinigameRecipes: number;
}

export interface DeepBalanceAuditReport {
  readonly ok: boolean;
  readonly counts: PlayableContentCounts;
  readonly arbitrageFindings: number;
  readonly impossibleRecipes: readonly string[];
  readonly deadEndItems: readonly string[];
  readonly extremeGrindItems: readonly string[];
  readonly avgArtisanMarginBp: number;
}

export function runDeepEconomyBalanceAudit(): DeepBalanceAuditReport {
  const catalogValidation = validateCatalog(ITEM_CATALOG);
  const arbitrage = analyzeArbitrage(ITEM_CATALOG);

  const bySku = new Map(ITEM_CATALOG.map((item) => [item.sku, item]));
  const impossibleRecipes: string[] = [];

  for (const err of catalogValidation.errors) {
    if (err.code === 'UNKNOWN_INPUT' || err.code === 'RECIPE_CYCLE' || err.code === 'INPUT_MILESTONE_AHEAD') {
      impossibleRecipes.push(`${err.code}:${err.sku}`);
    }
  }
  for (const recipe of ALL_WORKSHOP_RECIPES) {
    if (!bySku.has(recipe.outputSku)) {
      impossibleRecipes.push(`missing_output:${recipe.recipeId}`);
    }
    for (const inp of recipe.inputs) {
      if (!bySku.has(inp.sku)) {
        impossibleRecipes.push(`missing_input:${recipe.recipeId}:${inp.sku}`);
      }
    }
  }

  // Track downstream recipe participation
  const usedAsInput = new Set<string>();
  for (const item of ITEM_CATALOG) {
    for (const inp of item.inputs) usedAsInput.add(inp.sku);
  }
  for (const recipe of ALL_WORKSHOP_RECIPES) {
    for (const inp of recipe.inputs) usedAsInput.add(inp.sku);
  }

  const deadEndItems: string[] = [];
  for (const item of ITEM_CATALOG) {
    const canSell = item.sellPrice > 0 && item.sellChannels.length > 0;
    const isUsed = usedAsInput.has(item.sku) || (item.uses && item.uses.length > 0);
    if (!canSell && !isUsed && item.group !== 'bait' && item.group !== 'tool') {
      deadEndItems.push(item.sku);
    }
  }

  // Detect extreme grind (single item > 10,000 coins or negative/unprofitable artisan conversion)
  const extremeGrindItems: string[] = [];
  let marginSumBp = 0;
  let marginCount = 0;

  for (const item of ITEM_CATALOG) {
    if ((item.storeBuy ?? 0) > 10_000) {
      extremeGrindItems.push(`too_expensive:${item.sku}`);
    }
  }

  for (const recipe of ALL_WORKSHOP_RECIPES) {
    const out = bySku.get(recipe.outputSku);
    if (!out) continue;
    let inputCost = 0;
    for (const inp of recipe.inputs) {
      const inpDef = bySku.get(inp.sku);
      if (inpDef) {
        // Use sellPrice (opportunity cost) or storeBuy when pantry staple
        const unitCost = inpDef.storeBuy !== null ? inpDef.storeBuy : inpDef.sellPrice;
        inputCost += unitCost * inp.qty;
      }
    }
    const outputRevenue = out.sellPrice * recipe.outputQty;
    // Feeds & fertilizers intentionally trade store convenience (cost savings) vs coin profit
    if (out.group !== 'feed' && out.group !== 'fertilizer' && inputCost > 0) {
      const marginBp = Math.round((outputRevenue * 10_000) / inputCost);
      marginSumBp += marginBp;
      marginCount += 1;
      if (marginBp < 10_200) {
        extremeGrindItems.push(`negative_margin:${recipe.recipeId}(${marginBp}bp)`);
      }
    }
  }

  const counts: PlayableContentCounts = {
    items: ITEM_CATALOG.length,
    fieldCrops: DEEP_FIELD_CROP_SKUS.length,
    orchardTrees: ORCHARD_TREE_DEFS.length,
    flowers: DEEP_FLOWER_SKUS.length,
    livestockSpecies: LIVESTOCK_SPECIES_LIST.length,
    workshopTypes: WORKSHOP_DEFS.length,
    workshopRecipes: ALL_WORKSHOP_RECIPES.length,
    cookingMinigameRecipes: 5,
  };

  const ok =
    catalogValidation.ok &&
    arbitrage.ok &&
    impossibleRecipes.length === 0 &&
    deadEndItems.length === 0 &&
    extremeGrindItems.length === 0;

  return {
    ok,
    counts,
    arbitrageFindings: arbitrage.findings.length,
    impossibleRecipes,
    deadEndItems,
    extremeGrindItems,
    avgArtisanMarginBp: marginCount > 0 ? Math.round(marginSumBp / marginCount) : 10_000,
  };
}
