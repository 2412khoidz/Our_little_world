/**
 * Shop & Home Progression domain (V0.2.4 preparation).
 *
 * Pure logic only: quotes, requirements and unlock evaluation. No SQL, no
 * backend adapter, no map resizing, no UI.
 *
 * Hard rule from docs/gameplay/WORLD_PROGRESSION.md §1: lifestyle utilities
 * (Pomodoro study room, mailbox, diary, album, wishlist, cinema) are NEVER gated
 * by coins or level. `LIFESTYLE_FEATURES` below is the single source of truth for
 * that promise and `isFeatureGatedByEconomy` must stay false for every entry.
 */

import { getItem } from '../economy/catalogConfig.ts';
import { getCatalogItem } from '../catalog.ts';
import type { MilestoneId } from '../economy/types.ts';
import { isMilestoneAtOrBefore } from '../economy/types.ts';
import { applyItemDelta, applyLedgerEntry, divFloor } from '../economy/ledgerMath.ts';
import type { CoinLedgerEntry, InventoryState, WalletState } from '../economy/ledgerMath.ts';

export type FeatureKey =
  | 'study_pomodoro'
  | 'mailbox'
  | 'diary'
  | 'album'
  | 'wishlist'
  | 'cinema'
  | 'kitchen'
  | 'greenhouse'
  | 'fish_pool'
  | 'cozy_market'
  | 'garden_24'
  | 'garden_36'
  | 'house_tier_2';

export type FeatureKind = 'lifestyle' | 'gameplay' | 'cosmetic';

export interface FeatureDefinition {
  readonly key: FeatureKey;
  readonly nameVi: string;
  readonly kind: FeatureKind;
  readonly milestone: MilestoneId;
  /** Lifestyle features ignore coins and unlocks entirely. */
  readonly alwaysUnlocked: boolean;
}

/** Utilities that must work even with a zero wallet (WORLD_PROGRESSION §1). */
export const LIFESTYLE_FEATURES: readonly FeatureDefinition[] = [
  { key: 'study_pomodoro', nameVi: 'Phòng học Pomodoro', kind: 'lifestyle', milestone: 'V0.1.5', alwaysUnlocked: true },
  { key: 'mailbox', nameVi: 'Hộp thư & quà', kind: 'lifestyle', milestone: 'V0.1.5', alwaysUnlocked: true },
  { key: 'diary', nameVi: 'Nhật ký chung', kind: 'lifestyle', milestone: 'V0.3.0', alwaysUnlocked: true },
  { key: 'album', nameVi: 'Album ảnh', kind: 'lifestyle', milestone: 'V0.3.0', alwaysUnlocked: true },
  { key: 'wishlist', nameVi: 'Wishlist', kind: 'lifestyle', milestone: 'V0.3.0', alwaysUnlocked: true },
  { key: 'cinema', nameVi: 'Rạp phim chung', kind: 'lifestyle', milestone: 'V0.4.0', alwaysUnlocked: true },
];

/** Features that are bought/unlocked through gameplay progression. */
export const PROGRESSION_FEATURES: readonly FeatureDefinition[] = [
  { key: 'kitchen', nameVi: 'Quầy bếp', kind: 'gameplay', milestone: 'V0.3.0', alwaysUnlocked: false },
  { key: 'greenhouse', nameVi: 'Nhà kính', kind: 'gameplay', milestone: 'V0.2.4', alwaysUnlocked: false },
  { key: 'fish_pool', nameVi: 'Ao cá', kind: 'gameplay', milestone: 'V0.2.2', alwaysUnlocked: false },
  { key: 'cozy_market', nameVi: 'Khu chợ nhỏ', kind: 'gameplay', milestone: 'V0.2.5', alwaysUnlocked: false },
  { key: 'garden_24', nameVi: 'Mở rộng vườn 24 ô', kind: 'gameplay', milestone: 'V0.2.4', alwaysUnlocked: false },
  { key: 'garden_36', nameVi: 'Mở rộng vườn 36 ô', kind: 'gameplay', milestone: 'V0.2.4', alwaysUnlocked: false },
  { key: 'house_tier_2', nameVi: 'Nâng cấp nhà cấp 2', kind: 'cosmetic', milestone: 'V0.2.4', alwaysUnlocked: false },
];

