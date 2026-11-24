/**
 * Economy domain types for Our Little World (V0.2.0).
 *
 * Pure TypeScript: no React/Phaser/DOM/Supabase imports.
 *
 * Source of truth: docs/economy/ECONOMY_MODEL.md, docs/economy/PRODUCTION_CHAINS.md,
 * docs/economy/MARKET_AND_NPC.md. Money is always an integer number of coins
 * ("xu"). Fractional design values are carried as basis points where
 * `BP_DENOM = 10_000` means `1.0`.
 */

/** Milestones that can own a SKU. Ordered from earliest to latest. */
export type MilestoneId = 'V0.2.0' | 'V0.2.1' | 'V0.2.2' | 'V0.2.5' | 'V0.3.0';

export const MILESTONE_ORDER: readonly MilestoneId[] = [
  'V0.2.0',
  'V0.2.1',
  'V0.2.2',
  'V0.2.5',
  'V0.3.0',
];

export function milestoneRank(milestone: MilestoneId): number {
  return MILESTONE_ORDER.indexOf(milestone);
}

/** True when `itemMilestone` ships at or before `activeMilestone`. */
export function isMilestoneAtOrBefore(
  itemMilestone: MilestoneId,
  activeMilestone: MilestoneId,
): boolean {
  const itemRank = milestoneRank(itemMilestone);
  const activeRank = milestoneRank(activeMilestone);
  if (itemRank < 0 || activeRank < 0) {
    return false;
  }
  return itemRank <= activeRank;
}

/**
 * Item groups used for soft saturation caps, price reporting and simulator
 * aggregation (docs/economy/MARKET_AND_NPC.md §2).
 */
export type ItemGroup =
  | 'seed'
  | 'grain'
  | 'veg'
  | 'fruit'
  | 'flower'
  | 'fish'
  | 'dish'
  | 'material'
  | 'pantry'
  | 'bait'
  | 'craft';

export const SATURATION_GROUPS: readonly ItemGroup[] = [
  'seed',
  'grain',
  'veg',
  'fruit',
  'flower',
  'fish',
  'dish',
  'material',
  'pantry',
  'bait',
  'craft',
];

/** Quality tiers that can drop from harvest/fishing. */
export type ItemQuality = 'normal' | 'silver' | 'gold';

export const ITEM_QUALITIES: readonly ItemQuality[] = ['normal', 'silver', 'gold'];

/**
 * Quality multipliers from docs/economy/ECONOMY_MODEL.md §1.4.
 * `normal = 1.0`, `silver = 1.25`, `gold = 1.55`.
 */
export const QUALITY_MULTIPLIER_BP = {
  normal: 10_000,
  silver: 12_500,
  gold: 15_500,
} as const satisfies Record<ItemQuality, number>;

/** Market channels (docs/economy/MARKET_AND_NPC.md §1). */
export type SellChannel =
  | 'shipping_bin'
  | 'npc_general'
  | 'npc_flower'
  | 'npc_fish'
  | 'order_board'
  | 'restaurant';

export const SELL_CHANNELS: readonly SellChannel[] = [
  'shipping_bin',
  'npc_general',
  'npc_flower',
  'npc_fish',
  'order_board',
  'restaurant',
];

/** One ingredient line of a production recipe, per produced batch. */
export interface ItemRecipeInput {
  /** Stable SKU of the consumed item. */
  readonly sku: string;
  /** Positive integer amount consumed per produced batch. */
  readonly qty: number;
}

/**
 * Catalog row. Every field is integer/plain data so the same structure can feed
 * the TypeScript simulator, the SQL seed generator and (later) the inventory
 * contract without conversion drift.
 */
export interface ItemDefinition {
  /** Stable, immutable SKU (primary key of `item_catalog`). */
  readonly sku: string;
  /** Vietnamese display name (UI ready; i18n can key on `sku`). */
  readonly nameVi: string;
  readonly group: ItemGroup;
  /** First milestone in which the SKU exists in the catalog. */
  readonly milestone: MilestoneId;
  /** Maximum stack in a single inventory row. */
  readonly stackLimit: number;

  /** Shop purchase price in coins per unit; `null` when not sold by any NPC. */
  readonly storeBuy: number | null;
  /** Base sell price in coins per unit (before quality/demand/saturation). */
  readonly sellPrice: number;

  /**
   * Standard active labor `L_i` expressed in thousandths of a labor unit.
   * `400` = `0.4` standard labor units. Growth waiting time is NOT labor.
   */
  readonly laborMilli: number;
  /** Depreciation share `D_i` in whole coins per batch. */
  readonly depreciation: number;
  /** Units produced per production batch (`qty`). */
  readonly batchQty: number;
  /** Ingredients consumed per production batch. */
  readonly inputs: readonly ItemRecipeInput[];
  /**
   * Non-labor production duration in milliseconds (growth, cooking, minigame
   * interaction). `0` means the item can be produced with no wait at all, which
   * is what the instant-arbitrage check cares about.
   */
  readonly batchDurationMs: number;

  /**
   * Reference standard value `V_i` in basis points of a coin, authored from
   * docs/economy/PRODUCTION_CHAINS.md §2. `deriveStandardValue` recomputes it
   * from `laborMilli`/`depreciation`/`inputs`; drift is reported as a warning.
   */
  readonly standardValueBp: number;

  /** Multiplier paid by a matching order-board request (`1.40` -> `14000`). */
  readonly orderMultiplierBp: number | null;
  /** Qualities this item can drop. Empty or `['normal']` disables quality scaling. */
  readonly qualityTiers: readonly ItemQuality[];
  /** Channels that accept this SKU. */
  readonly sellChannels: readonly SellChannel[];
  /** True for free wild gathering nodes (no capital required). */
  readonly forageable: boolean;
}

/** A resolved sell-price quote for one unit or a whole lot. */
export interface SellQuote {
  readonly sku: string;
  readonly quality: ItemQuality;
  /** Basis points of a coin for the first unit of the quote. */
  readonly unitPriceBp: number;
  /** Whole coins for the first unit of the quote. */
  readonly unitPrice: number;
  readonly qty: number;
  readonly totalBp: number;
  readonly totalCoins: number;
  /** Per-unit whole-coin price, in sell order (saturation aware). */
  readonly perUnitCoins: readonly number[];
}

/** Soft-saturation configuration (docs/economy/MARKET_AND_NPC.md §2). */
export interface SaturationConfig {
  /** Free units per group per world per local day before decay starts. */
  readonly threshold: number;
  /** Decline applied per unit past the threshold, in basis points. */
  readonly stepBp: number;
  /** Hard floor of the multiplier, in basis points (`7000` = `-30%`). */
  readonly floorBp: number;
}

export const DEFAULT_SATURATION: SaturationConfig = {
  threshold: 20,
  stepBp: 100,
  floorBp: 7_000,
};
