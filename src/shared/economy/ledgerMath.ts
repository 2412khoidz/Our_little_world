/**
 * Integer ledger math and basis-point helpers for Our Little World.
 *
 * Adapted in spirit from `harvest-hollow@9b23e1a:shared/rules/economy.js`
 * (MIT, Krasimir Kralev) as described in docs/research/REUSE_MATRIX.md. The
 * upstream repository is not available in this worktree, so this is an original
 * implementation of the documented integer/basis-point contract
 * (docs/economy/ECONOMY_MODEL.md §2). No upstream source text was copied.
 *
 * All money is whole coins. Multipliers are basis points (`10_000 = 1.0`).
 * Every multiplication floors immediately, and fractions never leak into the
 * wallet or the inventory.
 */

import type { ItemQuality, SaturationConfig } from './types';
import { DEFAULT_SATURATION, QUALITY_MULTIPLIER_BP } from './types';

/** Basis-point denominator. `10_000` bp = `1.0`. */
export const BP_DENOM = 10_000;

export type EconomyErrorCode =
  | 'NON_INTEGER_MONEY'
  | 'NEGATIVE_AMOUNT'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_ITEMS'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'INVALID_SATURATION_CONFIG'
  | 'UNSAFE_ARITHMETIC';

/** Typed domain error with a short Vietnamese message for the UI layer. */
export class EconomyError extends Error {
  readonly code: EconomyErrorCode;
  readonly messageVi: string;

  constructor(code: EconomyErrorCode, messageVi: string) {
    super(`${code}: ${messageVi}`);
    this.name = 'EconomyError';
    this.code = code;
    this.messageVi = messageVi;
  }
}

function assertSafeInteger(value: number, code: EconomyErrorCode, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new EconomyError(code, `${label} phải là số nguyên an toàn (nhận ${String(value)})`);
  }
}

/**
 * `floor(amount * bp / 10_000)` using only safe integers.
 * Negative amounts are rejected: ledger deltas are always magnitudes.
 */
export function mulBp(amount: number, bp: number): number {
  assertSafeInteger(amount, 'UNSAFE_ARITHMETIC', 'Số tiền');
  assertSafeInteger(bp, 'UNSAFE_ARITHMETIC', 'Hệ số basis point');
  if (amount < 0) {
    throw new EconomyError('NEGATIVE_AMOUNT', 'Số tiền không được âm');
  }
  const product = amount * bp;
  if (!Number.isSafeInteger(product)) {
    throw new EconomyError('UNSAFE_ARITHMETIC', 'Phép nhân basis point vượt giới hạn an toàn');
  }
  return Math.floor(product / BP_DENOM);
}

/** Integer floor division with an explicit positive divisor. */
export function divFloor(amount: number, divisor: number): number {
  assertSafeInteger(amount, 'UNSAFE_ARITHMETIC', 'Số tiền');
  if (!Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new EconomyError('UNSAFE_ARITHMETIC', 'Số chia phải là số nguyên dương');
  }
  return Math.floor(amount / divisor);
}

/** Quality multiplier in basis points; unknown tiers fall back to `normal`. */
export function qualityMultiplierBp(quality: ItemQuality | null | undefined): number {
  if (!quality) {
    return QUALITY_MULTIPLIER_BP.normal;
  }
  return QUALITY_MULTIPLIER_BP[quality] ?? QUALITY_MULTIPLIER_BP.normal;
}

/**
 * Soft-saturation multiplier for the `unitIndex`-th unit of a group sold in the
 * same local day (`0`-based). The first `threshold` units are free; every unit
 * after that loses `stepBp` until the floor is reached.
 *
 * Because the multiplier depends only on the unit index, splitting a lot does
 * not change the total payout (docs/economy/MARKET_AND_NPC.md §2).
 */