export const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = [
  ...LIFESTYLE_FEATURES,
  ...PROGRESSION_FEATURES,
];

export const FEATURE_BY_KEY: ReadonlyMap<FeatureKey, FeatureDefinition> = new Map(
  FEATURE_DEFINITIONS.map((feature) => [feature.key, feature]),
);

/**
 * True only when a feature is locked behind coins/progression. Lifestyle
 * features always return false — this is asserted by the test suite.
 */
export function isFeatureGatedByEconomy(key: FeatureKey): boolean {
  const feature = FEATURE_BY_KEY.get(key);
  if (!feature) {
    return false;
  }
  return !feature.alwaysUnlocked;
}

export type ShopErrorCode =
  | 'UNKNOWN_ITEM'
  | 'NOT_FOR_SALE'
  | 'INVALID_QTY'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_MATERIALS'
  | 'MILESTONE_LOCKED'
  | 'ALREADY_OWNED'
  | 'PREREQUISITE_MISSING'
  | 'MAX_TIER';

export interface PurchaseFailure {
  readonly ok: false;
  readonly code: ShopErrorCode;
  readonly messageVi: string;
}

export interface PurchaseQuote {
  readonly ok: true;
  readonly sku: string;
  readonly qty: number;
  readonly unitPriceCoins: number;
  readonly totalCoins: number;
  readonly walletAfter: number;
}

export type PurchaseResult = PurchaseQuote | PurchaseFailure;

function fail(code: ShopErrorCode, messageVi: string): PurchaseFailure {
  return { ok: false, code, messageVi };
}

/**
 * Quote for a catalog item the NPC shops sell (seeds, bait, pantry items).
 * The price always comes from `ITEM_CATALOG.storeBuy`; callers never supply it.
 */
export function quoteCatalogPurchase(input: {
  wallet: WalletState;
  sku: string;
  qty: number;
  milestone: MilestoneId;
}): PurchaseResult {
  if (!Number.isInteger(input.qty) || input.qty <= 0) {
    return fail('INVALID_QTY', 'Số lượng mua phải là số nguyên dương');
  }
  const definition = getItem(input.sku);
  if (!definition) {
    return fail('UNKNOWN_ITEM', `Vật phẩm không tồn tại: ${input.sku}`);
  }
  if (definition.storeBuy === null) {
    return fail('NOT_FOR_SALE', `${definition.sku} không bán ở cửa hàng`);
  }
  if (!isMilestoneAtOrBefore(definition.milestone, input.milestone)) {
    return fail('MILESTONE_LOCKED', `${definition.sku} chưa mở ở mốc ${input.milestone}`);
  }
  const totalCoins = definition.storeBuy * input.qty;
  if (totalCoins > input.wallet.coins) {
    return fail(
      'INSUFFICIENT_FUNDS',
      `Không đủ xu: cần ${totalCoins}, còn ${input.wallet.coins}`,
    );
  }
  return {
    ok: true,
    sku: definition.sku,
    qty: input.qty,
    unitPriceCoins: definition.storeBuy,
    totalCoins,
    walletAfter: input.wallet.coins - totalCoins,
  };
}

// --------------------------------------------------------------------------
// Furniture (cosmetic sinks)
// --------------------------------------------------------------------------

/**
 * PROPOSED price table — not approved economy data. Derived from the documented
 * "furniture 120–550 coins" band and item footprint. Change freely when the
 * design owner approves real prices.
 */
export const PROPOSED_FURNITURE_PRICE_BY_FOOTPRINT: Readonly<
  Record<string, number>
> = {
  '1x1': 120,
  '2x1': 180,
  '2x2': 260,
};

export function proposedFurniturePrice(sku: string): number | null {
  const item = getCatalogItem(sku);
  if (!item) {
    return null;
  }
  const key = `${item.widthTiles}x${item.heightTiles}`;
  return PROPOSED_FURNITURE_PRICE_BY_FOOTPRINT[key] ?? 180;
}

