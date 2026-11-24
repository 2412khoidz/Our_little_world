/**
 * Shipping Bin — the 24/7 coin source (docs/economy/MARKET_AND_NPC.md §1).
 *
 * The bin applies the base sell price × quality × soft saturation, accepts
 * several stacks in one transaction, and refuses anything that is not a valid,
 * owned, sellable stack. Prices are ALWAYS computed here from the catalog; the
 * client never sends a price.
 *
 * Server-side contract notes:
 * - The SQL `inventory_items` row from docs/economy/ECONOMY_SIMULATOR_SPEC.md §2
 *   has no quality column yet. `SellLine.quality` is therefore optional and
 *   defaults to `normal`; wire quality-aware selling only after Neon adds the
 *   column (pending integration).
 * - This module is pure. It proves the *domain* rules (all-or-nothing, integer
 *   ledger math, retry safety). It is NOT evidence that a Postgres transaction
 *   is atomic.
 */

import { computeSellPriceBp, requireItem } from './catalogConfig.ts';
import {
  applyItemDelta,
  applyLedgerEntry,
  createWallet,
  divFloor,
  EconomyError,
  hasIdempotencyKey,
  inventoryQty,
} from './ledgerMath.ts';
import type { CoinLedgerEntry, InventoryState, WalletState } from './ledgerMath.ts';
import { DEFAULT_SATURATION } from './types.ts';
import type { ItemQuality, SaturationConfig } from './types.ts';

/** Fixed UTC+7 offset; Vietnam has no DST, so this is exact and deterministic. */
export const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1_000;
export const DAY_MS = 86_400_000;

/** Local (Asia/Ho_Chi_Minh) day index used to reset saturation counters. */
export function vietnamDayIndex(nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    throw new RangeError(`nowMs must be finite, received ${String(nowMs)}`);
  }
  return Math.floor((nowMs + VIETNAM_OFFSET_MS) / DAY_MS);
}

export type SellErrorCode =
  | 'UNKNOWN_SKU'
  | 'NOT_SELLABLE'
  | 'INVALID_QTY'
  | 'INVALID_QUALITY'
  | 'INSUFFICIENT_ITEMS'
  | 'DUPLICATE_LINE'
  | 'EMPTY_SALE'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'OVERFLOW';

export interface SellFailure {
  readonly ok: false;
  readonly code: SellErrorCode;
  readonly messageVi: string;
}

/** One inventory stack the player wants to sell. */
export interface SellLine {
  readonly sku: string;
  readonly qty: number;
  /** Defaults to `normal` when omitted. */
  readonly quality?: ItemQuality;
}

export interface SellLineQuote {
  readonly sku: string;
  readonly quality: ItemQuality;
  readonly qty: number;
  readonly group: string;
  readonly saturationStart: number;
  readonly saturationEnd: number;
  /** Whole-coin price per unit in sell order (saturation aware). */
  readonly unitCoins: readonly number[];
  readonly totalCoins: number;
}

export interface ShippingBinState {
  readonly wallet: WalletState;
  readonly inventory: InventoryState;
  /** Units sold per item group on `dayIndex`. */
  readonly soldByGroup: Readonly<Record<string, number>>;
  readonly dayIndex: number;
}

export function createShippingBinState(
  wallet: WalletState,
  inventory: InventoryState,
  nowMs: number,
): ShippingBinState {
  return {
    wallet,
    inventory,
    soldByGroup: {},
    dayIndex: vietnamDayIndex(nowMs),
  };
}

/** Resets daily saturation counters when the local day changes. */
export function rollSaturationDay(state: ShippingBinState, nowMs: number): ShippingBinState {
  const dayIndex = vietnamDayIndex(nowMs);
  if (dayIndex === state.dayIndex) {
    return state;
  }
  return { ...state, soldByGroup: {}, dayIndex };
}

export interface SellRequest {
  readonly lines: readonly SellLine[];
  readonly nowMs: number;
  readonly idempotencyKey: string;
  readonly actorId: string;
  readonly saturation?: SaturationConfig;
}

export interface SellSuccess {
  readonly ok: true;
  readonly state: ShippingBinState;
  readonly ledgerEntry: CoinLedgerEntry;
  readonly totalCoins: number;
  readonly lines: readonly SellLineQuote[];
  readonly dayIndex: number;
}