export function saturationMultiplierBp(
  unitIndex: number,
  config: SaturationConfig = DEFAULT_SATURATION,
): number {
  if (!Number.isInteger(unitIndex) || unitIndex < 0) {
    throw new EconomyError(
      'INVALID_SATURATION_CONFIG',
      `Chỉ số đơn vị bão hòa phải là số nguyên không âm (nhận ${String(unitIndex)})`,
    );
  }
  if (
    !Number.isInteger(config.threshold) ||
    config.threshold < 0 ||
    !Number.isInteger(config.stepBp) ||
    config.stepBp < 0 ||
    !Number.isInteger(config.floorBp) ||
    config.floorBp < 0 ||
    config.floorBp > BP_DENOM
  ) {
    throw new EconomyError('INVALID_SATURATION_CONFIG', 'Cấu hình bão hòa mềm không hợp lệ');
  }
  if (unitIndex < config.threshold) {
    return BP_DENOM;
  }
  const steps = unitIndex - config.threshold + 1;
  return Math.max(config.floorBp, BP_DENOM - config.stepBp * steps);
}

// --------------------------------------------------------------------------
// Ledger
// --------------------------------------------------------------------------

export type LedgerKind = 'earn' | 'grant' | 'spend';

/** Append-only ledger entry. `deltaCoins` is a positive magnitude. */
export interface CoinLedgerEntry {
  readonly id: string;
  readonly kind: LedgerKind;
  readonly deltaCoins: number;
  /** Stable reason key, e.g. `sell_bin`, `buy_seed`, `minigame_reward`. */
  readonly reason: string;
  /** Server-owned idempotency key (`UNIQUE(world_id, idempotency_key)`). */
  readonly idempotencyKey: string;
  readonly createdAt: number;
}

/** Signed coin delta implied by an entry kind. */
export function signedDelta(entry: CoinLedgerEntry): number {
  return entry.kind === 'spend' ? -entry.deltaCoins : entry.deltaCoins;
}

export interface WalletState {
  readonly coins: number;
}

export function createWallet(coins = 0): WalletState {
  assertSafeInteger(coins, 'NON_INTEGER_MONEY', 'Số xu ví');
  if (coins < 0) {
    throw new EconomyError('NEGATIVE_AMOUNT', 'Số xu ví không được âm');
  }
  return { coins };
}

function assertEntry(entry: CoinLedgerEntry): void {
  assertSafeInteger(entry.deltaCoins, 'NON_INTEGER_MONEY', 'Delta xu');
  if (entry.deltaCoins <= 0) {
    throw new EconomyError('NEGATIVE_AMOUNT', 'Delta xu phải là số dương');
  }
  if (!entry.id || !entry.reason || !entry.idempotencyKey) {
    throw new EconomyError('NEGATIVE_AMOUNT', 'Bút toán thiếu id/reason/idempotencyKey');
  }
}

/** Applies one ledger entry to a wallet. `spend` cannot overdraw. */
export function applyLedgerEntry(wallet: WalletState, entry: CoinLedgerEntry): WalletState {
  assertEntry(entry);
  const next = wallet.coins + signedDelta(entry);
  if (!Number.isSafeInteger(next)) {
    throw new EconomyError('UNSAFE_ARITHMETIC', 'Số dư ví vượt giới hạn an toàn');
  }
  if (next < 0) {
    throw new EconomyError(
      'INSUFFICIENT_FUNDS',
      `Không đủ xu: cần ${entry.deltaCoins}, còn ${wallet.coins}`,
    );
  }
  return { coins: next };
}

export function canAfford(wallet: WalletState, amount: number): boolean {
  assertSafeInteger(amount, 'NON_INTEGER_MONEY', 'Số xu cần trả');
  return amount >= 0 && wallet.coins >= amount;
}

export function hasIdempotencyKey(
  entries: readonly CoinLedgerEntry[],
  key: string,
): boolean {
  return entries.some((entry) => entry.idempotencyKey === key);
}

// --------------------------------------------------------------------------
// Inventory
// --------------------------------------------------------------------------

/** SKU -> positive quantity. Absent SKUs mean zero; zero quantities are pruned. */
export type InventoryState = Readonly<Record<string, number>>;