export function quoteFurniturePurchase(input: {
  wallet: WalletState;
  sku: string;
}): PurchaseResult {
  const item = getCatalogItem(input.sku);
  if (!item) {
    return fail('UNKNOWN_ITEM', `Nội thất không tồn tại: ${input.sku}`);
  }
  const price = proposedFurniturePrice(input.sku);
  if (price === null) {
    return fail('NOT_FOR_SALE', `${input.sku} chưa có giá`);
  }
  if (price > input.wallet.coins) {
    return fail('INSUFFICIENT_FUNDS', `Không đủ xu: cần ${price}, còn ${input.wallet.coins}`);
  }
  return {
    ok: true,
    sku: input.sku,
    qty: 1,
    unitPriceCoins: price,
    totalCoins: price,
    walletAfter: input.wallet.coins - price,
  };
}

// --------------------------------------------------------------------------
// Tool upgrades (shared ownership: one purchase, both partners benefit)
// --------------------------------------------------------------------------

export type ToolId = 'hoe' | 'watering_can' | 'fishing_rod' | 'kitchen_stove';
export type ToolTier = 1 | 2 | 3;

export interface ToolTierDefinition {
  readonly tier: ToolTier;
  readonly nameVi: string;
  readonly costCoins: number;
  readonly effectVi: string;
}

/** Costs follow the documented 250–900 band for three tool tiers. */
export const TOOL_TIERS: Readonly<Record<ToolId, readonly ToolTierDefinition[]>> = {
  hoe: [
    { tier: 1, nameVi: 'Cuốc gỗ', costCoins: 0, effectVi: 'Làm đất cơ bản' },
    { tier: 2, nameVi: 'Cuốc đồng', costCoins: 250, effectVi: 'Làm đất nhanh hơn' },
    { tier: 3, nameVi: 'Cuốc vàng pastel', costCoins: 550, effectVi: 'Làm đất nhanh nhất' },
  ],
  watering_can: [
    { tier: 1, nameVi: 'Bình nước gỗ', costCoins: 0, effectVi: 'Tưới 1 ô' },
    { tier: 2, nameVi: 'Bình nước đồng', costCoins: 300, effectVi: 'Tưới 3 ô' },
    { tier: 3, nameVi: 'Bình nước pastel', costCoins: 650, effectVi: 'Tưới 6 ô' },
  ],
  fishing_rod: [
    { tier: 1, nameVi: 'Cần tre', costCoins: 0, effectVi: 'Câu cơ bản' },
    { tier: 2, nameVi: 'Cần chắc', costCoins: 350, effectVi: 'Vùng xanh rộng hơn' },
    { tier: 3, nameVi: 'Cần trúc', costCoins: 700, effectVi: 'Vùng xanh rộng nhất' },
  ],
  kitchen_stove: [
    { tier: 1, nameVi: 'Bếp đất', costCoins: 0, effectVi: 'Nấu món cơ bản' },
    { tier: 2, nameVi: 'Bếp gang', costCoins: 400, effectVi: 'Giữ nhiệt ổn định hơn' },
    { tier: 3, nameVi: 'Bếp pastel', costCoins: 900, effectVi: 'Vùng vàng rộng nhất' },
  ],
};

export function toolTierDefinition(toolId: ToolId, tier: ToolTier): ToolTierDefinition {
  const tiers = TOOL_TIERS[toolId];
  const found = tiers.find((entry) => entry.tier === tier);
  if (!found) {
    throw new RangeError(`Unknown tier ${tier} for tool ${toolId}`);
  }
  return found;
}

export function nextToolUpgrade(
  toolId: ToolId,
  currentTier: ToolTier,
): ToolTierDefinition | null {
  const next = currentTier + 1;
  if (next > 3) {
    return null;
  }
  return toolTierDefinition(toolId, next as ToolTier);
}

