/**
 * Single source of truth for the Our Little World item catalog (V0.2.0).
 *
 * Numbers are transcribed from docs/economy/PRODUCTION_CHAINS.md §2 and the
 * pricing rules from docs/economy/ECONOMY_MODEL.md. This file feeds the
 * TypeScript simulator today and (via a pending generator, see
 * docs/research/DEEPSEEK_NIGHT_CHECKPOINT.md) the SQL `item_catalog` seed later.
 *
 * Conventions:
 * - Money is whole coins ("xu"). Multipliers/percentages are basis points
 *   (`10_000` bp = `1.0`).
 * - `standardValueBp` is `V_i` from the design table, expressed in bp of a coin.
 * - Stable SKUs are Primary Keys: never rename an existing SKU, add a new one.
 * - Growth/cooking durations are in milliseconds; `batchDurationMs` feeds the
 *   instant-arbitrage check, not the player-visible timer.
 */

import { divFloor, mulBp, saturationMultiplierBp } from './ledgerMath.ts';
import type {
  ItemDefinition,
  ItemGroup,
  ItemQuality,
  ItemRecipeInput,
  MilestoneId,
  SellChannel,
  SellQuote,
  SaturationConfig,
} from './types.ts';
import {
  DEFAULT_SATURATION,
  isMilestoneAtOrBefore,
  ITEM_QUALITIES,
  MILESTONE_ORDER,
  QUALITY_MULTIPLIER_BP,
  SELL_CHANNELS,
} from './types.ts';

/** Bumped whenever a price/labor number changes, for report traceability. */
export const CATALOG_VERSION = 'olw-economy-v0.2.0-r1';

/** `w = 5 coins` per standard labor unit, expressed in basis points. */
export const LABOR_COIN_BP_PER_UNIT = 50_000;

/** Stable, URL-safe SKU contract shared with the inventory module (OLW-015-01). */
export const STABLE_SKU_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;

/** Acceptable drift between an authored `standardValueBp` and the formula. */
export const STANDARD_VALUE_DRIFT_TOLERANCE_BP = 100;

interface ItemInput {
  readonly sku: string;
  readonly nameVi: string;
  readonly group: ItemGroup;
  readonly milestone: MilestoneId;
  readonly sellPrice: number;
  readonly standardValueBp: number;
  readonly storeBuy?: number | null;
  readonly laborMilli?: number;
  readonly depreciation?: number;
  readonly batchQty?: number;
  readonly inputs?: readonly ItemRecipeInput[];
  readonly batchDurationMs?: number;
  readonly orderMultiplierBp?: number | null;
  readonly qualityTiers?: readonly ItemQuality[];
  readonly sellChannels?: readonly SellChannel[];
  readonly forageable?: boolean;
  readonly stackLimit?: number;
}

function item(input: ItemInput): ItemDefinition {
  return {
    sku: input.sku,
    nameVi: input.nameVi,
    group: input.group,
    milestone: input.milestone,
    stackLimit: input.stackLimit ?? 99,
    storeBuy: input.storeBuy ?? null,
    sellPrice: input.sellPrice,
    laborMilli: input.laborMilli ?? 0,
    depreciation: input.depreciation ?? 0,
    batchQty: input.batchQty ?? 1,
    inputs: input.inputs ?? [],
    batchDurationMs: input.batchDurationMs ?? 0,
    standardValueBp: input.standardValueBp,
    orderMultiplierBp: input.orderMultiplierBp ?? null,
    qualityTiers: input.qualityTiers ?? ['normal'],
    sellChannels: input.sellChannels ?? ['shipping_bin'],
    forageable: input.forageable ?? false,
  };
}

const ALL_QUALITIES: readonly ItemQuality[] = ['normal', 'silver', 'gold'];
const MARKET_CROP: readonly SellChannel[] = ['shipping_bin', 'npc_general', 'order_board'];
const MARKET_FLOWER: readonly SellChannel[] = ['shipping_bin', 'npc_flower', 'order_board'];
const MARKET_FISH: readonly SellChannel[] = ['shipping_bin', 'npc_fish', 'order_board'];
const MARKET_DISH: readonly SellChannel[] = ['order_board', 'restaurant', 'shipping_bin'];