/** Applies a signed delta per SKU. Negative results are rejected. */
export function applyItemDelta(
  inventory: InventoryState,
  delta: Readonly<Record<string, number>>,
): InventoryState {
  const next: Record<string, number> = { ...inventory };
  for (const sku of Object.keys(delta)) {
    const change = delta[sku];
    if (change === undefined) {
      continue;
    }
    assertSafeInteger(change, 'NON_INTEGER_MONEY', `Delta vật phẩm ${sku}`);
    const current = next[sku] ?? 0;
    const updated = current + change;
    if (updated < 0) {
      throw new EconomyError(
        'INSUFFICIENT_ITEMS',
        `Không đủ ${sku}: cần ${Math.abs(change)}, còn ${current}`,
      );
    }
    if (updated === 0) {
      delete next[sku];
    } else {
      next[sku] = updated;
    }
  }
  return next;
}

export function inventoryQty(inventory: InventoryState, sku: string): number {
  return inventory[sku] ?? 0;
}

export function inventoryTotal(inventory: InventoryState): number {
  return Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
}

/** Adds to an inventory (shopping, harvest, rewards). */
export function addToInventory(
  inventory: InventoryState,
  sku: string,
  qty: number,
): InventoryState {
  return applyItemDelta(inventory, { [sku]: qty });
}

/** Removes from an inventory (crafting, selling, gifting). */
export function removeFromInventory(
  inventory: InventoryState,
  sku: string,
  qty: number,
): InventoryState {
  return applyItemDelta(inventory, { [sku]: -qty });
}

// --------------------------------------------------------------------------
// Replay & invariants
// --------------------------------------------------------------------------

export interface LedgerSummary {
  readonly startCoins: number;
  readonly endingCoins: number;
  readonly totalEarned: number;
  readonly totalGranted: number;
  readonly totalSpent: number;
  /** Coins grouped by reason for every non-spend entry. */
  readonly sources: Readonly<Record<string, number>>;
  /** Coins grouped by reason for every spend entry. */
  readonly sinks: Readonly<Record<string, number>>;
  /** Human-readable invariant violations (empty = healthy). */
  readonly issues: readonly string[];
}

/**
 * Recomputes a wallet from `startCoins` + the ledger and verifies the invariant
 * `wallet = start + Σearned + Σgranted − Σspent`.
 */
export function replayLedger(
  startCoins: number,
  entries: readonly CoinLedgerEntry[],
): LedgerSummary {
  const issues: string[] = [];
  const sources: Record<string, number> = {};
  const sinks: Record<string, number> = {};
  const seenKeys = new Set<string>();
  let wallet = createWallet(startCoins);
  let totalEarned = 0;
  let totalGranted = 0;
  let totalSpent = 0;

  for (const entry of entries) {
    if (seenKeys.has(entry.idempotencyKey)) {
      issues.push(`Bút toán trùng idempotencyKey: ${entry.idempotencyKey}`);
      continue;
    }
    seenKeys.add(entry.idempotencyKey);
    try {
      wallet = applyLedgerEntry(wallet, entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`Bút toán bị từ chối (${entry.id}): ${message}`);
      continue;
    }
    if (entry.kind === 'earn') {
      totalEarned += entry.deltaCoins;
      sources[entry.reason] = (sources[entry.reason] ?? 0) + entry.deltaCoins;
    } else if (entry.kind === 'grant') {
      totalGranted += entry.deltaCoins;
      sources[entry.reason] = (sources[entry.reason] ?? 0) + entry.deltaCoins;
    } else {
      totalSpent += entry.deltaCoins;
      sinks[entry.reason] = (sinks[entry.reason] ?? 0) + entry.deltaCoins;
    }
  }

  const expected = startCoins + totalEarned + totalGranted - totalSpent;
  if (wallet.coins !== expected) {
    issues.push(`Sai lệch ví: thực tế ${wallet.coins}, kỳ vọng ${expected}`);
  }

  return {
    startCoins,
    endingCoins: wallet.coins,
    totalEarned,
    totalGranted,
    totalSpent,
    sources,
    sinks,
    issues,
  };
}