export function quoteToolUpgrade(input: {
  wallet: WalletState;
  toolId: ToolId;
  currentTier: ToolTier;
}): PurchaseQuote | PurchaseFailure {
  const next = nextToolUpgrade(input.toolId, input.currentTier);
  if (!next) {
    return fail('MAX_TIER', 'Dụng cụ đã ở cấp cao nhất');
  }
  if (next.costCoins > input.wallet.coins) {
    return fail(
      'INSUFFICIENT_FUNDS',
      `Không đủ xu: cần ${next.costCoins}, còn ${input.wallet.coins}`,
    );
  }
  return {
    ok: true,
    sku: `${input.toolId}_tier_${next.tier}`,
    qty: 1,
    unitPriceCoins: next.costCoins,
    totalCoins: next.costCoins,
    walletAfter: input.wallet.coins - next.costCoins,
  };
}

// --------------------------------------------------------------------------
// Home progression / expansions
// --------------------------------------------------------------------------

export type ExpansionKey =
  | 'garden_24'
  | 'garden_36'
  | 'greenhouse'
  | 'fish_pool'
  | 'cozy_market'
  | 'house_tier_2';

export interface MaterialRequirement {
  readonly sku: string;
  readonly qty: number;
}

export interface ExpansionDefinition {
  readonly key: ExpansionKey;
  readonly nameVi: string;
  readonly costCoins: number;
  readonly materials: readonly MaterialRequirement[];
  readonly prerequisite: ExpansionKey | null;
  readonly milestone: MilestoneId;
}

/** Costs are inside the documented 1,200–6,000 expansion band. */
export const EXPANSIONS: readonly ExpansionDefinition[] = [
  { key: 'fish_pool', nameVi: 'Ao cá nhỏ', costCoins: 1_200, materials: [{ sku: 'wood_branch', qty: 10 }], prerequisite: null, milestone: 'V0.2.2' },
  { key: 'garden_24', nameVi: 'Mở rộng vườn 24 ô', costCoins: 1_500, materials: [{ sku: 'wood_branch', qty: 15 }], prerequisite: null, milestone: 'V0.2.4' },
  { key: 'greenhouse', nameVi: 'Nhà kính', costCoins: 2_400, materials: [{ sku: 'wood_branch', qty: 25 }], prerequisite: 'garden_24', milestone: 'V0.2.4' },
  { key: 'garden_36', nameVi: 'Mở rộng vườn 36 ô', costCoins: 2_800, materials: [{ sku: 'wood_branch', qty: 30 }], prerequisite: 'garden_24', milestone: 'V0.2.4' },
  { key: 'cozy_market', nameVi: 'Khu chợ nhỏ', costCoins: 3_600, materials: [{ sku: 'wood_branch', qty: 40 }], prerequisite: 'garden_24', milestone: 'V0.2.5' },
  { key: 'house_tier_2', nameVi: 'Nâng cấp nhà cấp 2', costCoins: 4_800, materials: [{ sku: 'wood_branch', qty: 50 }], prerequisite: null, milestone: 'V0.2.4' },
];

export const EXPANSION_BY_KEY: ReadonlyMap<ExpansionKey, ExpansionDefinition> = new Map(
  EXPANSIONS.map((expansion) => [expansion.key, expansion]),
);

export interface ProgressionState {
  readonly wallet: WalletState;
  readonly inventory: InventoryState;
  readonly unlocked: readonly ExpansionKey[];
  readonly milestone: MilestoneId;
}

export interface ExpansionQuote {
  readonly ok: true;
  readonly key: ExpansionKey;
  readonly costCoins: number;
  readonly materials: readonly MaterialRequirement[];
  readonly walletAfter: number;
  readonly inventoryAfter: InventoryState;
  readonly ledgerEntry: CoinLedgerEntry;
}