/**
 * 34 catalog rows. Every price/labor value is traceable to
 * docs/economy/PRODUCTION_CHAINS.md §2; assumptions that are not in the design
 * table are marked with an inline comment.
 */
export const ITEM_CATALOG: readonly ItemDefinition[] = [
  // --- Seeds (Bác Hai Mùa, available from V0.2.0) -------------------------
  item({ sku: 'seed_wheat', nameVi: 'Hạt giống lúa mì', group: 'seed', milestone: 'V0.2.0', storeBuy: 4, sellPrice: 2, standardValueBp: 40_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_carrot', nameVi: 'Hạt giống cà rốt', group: 'seed', milestone: 'V0.2.0', storeBuy: 8, sellPrice: 4, standardValueBp: 80_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_tomato', nameVi: 'Hạt giống cà chua', group: 'seed', milestone: 'V0.2.0', storeBuy: 14, sellPrice: 7, standardValueBp: 140_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_strawberry', nameVi: 'Hạt giống dâu tây', group: 'seed', milestone: 'V0.2.0', storeBuy: 22, sellPrice: 11, standardValueBp: 220_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_sunflower', nameVi: 'Hạt giống hướng dương', group: 'seed', milestone: 'V0.2.0', storeBuy: 16, sellPrice: 8, standardValueBp: 160_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_rose_pink', nameVi: 'Hạt giống hồng phấn', group: 'seed', milestone: 'V0.2.0', storeBuy: 20, sellPrice: 10, standardValueBp: 200_000, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'seed_cabbage', nameVi: 'Hạt giống bắp cải', group: 'seed', milestone: 'V0.2.0', storeBuy: 26, sellPrice: 13, standardValueBp: 260_000, sellChannels: ['shipping_bin', 'npc_general'] }),

  // --- Free foraging (the V0.2.0 zero-wallet recovery path) --------------
  item({ sku: 'wild_herb', nameVi: 'Thảo mộc dại', group: 'material', milestone: 'V0.2.0', sellPrice: 5, laborMilli: 1_000, standardValueBp: 50_000, forageable: true, stackLimit: 999, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'wood_branch', nameVi: 'Cành gỗ', group: 'material', milestone: 'V0.2.0', sellPrice: 6, laborMilli: 1_000, depreciation: 1, standardValueBp: 60_000, forageable: true, stackLimit: 999, sellChannels: ['shipping_bin', 'npc_general'] }),

  // --- Fishing (V0.2.2) ---------------------------------------------------
  item({ sku: 'bait_free_worm', nameVi: 'Mồi giun miễn phí', group: 'bait', milestone: 'V0.2.2', storeBuy: 0, sellPrice: 0, laborMilli: 200, standardValueBp: 10_000, sellChannels: [], stackLimit: 999 }),
  item({ sku: 'bait_shrimp', nameVi: 'Mồi tép', group: 'bait', milestone: 'V0.2.2', storeBuy: 6, sellPrice: 2, standardValueBp: 60_000, stackLimit: 999, sellChannels: ['shipping_bin'] }),
  // Fishing batches also carry the minigame interaction time, not growth time.
  item({ sku: 'carp_pond', nameVi: 'Cá chép ao', group: 'fish', milestone: 'V0.2.2', sellPrice: 14, laborMilli: 1_800, depreciation: 2, standardValueBp: 110_000, inputs: [{ sku: 'bait_free_worm', qty: 1 }], batchDurationMs: 45_000, orderMultiplierBp: 14_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FISH }),
  item({ sku: 'koi_pastel', nameVi: 'Cá koi pastel', group: 'fish', milestone: 'V0.2.2', sellPrice: 24, laborMilli: 2_400, depreciation: 3, standardValueBp: 210_000, inputs: [{ sku: 'bait_shrimp', qty: 1 }], batchDurationMs: 60_000, orderMultiplierBp: 15_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FISH }),
  item({ sku: 'lotus_trout', nameVi: 'Cá hồi sen', group: 'fish', milestone: 'V0.2.2', sellPrice: 36, laborMilli: 3_400, depreciation: 4, standardValueBp: 270_000, inputs: [{ sku: 'bait_shrimp', qty: 1 }], batchDurationMs: 90_000, orderMultiplierBp: 15_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FISH }),

  // --- Crops (V0.2.1) -----------------------------------------------------
  item({ sku: 'wheat', nameVi: 'Lúa mì', group: 'grain', milestone: 'V0.2.1', sellPrice: 8, laborMilli: 400, depreciation: 1, standardValueBp: 70_000, inputs: [{ sku: 'seed_wheat', qty: 1 }], batchDurationMs: 300_000, orderMultiplierBp: 14_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP }),
  // Carrot growth time is not in the design table; 15m sits between wheat (5m) and tomato (45m).
  item({ sku: 'carrot', nameVi: 'Cà rốt', group: 'veg', milestone: 'V0.2.1', sellPrice: 15, laborMilli: 600, depreciation: 1, standardValueBp: 120_000, inputs: [{ sku: 'seed_carrot', qty: 1 }], batchDurationMs: 900_000, orderMultiplierBp: 14_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP }),
  item({ sku: 'tomato', nameVi: 'Cà chua', group: 'veg', milestone: 'V0.2.1', sellPrice: 13, laborMilli: 1_000, depreciation: 2, batchQty: 2, standardValueBp: 105_000, inputs: [{ sku: 'seed_tomato', qty: 1 }], batchDurationMs: 2_700_000, orderMultiplierBp: 14_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP }),
  item({ sku: 'strawberry', nameVi: 'Dâu tây', group: 'fruit', milestone: 'V0.2.1', sellPrice: 18, laborMilli: 1_200, depreciation: 2, batchQty: 2, standardValueBp: 150_000, inputs: [{ sku: 'seed_strawberry', qty: 1 }], batchDurationMs: 5_400_000, orderMultiplierBp: 15_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP }),
  item({ sku: 'sunflower', nameVi: 'Hướng dương', group: 'flower', milestone: 'V0.2.1', sellPrice: 25, laborMilli: 1_000, depreciation: 1, standardValueBp: 220_000, inputs: [{ sku: 'seed_sunflower', qty: 1 }], batchDurationMs: 3_600_000, orderMultiplierBp: 14_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FLOWER }),
  item({ sku: 'rose_pink', nameVi: 'Hồng phấn', group: 'flower', milestone: 'V0.2.1', sellPrice: 30, laborMilli: 1_200, depreciation: 1, standardValueBp: 270_000, inputs: [{ sku: 'seed_rose_pink', qty: 1 }], batchDurationMs: 5_400_000, orderMultiplierBp: 15_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FLOWER }),
  // Bred from neighbouring rose_pink plots (see src/shared/farming/blooms.ts), not bought.
  item({ sku: 'rose_sakura', nameVi: 'Hồng anh đào', group: 'flower', milestone: 'V0.2.1', sellPrice: 48, laborMilli: 1_500, depreciation: 2, standardValueBp: 365_000, inputs: [{ sku: 'rose_pink', qty: 1 }], orderMultiplierBp: 16_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FLOWER }),
  item({ sku: 'cabbage', nameVi: 'Bắp cải', group: 'veg', milestone: 'V0.2.1', sellPrice: 40, laborMilli: 1_400, depreciation: 2, standardValueBp: 350_000, inputs: [{ sku: 'seed_cabbage', qty: 1 }], batchDurationMs: 7_200_000, orderMultiplierBp: 15_000, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP }),
  // Perennial tree: harvesting yields 3 peaches and the tree regrows. 180m matches
  // src/shared/farming/crops.ts (the design table only says "long-term tree") and
  // the sapling SKU is still missing — see the NO_ACQUISITION_PATH warning.
  item({ sku: 'peach', nameVi: 'Đào', group: 'fruit', milestone: 'V0.2.1', sellPrice: 18, laborMilli: 1_000, depreciation: 9, batchQty: 3, standardValueBp: 46_700, batchDurationMs: 10_800_000, orderMultiplierBp: 14_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_CROP, stackLimit: 999 }),

  // --- Pantry (V0.3.0 shop seasonings + V0.2.1 farm jam) --------------------
  item({ sku: 'sugar_pack', nameVi: 'Gói đường', group: 'pantry', milestone: 'V0.3.0', storeBuy: 6, sellPrice: 3, standardValueBp: 60_000, stackLimit: 999, sellChannels: ['shipping_bin'] }),
  item({ sku: 'spice', nameVi: 'Gia vị', group: 'pantry', milestone: 'V0.3.0', storeBuy: 10, sellPrice: 5, standardValueBp: 100_000, stackLimit: 999, sellChannels: ['shipping_bin'] }),
  item({ sku: 'strawberry_jam', nameVi: 'Mứt dâu', group: 'pantry', milestone: 'V0.3.0', sellPrice: 32, laborMilli: 900, depreciation: 1, standardValueBp: 415_000, inputs: [{ sku: 'strawberry', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], batchDurationMs: 45_000, orderMultiplierBp: 14_500, sellChannels: ['shipping_bin', 'npc_general'] }),
  item({ sku: 'ribbon', nameVi: 'Ruy băng', group: 'pantry', milestone: 'V0.3.0', storeBuy: 6, sellPrice: 3, standardValueBp: 60_000, stackLimit: 999, sellChannels: ['shipping_bin'] }),

  // --- Cooking (V0.3.0) ---------------------------------------------------
  item({ sku: 'flour', nameVi: 'Bột mì', group: 'pantry', milestone: 'V0.3.0', sellPrice: 17, laborMilli: 800, depreciation: 1, standardValueBp: 190_000, inputs: [{ sku: 'wheat', qty: 2 }], batchDurationMs: 60_000, orderMultiplierBp: 14_000, sellChannels: ['shipping_bin', 'npc_general', 'order_board'] }),
  item({ sku: 'carrot_soup', nameVi: 'Súp cà rốt', group: 'dish', milestone: 'V0.3.0', sellPrice: 42, laborMilli: 2_000, depreciation: 2, standardValueBp: 410_000, inputs: [{ sku: 'carrot', qty: 2 }, { sku: 'wild_herb', qty: 1 }], batchDurationMs: 120_000, orderMultiplierBp: 16_500, sellChannels: MARKET_DISH }),
  item({ sku: 'herb_carp', nameVi: 'Cá chép thảo mộc', group: 'dish', milestone: 'V0.3.0', sellPrice: 32, laborMilli: 2_200, depreciation: 2, standardValueBp: 290_000, inputs: [{ sku: 'carp_pond', qty: 1 }, { sku: 'wild_herb', qty: 1 }], batchDurationMs: 120_000, orderMultiplierBp: 16_000, sellChannels: MARKET_DISH }),
  item({ sku: 'peach_tea', nameVi: 'Trà đào', group: 'dish', milestone: 'V0.3.0', sellPrice: 52, laborMilli: 1_600, depreciation: 2, standardValueBp: 253_400, inputs: [{ sku: 'peach', qty: 2 }, { sku: 'sugar_pack', qty: 1 }], batchDurationMs: 90_000, orderMultiplierBp: 15_500, sellChannels: MARKET_DISH }),
  item({ sku: 'strawberry_tart', nameVi: 'Bánh tart dâu', group: 'dish', milestone: 'V0.3.0', sellPrice: 78, laborMilli: 3_000, depreciation: 3, standardValueBp: 770_000, inputs: [{ sku: 'flour', qty: 1 }, { sku: 'strawberry', qty: 2 }, { sku: 'spice', qty: 1 }], batchDurationMs: 150_000, orderMultiplierBp: 17_000, sellChannels: MARKET_DISH }),
  item({ sku: 'koinori_platter', nameVi: 'Đĩa koi nori', group: 'dish', milestone: 'V0.3.0', sellPrice: 102, laborMilli: 3_500, depreciation: 3, standardValueBp: 885_000, inputs: [{ sku: 'koi_pastel', qty: 1 }, { sku: 'cabbage', qty: 1 }, { sku: 'carrot', qty: 1 }], batchDurationMs: 150_000, orderMultiplierBp: 17_000, sellChannels: MARKET_DISH }),
  item({ sku: 'sakura_bouquet', nameVi: 'Bó hoa anh đào', group: 'flower', milestone: 'V0.3.0', sellPrice: 100, laborMilli: 2_000, depreciation: 1, standardValueBp: 930_000, inputs: [{ sku: 'rose_pink', qty: 2 }, { sku: 'sunflower', qty: 1 }, { sku: 'ribbon', qty: 1 }], batchDurationMs: 90_000, orderMultiplierBp: 15_500, qualityTiers: ALL_QUALITIES, sellChannels: MARKET_FLOWER }),
  item({ sku: 'wood_chair', nameVi: 'Ghế gỗ', group: 'craft', milestone: 'V0.3.0', sellPrice: 26, laborMilli: 1_500, depreciation: 2, standardValueBp: 275_000, inputs: [{ sku: 'wood_branch', qty: 3 }], batchDurationMs: 60_000, orderMultiplierBp: 13_000, sellChannels: ['order_board', 'npc_general'] }),
];

export const CATALOG_BY_SKU: ReadonlyMap<string, ItemDefinition> = new Map(
  ITEM_CATALOG.map((entry) => [entry.sku, entry]),
);

export function getItem(sku: string): ItemDefinition | undefined {
  return CATALOG_BY_SKU.get(sku);
}

/** Throws instead of returning `undefined`; use inside trusted domain code. */
export function requireItem(sku: string): ItemDefinition {
  const found = CATALOG_BY_SKU.get(sku);
  if (!found) {
    throw new Error(`Unknown item SKU: ${sku}`);
  }
  return found;
}

/** Items whose `milestone` is at or before `activeMilestone`. */
export function itemsForMilestone(activeMilestone: MilestoneId): ItemDefinition[] {
  return ITEM_CATALOG.filter((entry) =>
    isMilestoneAtOrBefore(entry.milestone, activeMilestone),
  );
}

export function isItemAvailable(sku: string, activeMilestone: MilestoneId): boolean {
  const entry = CATALOG_BY_SKU.get(sku);
  return entry !== undefined && isMilestoneAtOrBefore(entry.milestone, activeMilestone);
}

/** FK safe: same vector the SQL generator will use for `item_catalog.milestone`. */
export function milestoneIndex(milestone: MilestoneId): number {
  const index = MILESTONE_ORDER.indexOf(milestone);
  return index < 0 ? -1 : index;
}

// --------------------------------------------------------------------------
// Standard value (labor theory of value)
// --------------------------------------------------------------------------

/**
 * `V_i = (Σ a_ij · V_j + w · L_i + D_i) / qty` (docs/economy/ECONOMY_MODEL.md §1)
 * expressed in basis points. Waiting time (`batchDurationMs`) is deliberately not
 * part of the labor term.
 */
export function deriveStandardValueBp(
  definition: ItemDefinition,
  bySku: ReadonlyMap<string, ItemDefinition> = CATALOG_BY_SKU,
): number {
  // Shop goods take their purchase price directly as V_j
  // (docs/economy/ECONOMY_MODEL.md §1 point 3) so inputs preserve value.
  if (
    definition.inputs.length === 0 &&
    definition.laborMilli === 0 &&
    definition.depreciation === 0
  ) {
    return definition.storeBuy !== null ? definition.storeBuy * 10_000 : 0;
  }
  let numeratorBp = 0;
  for (const input of definition.inputs) {
    const source = bySku.get(input.sku);
    if (!source) {
      return -1;
    }
    numeratorBp += input.qty * source.standardValueBp;
  }
  // w = 5 coins per labor unit = 50_000 bp; L is carried in thousandths.
  numeratorBp += divFloor(LABOR_COIN_BP_PER_UNIT * definition.laborMilli, 1_000);
  numeratorBp += definition.depreciation * 10_000;
  return divFloor(numeratorBp, definition.batchQty);
}

// --------------------------------------------------------------------------
// Sell pricing
// --------------------------------------------------------------------------

export interface SellPriceOverrides {
  /** Demand/season multiplier in bp (`14_500` = `1.45x`). Defaults to `1.0x`. */
  readonly demandBp?: number;
  /** Saturation rules; defaults to `DEFAULT_SATURATION`. */
  readonly saturation?: SaturationConfig;
}

/**
 * Sell price of a single unit in coins. Rounds down after every multiplier in
 * the documented order: quality -> demand/season -> saturation.
 */
export function computeSellPrice(
  sku: string,
  quality: ItemQuality | null = null,
  saturationCount = 0,
  overrides?: SellPriceOverrides,
): number {
  return divFloor(computeSellPriceBp(sku, quality, saturationCount, overrides), 10_000);
}

/** Same as {@link computeSellPrice} but returns basis points of a coin. */
export function computeSellPriceBp(
  sku: string,
  quality: ItemQuality | null = null,
  saturationCount = 0,
  overrides?: SellPriceOverrides,
): number {
  const definition = requireItem(sku);
  const qualityBp = resolveQualityBp(definition, quality);
  const demandBp = overrides?.demandBp ?? 10_000;
  if (!Number.isInteger(demandBp) || demandBp < 0) {
    throw new RangeError(`demandBp must be a non-negative integer, got ${String(demandBp)}`);
  }
  const saturationBp = saturationMultiplierBp(
    saturationCount,
    overrides?.saturation ?? DEFAULT_SATURATION,
  );
  let bp = definition.sellPrice * 10_000;
  bp = mulBp(bp, qualityBp);
  bp = mulBp(bp, demandBp);
  bp = mulBp(bp, saturationBp);
  return bp;
}

function resolveQualityBp(definition: ItemDefinition, quality: ItemQuality | null): number {
  if (!quality || !definition.qualityTiers.includes(quality)) {
    return QUALITY_MULTIPLIER_BP.normal;
  }
  return QUALITY_MULTIPLIER_BP[quality];
}

/**
 * Total payout for a lot. The price of each unit depends only on its own index
 * inside the group/day, so selling `10+10+10` pays exactly the same as `30`.
 */
export function computeSellLot(
  sku: string,
  quality: ItemQuality | null,
  startSaturationCount: number,
  qty: number,
  overrides?: SellPriceOverrides,
): SellQuote {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new RangeError(`qty must be a positive integer, got ${String(qty)}`);
  }
  const perUnitCoins: number[] = [];
  let totalBp = 0;
  for (let index = 0; index < qty; index += 1) {
    const unitBp = computeSellPriceBp(sku, quality, startSaturationCount + index, overrides);
    totalBp += unitBp;
    perUnitCoins.push(divFloor(unitBp, 10_000));
  }
  const totalCoins = perUnitCoins.reduce((sum, coins) => sum + coins, 0);
  const unitPriceBp = computeSellPriceBp(sku, quality, startSaturationCount, overrides);
  return {
    sku,
    quality: quality ?? 'normal',
    unitPriceBp,
    unitPrice: divFloor(unitPriceBp, 10_000),
    qty,
    totalBp,
    totalCoins,
    perUnitCoins,
  };
}

// --------------------------------------------------------------------------
// Catalog validation
// --------------------------------------------------------------------------

export type CatalogIssueCode =
  | 'SKU_FORMAT'
  | 'SKU_DUPLICATE'
  | 'NON_INTEGER'
  | 'NEGATIVE_VALUE'
  | 'RESALE_RULE'
  | 'UNKNOWN_INPUT'
  | 'BAD_INPUT_QTY'
  | 'DUPLICATE_INPUT'
  | 'SELF_INPUT'
  | 'BAD_BATCH_QTY'
  | 'RECIPE_CYCLE'
  | 'BAD_STACK_LIMIT'
  | 'BAD_QUALITY_TIER'
  | 'BAD_SELL_CHANNEL'
  | 'INPUT_MILESTONE_AHEAD'
  | 'UNREACHABLE_SELLABLE'
  | 'NO_ACQUISITION_PATH'
  | 'STANDARD_VALUE_DRIFT';

export interface CatalogIssue {
  readonly code: CatalogIssueCode;
  readonly sku: string;
  readonly messageVi: string;
}

export interface CatalogValidation {
  readonly ok: boolean;
  readonly errors: readonly CatalogIssue[];
  readonly warnings: readonly CatalogIssue[];
}

function isFiniteInteger(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

/** DFS cycle detection over the recipe graph; returns one cycle or `null`. */
function findRecipeCycle(
  catalog: readonly ItemDefinition[],
  bySku: ReadonlyMap<string, ItemDefinition>,
): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (sku: string): string[] | null => {
    const current = state.get(sku);
    if (current === 'visiting') {
      const start = stack.indexOf(sku);
      return [...stack.slice(start), sku];
    }
    if (current === 'done') {
      return null;
    }
    state.set(sku, 'visiting');
    stack.push(sku);
    const definition = bySku.get(sku);
    if (definition) {
      for (const input of definition.inputs) {
        const cycle = visit(input.sku);
        if (cycle) {
          return cycle;
        }
      }
    }
    stack.pop();
    state.set(sku, 'done');
    return null;
  };

  for (const definition of catalog) {
    const cycle = visit(definition.sku);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

/**
 * Structural + economic validation of a catalog. Returns structured issues so
 * the simulator and future SQL generator can fail loudly with Vietnamese text.
 */
export function validateCatalog(
  catalog: readonly ItemDefinition[] = ITEM_CATALOG,
): CatalogValidation {
  const errors: CatalogIssue[] = [];
  const warnings: CatalogIssue[] = [];
  const bySku = new Map<string, ItemDefinition>();

  const pushError = (code: CatalogIssueCode, sku: string, messageVi: string): void => {
    errors.push({ code, sku, messageVi });
  };
  const pushWarning = (code: CatalogIssueCode, sku: string, messageVi: string): void => {
    warnings.push({ code, sku, messageVi });
  };

  // Pass 1 — primary keys and SKU stability.
  for (const definition of catalog) {
    if (bySku.has(definition.sku)) {
      pushError('SKU_DUPLICATE', definition.sku, `SKU bị trùng: ${definition.sku}`);
      continue;
    }
    bySku.set(definition.sku, definition);
    if (!STABLE_SKU_PATTERN.test(definition.sku)) {
      pushError('SKU_FORMAT', definition.sku, `SKU không đúng chuẩn ổn định: ${definition.sku}`);
    }
    if (!MILESTONE_ORDER.includes(definition.milestone)) {
      pushError('SKU_FORMAT', definition.sku, `Mốc không hợp lệ: ${definition.milestone}`);
    }
    if (definition.sku !== definition.sku.toLowerCase()) {
      pushError('SKU_FORMAT', definition.sku, 'SKU phải viết thường');
    }
  }

  // Pass 2 — per-row numeric and recipe checks (input SKUs are resolvable now).
  for (const definition of bySku.values()) {
    if (definition.storeBuy !== null && (!isFiniteInteger(definition.storeBuy) || definition.storeBuy < 0)) {
      pushError('NON_INTEGER', definition.sku, 'Giá mua shop phải là số nguyên >= 0');
    }
    if (!isFiniteInteger(definition.sellPrice) || definition.sellPrice < 0) {
      pushError('NON_INTEGER', definition.sku, 'Giá bán phải là số nguyên >= 0');
    }
    if (definition.storeBuy !== null && definition.sellPrice >= 0) {
      if (definition.storeBuy < 2 * definition.sellPrice) {
        pushError(
          'RESALE_RULE',
          definition.sku,
          `storeBuy (${definition.storeBuy}) phải >= 2 × sellPrice (${definition.sellPrice})`,
        );
      }
    }
    if (!isFiniteInteger(definition.laborMilli) || definition.laborMilli < 0) {
      pushError('NEGATIVE_VALUE', definition.sku, 'L_i (laborMilli) phải là số nguyên >= 0');
    }
    if (!isFiniteInteger(definition.depreciation) || definition.depreciation < 0) {
      pushError('NEGATIVE_VALUE', definition.sku, 'D_i (depreciation) phải là số nguyên >= 0');
    }
    if (!isFiniteInteger(definition.batchQty) || definition.batchQty < 1) {
      pushError('BAD_BATCH_QTY', definition.sku, 'batchQty phải là số nguyên >= 1');
    }
    if (!isFiniteInteger(definition.batchDurationMs) || definition.batchDurationMs < 0) {
      pushError('NEGATIVE_VALUE', definition.sku, 'batchDurationMs phải là số nguyên >= 0');
    }
    if (!isFiniteInteger(definition.stackLimit) || definition.stackLimit < 1) {
      pushError('BAD_STACK_LIMIT', definition.sku, 'stackLimit phải là số nguyên >= 1');
    }
    for (const quality of definition.qualityTiers) {
      if (!ITEM_QUALITIES.includes(quality)) {
        pushError('BAD_QUALITY_TIER', definition.sku, `Phẩm cấp không hợp lệ: ${quality}`);
      }
    }
    for (const channel of definition.sellChannels) {
      if (!SELL_CHANNELS.includes(channel)) {
        pushError('BAD_SELL_CHANNEL', definition.sku, `Kênh bán không hợp lệ: ${channel}`);
      }
    }
    if (definition.sellPrice > 0 && definition.sellChannels.length === 0) {
      pushError(
        'UNREACHABLE_SELLABLE',
        definition.sku,
        'Vật phẩm có giá bán nhưng không có kênh bán nào',
      );
    }
    // Sellable but neither purchasable, craftable nor forageable: the design
    // table never says how the player obtains it (e.g. `peach` has no sapling SKU).
    if (
      definition.sellPrice > 0 &&
      definition.storeBuy === null &&
      definition.inputs.length === 0 &&
      !definition.forageable
    ) {
      pushWarning(
        'NO_ACQUISITION_PATH',
        definition.sku,
        'Có giá bán nhưng không có đường sở hữu (thiếu SKU đầu vào) — loại khỏi mô phỏng',
      );
    }

    const inputSkus = new Set<string>();
    for (const input of definition.inputs) {
      if (input.sku === definition.sku) {
        pushError('SELF_INPUT', definition.sku, 'Công thức tự tiêu thụ chính nó');
        continue;
      }
      if (inputSkus.has(input.sku)) {
        pushError('DUPLICATE_INPUT', definition.sku, `Nguyên liệu trùng: ${input.sku}`);
      }
      inputSkus.add(input.sku);
      if (!isFiniteInteger(input.qty) || input.qty < 1) {
        pushError('BAD_INPUT_QTY', definition.sku, `Số lượng nguyên liệu ${input.sku} phải >= 1`);
      }
      const source = bySku.get(input.sku);
      if (!source) {
        pushError('UNKNOWN_INPUT', definition.sku, `Nguyên liệu không tồn tại: ${input.sku}`);
        continue;
      }
      if (!isMilestoneAtOrBefore(source.milestone, definition.milestone)) {
        pushError(
          'INPUT_MILESTONE_AHEAD',
          definition.sku,
          `Nguyên liệu ${input.sku} (${source.milestone}) xuất hiện sau ${definition.milestone}`,
        );
      }
    }
  }

  const cycle = findRecipeCycle([...bySku.values()], bySku);
  if (cycle) {
    pushError('RECIPE_CYCLE', cycle[0] ?? '', `Vòng công thức: ${cycle.join(' -> ')}`);
  }

  // Standard value drift is a warning: the design table's PoC has small
  // arithmetic inconsistencies and the authored reference value wins.
  for (const definition of bySku.values()) {
    const derived = deriveStandardValueBp(definition, bySku);
    if (derived < 0) {
      continue;
    }
    const drift = Math.abs(derived - definition.standardValueBp);
    if (drift > STANDARD_VALUE_DRIFT_TOLERANCE_BP) {
      pushWarning(
        'STANDARD_VALUE_DRIFT',
        definition.sku,
        `V_i ghi ${definition.standardValueBp}bp lệch ${drift}bp so với công thức (${derived}bp)`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Stable fingerprint of the catalog (FNV-1a over sorted rows). The simulator
 * prints it so a balance report can be tied to an exact config revision.
 */
export function catalogFingerprint(catalog: readonly ItemDefinition[] = ITEM_CATALOG): string {
  const rows = [...catalog]
    .sort((left, right) => left.sku.localeCompare(right.sku))
    .map((entry) =>
      [
        entry.sku,
        entry.milestone,
        entry.storeBuy ?? '-',
        entry.sellPrice,
        entry.laborMilli,
        entry.depreciation,
        entry.batchQty,
        entry.batchDurationMs,
        entry.standardValueBp,
        entry.orderMultiplierBp ?? '-',
        entry.inputs.map((input) => `${input.sku}x${input.qty}`).join(','),
      ].join(':'),
    )
    .join('\n');
  let hash = 0x811c9dc5;
  for (let index = 0; index < rows.length; index += 1) {
    hash ^= rows.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