export type SellResult = SellSuccess | SellFailure;

function fail(code: SellErrorCode, messageVi: string): SellFailure {
  return { ok: false, code, messageVi };
}

/**
 * Prices a bin sale without mutating anything. Returns the same failure codes as
 * {@link sellToShippingBin} so the UI can preview a sale before confirming.
 */
export function quoteShippingBinSale(
  state: ShippingBinState,
  lines: readonly SellLine[],
  saturation: SaturationConfig = DEFAULT_SATURATION,
): { ok: true; lines: SellLineQuote[]; totalCoins: number; walletAfter: number } | SellFailure {
  const prepared = prepareLines(state, lines);
  if (!prepared.ok) {
    return prepared;
  }
  const soldByGroup: Record<string, number> = { ...state.soldByGroup };
  const quotes: SellLineQuote[] = [];
  let totalCoins = 0;
  for (const line of prepared.lines) {
    const definition = requireItem(line.sku);
    const start = soldByGroup[definition.group] ?? 0;
    const unitCoins: number[] = [];
    let lineTotal = 0;
    for (let index = 0; index < line.qty; index += 1) {
      const bp = computeSellPriceBp(
        line.sku,
        line.quality,
        start + index,
        { saturation },
      );
      const coins = divFloor(bp, 10_000);
      unitCoins.push(coins);
      lineTotal += coins;
    }
    soldByGroup[definition.group] = start + line.qty;
    totalCoins += lineTotal;
    quotes.push({
      sku: line.sku,
      quality: line.quality,
      qty: line.qty,
      group: definition.group,
      saturationStart: start,
      saturationEnd: start + line.qty,
      unitCoins,
      totalCoins: lineTotal,
    });
  }
  let walletAfter: number;
  try {
    walletAfter = createWallet(state.wallet.coins + totalCoins).coins;
  } catch (error) {
    return fail('OVERFLOW', error instanceof Error ? error.message : 'Số xu vượt giới hạn');
  }
  return { ok: true, lines: quotes, totalCoins, walletAfter };
}

interface PreparedLines {
  readonly ok: true;
  readonly lines: readonly { sku: string; qty: number; quality: ItemQuality }[];
}
type PreparedResult = PreparedLines | SellFailure;

function prepareLines(state: ShippingBinState, lines: readonly SellLine[]): PreparedResult {
  if (lines.length === 0) {
    return fail('EMPTY_SALE', 'Không có vật phẩm nào để bán');
  }
  const seen = new Set<string>();
  const requested = new Map<string, number>();
  const prepared: { sku: string; qty: number; quality: ItemQuality }[] = [];

  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return fail('INVALID_QTY', `Số lượng ${line.sku} phải là số nguyên dương`);
    }
    const definition = requireItemSafe(line.sku);
    if (!definition) {
      return fail('UNKNOWN_SKU', `Vật phẩm không tồn tại: ${line.sku}`);
    }
    const quality: ItemQuality = line.quality ?? 'normal';
    if (!definition.qualityTiers.includes(quality)) {
      return fail('INVALID_QUALITY', `${line.sku} không có phẩm cấp ${quality}`);
    }
    if (
      definition.sellPrice <= 0 ||
      !definition.sellChannels.includes('shipping_bin')
    ) {
      return fail('NOT_SELLABLE', `${line.sku} không bán được ở Thùng giao hàng`);
    }
    const lineKey = `${line.sku}|${quality}`;
    if (seen.has(lineKey)) {
      return fail('DUPLICATE_LINE', `Dòng bán trùng cho ${line.sku} (${quality})`);
    }
    seen.add(lineKey);
    requested.set(line.sku, (requested.get(line.sku) ?? 0) + line.qty);
    prepared.push({ sku: line.sku, qty: line.qty, quality });
  }

  for (const [sku, qty] of requested) {
    if (inventoryQty(state.inventory, sku) < qty) {
      return fail(
        'INSUFFICIENT_ITEMS',
        `Không đủ ${sku}: cần ${qty}, còn ${inventoryQty(state.inventory, sku)}`,
      );
    }
  }

  // Canonical order so the same basket always pays the same: group, then the
  // best quality first (so gold units take the least-saturated slots), then SKU.
  const qualityRank: Record<ItemQuality, number> = { gold: 3, silver: 2, normal: 1 };
  prepared.sort((left, right) => {
    const leftGroup = requireItem(left.sku).group;
    const rightGroup = requireItem(right.sku).group;
    if (leftGroup !== rightGroup) {
      return leftGroup < rightGroup ? -1 : 1;
    }
    if (left.quality !== right.quality) {
      return qualityRank[right.quality] - qualityRank[left.quality];
    }
    return left.sku < right.sku ? -1 : left.sku > right.sku ? 1 : 0;
  });

  return { ok: true, lines: prepared };
}