export function quoteExpansion(
  state: ProgressionState,
  key: ExpansionKey,
  options?: { nowMs?: number; idempotencyKey?: string },
): ExpansionQuote | PurchaseFailure {
  const definition = EXPANSION_BY_KEY.get(key);
  if (!definition) {
    return fail('UNKNOWN_ITEM', `Khu vực không tồn tại: ${key}`);
  }
  if (state.unlocked.includes(key)) {
    return fail('ALREADY_OWNED', `${definition.nameVi} đã mở khóa`);
  }
  if (!isMilestoneAtOrBefore(definition.milestone, state.milestone)) {
    return fail('MILESTONE_LOCKED', `${definition.nameVi} chưa mở ở mốc ${state.milestone}`);
  }
  if (definition.prerequisite && !state.unlocked.includes(definition.prerequisite)) {
    const prerequisite = EXPANSION_BY_KEY.get(definition.prerequisite);
    return fail(
      'PREREQUISITE_MISSING',
      `Cần mở ${prerequisite?.nameVi ?? definition.prerequisite} trước`,
    );
  }
  if (state.wallet.coins < definition.costCoins) {
    return fail(
      'INSUFFICIENT_FUNDS',
      `Không đủ xu: cần ${definition.costCoins}, còn ${state.wallet.coins}`,
    );
  }
  let inventory = state.inventory;
  for (const material of definition.materials) {
    if ((inventory[material.sku] ?? 0) < material.qty) {
      return fail(
        'INSUFFICIENT_MATERIALS',
        `Thiếu ${material.sku}: cần ${material.qty}, còn ${inventory[material.sku] ?? 0}`,
      );
    }
  }
  for (const material of definition.materials) {
    inventory = applyItemDelta(inventory, { [material.sku]: -material.qty });
  }
  const ledgerEntry: CoinLedgerEntry = {
    id: `expansion-${key}`,
    kind: 'spend',
    deltaCoins: definition.costCoins,
    reason: `expansion_${key}`,
    idempotencyKey: options?.idempotencyKey ?? `expansion-${key}-${state.milestone}`,
    createdAt: options?.nowMs ?? 0,
  };
  const wallet = applyLedgerEntry(state.wallet, ledgerEntry);
  return {
    ok: true,
    key,
    costCoins: definition.costCoins,
    materials: definition.materials,
    walletAfter: wallet.coins,
    inventoryAfter: inventory,
    ledgerEntry,
  };
}

/** Applies an expansion and returns the new progression state. */
export function applyExpansion(
  state: ProgressionState,
  key: ExpansionKey,
  options?: { nowMs?: number; idempotencyKey?: string },
): { ok: true; state: ProgressionState; ledgerEntry: CoinLedgerEntry } | PurchaseFailure {
  const quote = quoteExpansion(state, key, options);
  if (!quote.ok) {
    return quote;
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { coins: quote.walletAfter },
      inventory: quote.inventoryAfter,
      unlocked: [...state.unlocked, key],
    },
    ledgerEntry: quote.ledgerEntry,
  };
}

/** Garden plot count for the unlocked expansion tier (12 → 24 → 36). */
export function gardenPlotCount(unlocked: readonly ExpansionKey[]): number {
  if (unlocked.includes('garden_36')) {
    return 36;
  }
  if (unlocked.includes('garden_24')) {
    return 24;
  }
  return 12;
}

/**
 * Feature availability: lifestyle utilities ignore the wallet entirely, while
 * gameplay/cosmetic features follow the expansion unlocks.
 */
export function isFeatureAvailable(
  state: Pick<ProgressionState, 'wallet' | 'inventory' | 'unlocked' | 'milestone'>,
  key: FeatureKey,
): boolean {
  const feature = FEATURE_BY_KEY.get(key);
  if (!feature) {
    return false;
  }
  if (feature.alwaysUnlocked) {
    // Lifestyle utilities are never blocked here. The app-level milestone gate
    // still decides whether the screen exists yet, but the economy never locks it.
    return true;
  }
  if (!isMilestoneAtOrBefore(feature.milestone, state.milestone)) {
    return false;
  }
  const expansion = EXPANSION_BY_KEY.get(key as ExpansionKey);
  if (expansion) {
    return state.unlocked.includes(expansion.key);
  }
  // Kitchen / generic gameplay features are unlocked by milestone alone once
  // the home reaches the required tier; no coin cost is charged a second time.
  return true;
}

/** Rounds a coin price down to the nearest 5 coins (shop display helper). */
export function roundShopPrice(price: number): number {
  return divFloor(price, 5) * 5;
}