function requireItemSafe(sku: string): ReturnType<typeof requireItem> | null {
  try {
    return requireItem(sku);
  } catch {
    return null;
  }
}

/**
 * Applies a whole bin sale atomically: either every line succeeds or nothing
 * changes. A retried request with the same `idempotencyKey` is rejected here;
 * the real server must replay the stored result instead of double paying.
 */
export function sellToShippingBin(
  state: ShippingBinState,
  request: SellRequest,
  history: readonly CoinLedgerEntry[] = [],
): SellResult {
  if (!request.idempotencyKey) {
    return fail('DUPLICATE_IDEMPOTENCY_KEY', 'Thiếu idempotencyKey');
  }
  if (hasIdempotencyKey(history, request.idempotencyKey)) {
    return fail(
      'DUPLICATE_IDEMPOTENCY_KEY',
      'Giao dịch này đã được xử lý — server phải trả lại kết quả đã lưu, không cộng xu lần nữa',
    );
  }
  const rolled = rollSaturationDay(state, request.nowMs);
  const quote = quoteShippingBinSale(rolled, request.lines, request.saturation ?? DEFAULT_SATURATION);
  if (!quote.ok) {
    return quote;
  }

  let inventory: InventoryState = rolled.inventory;
  try {
    for (const line of request.lines) {
      inventory = applyItemDelta(inventory, { [line.sku]: -line.qty });
    }
  } catch (error) {
    if (error instanceof EconomyError) {
      return fail('INSUFFICIENT_ITEMS', error.messageVi);
    }
    throw error;
  }

  const entry: CoinLedgerEntry = {
    id: `sell-bin-${request.idempotencyKey}`,
    kind: 'earn',
    deltaCoins: quote.totalCoins,
    reason: 'sell_bin',
    idempotencyKey: request.idempotencyKey,
    createdAt: request.nowMs,
  };

  let wallet: WalletState;
  try {
    wallet = applyLedgerEntry(rolled.wallet, entry);
  } catch (error) {
    if (error instanceof EconomyError) {
      return fail('OVERFLOW', error.messageVi);
    }
    throw error;
  }

  const soldByGroup: Record<string, number> = { ...rolled.soldByGroup };
  for (const line of quote.lines) {
    soldByGroup[line.group] = line.saturationEnd;
  }

  return {
    ok: true,
    state: { wallet, inventory, soldByGroup, dayIndex: rolled.dayIndex },
    ledgerEntry: entry,
    totalCoins: quote.totalCoins,
    lines: quote.lines,
    dayIndex: rolled.dayIndex,
  };
}

/** Canonical RPC payload shape for the future `sell_bin` action (OLW-020-02). */
export interface ShippingBinTransaction {
  readonly action: 'sell_bin';
  readonly worldId: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly lines: readonly SellLine[];
  /** Client clock, informational only; the server prices with its own time. */
  readonly clientSentAtMs: number;
}

export function buildShippingBinTransaction(input: {
  worldId: string;
  actorId: string;
  idempotencyKey: string;
  lines: readonly SellLine[];
  clientSentAtMs: number;
}): ShippingBinTransaction {
  return {
    action: 'sell_bin',
    worldId: input.worldId,
    actorId: input.actorId,
    idempotencyKey: input.idempotencyKey,
    lines: input.lines.map((line) => ({ sku: line.sku, qty: line.qty, quality: line.quality })),
    clientSentAtMs: input.clientSentAtMs,
  };
}
