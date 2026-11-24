/**
 * NPC Order Board (V0.2.5) — three deterministic, server-seeded orders that pay
 * the documented 1.35x–1.70x premium (docs/economy/MARKET_AND_NPC.md §1,
 * docs/economy/BALANCING_PLAN.md §1).
 *
 * Rules that are deliberately encoded here:
 * - The board is generated from a server seed + refresh window only. The client
 *   cannot choose which orders exist or what they pay.
 * - An order is completed at most once (slot is emptied + completed id list), and
 *   a replayed idempotency key is rejected: the server must return the stored
 *   result instead of paying twice.
 * - Missing an order costs nothing. Expiry only removes the opportunity
 *   (no fee, no streak, no damage while offline).
 * - Restaurant orders (V0.3) are modelled as a separate value type so Cooking can
 *   settle them later without a board refactor.
 */

import { computeSellPriceBp } from './catalogConfig.ts';
import { ITEM_CATALOG } from './catalogConfig.ts';
import { applyItemDelta, divFloor, hasIdempotencyKey, inventoryQty } from './ledgerMath.ts';
import type { CoinLedgerEntry, InventoryState } from './ledgerMath.ts';
import type { ItemDefinition, MilestoneId } from './types.ts';
import { isMilestoneAtOrBefore } from './types.ts';
import { createRng, deriveSeed } from '../rng.ts';

export const ORDER_SLOT_COUNT = 3;
/** Assumption: the design says "a refresh cycle" without a duration. */
export const ORDER_REFRESH_HOURS = 12;
export const ORDER_MULTIPLIER_MIN_BP = 13_500;
export const ORDER_MULTIPLIER_MAX_BP = 17_000;
export const ORDER_DECOR_BONUS_CHANCE = 0.2;
export const ORDER_MAX_LINES = 2;
export const ORDER_LINE_QTY_MIN = 1;
export const ORDER_LINE_QTY_MAX = 3;
export const RESTAURANT_DEADLINE_MIN_MS = 90_000;
export const RESTAURANT_DEADLINE_MAX_MS = 150_000;

export type OrderKind = 'board' | 'restaurant';

export interface OrderRequirement {
  readonly sku: string;
  readonly qty: number;
}

export interface OrderDefinition {
  readonly orderId: string;
  readonly kind: OrderKind;
  readonly slot: number;
  readonly requirements: readonly OrderRequirement[];
  /** Premium applied to the base sell price (1.35x–1.70x). */
  readonly multiplierBp: number;
  readonly rewardCoins: number;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  /** V0.3 restaurant orders only. */
  readonly minStars?: number;
  readonly deadlineMs?: number;
  /** Deterministic 20% decorative bonus flag; the server grants the item. */
  readonly decorBonus: boolean;
}

export interface OrderBoardState {
  readonly windowIndex: number;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly orders: readonly (OrderDefinition | null)[];
  readonly completedOrderIds: readonly string[];
}

export function orderWindowIndex(nowMs: number, refreshHours = ORDER_REFRESH_HOURS): number {
  if (!Number.isFinite(nowMs) || refreshHours <= 0) {
    throw new RangeError('orderWindowIndex requires finite nowMs and positive refreshHours');
  }
  return Math.floor(nowMs / (refreshHours * 3_600_000));
}

export function orderWindowBounds(
  windowIndex: number,
  refreshHours = ORDER_REFRESH_HOURS,
): { startMs: number; endMs: number } {
  const windowMs = refreshHours * 3_600_000;
  return { startMs: windowIndex * windowMs, endMs: (windowIndex + 1) * windowMs };
}

/** Items the board may request at a milestone: orderable, sellable, non-free. */
export function orderableItems(milestone: MilestoneId): ItemDefinition[] {
  return ITEM_CATALOG.filter(
    (item) =>
      item.orderMultiplierBp !== null &&
      item.sellPrice > 0 &&
      item.sellChannels.includes('order_board') &&
      isMilestoneAtOrBefore(item.milestone, milestone),
  );
}

function rewardForLine(sku: string, qty: number, multiplierBp: number): number {
  const bp = computeSellPriceBp(sku, 'normal', 0, { demandBp: multiplierBp });
  return divFloor(bp, 10_000) * qty;
}

export interface GenerateBoardInput {
  readonly seed: number;
  readonly windowIndex: number;
  readonly milestone: MilestoneId;
  readonly nowMs: number;
  readonly refreshHours?: number;
  readonly slots?: number;
}

/**
 * Deterministic board for one refresh window. Same `(seed, windowIndex, milestone)`
 * always produces the same three orders.
 */
export function generateOrderBoard(input: GenerateBoardInput): OrderBoardState {
  const refreshHours = input.refreshHours ?? ORDER_REFRESH_HOURS;
  const slots = input.slots ?? ORDER_SLOT_COUNT;
  const bounds = orderWindowBounds(input.windowIndex, refreshHours);
  const candidates = orderableItems(input.milestone);
  const rng = createRng(deriveSeed(input.seed, 'order-board', input.windowIndex, input.milestone));

  const orders: (OrderDefinition | null)[] = [];
  if (candidates.length === 0) {
    for (let slot = 0; slot < slots; slot += 1) {
      orders.push(null);
    }
    return {
      windowIndex: input.windowIndex,
      createdAtMs: bounds.startMs,
      expiresAtMs: bounds.endMs,
      orders,
      completedOrderIds: [],
    };
  }

  for (let slot = 0; slot < slots; slot += 1) {
    const primary = rng.pick(candidates);
    const lineCount = rng.chance(0.35) ? 2 : 1;
    const lines: OrderRequirement[] = [
      {
        sku: primary.sku,
        qty: rng.int(ORDER_LINE_QTY_MIN, ORDER_LINE_QTY_MAX + 1),
      },
    ];
    if (lineCount === 2) {
      const others = candidates.filter((item) => item.sku !== primary.sku);
      if (others.length > 0) {
        const secondary = rng.pick(others);
        lines.push({
          sku: secondary.sku,
          qty: rng.int(ORDER_LINE_QTY_MIN, ORDER_LINE_QTY_MAX + 1),
        });
      }
    }
    const multiplierBp = Math.min(
      ORDER_MULTIPLIER_MAX_BP,
      Math.max(ORDER_MULTIPLIER_MIN_BP, primary.orderMultiplierBp ?? ORDER_MULTIPLIER_MIN_BP),
    );
    const rewardCoins = lines.reduce(
      (sum, line) => sum + rewardForLine(line.sku, line.qty, multiplierBp),
      0,
    );
    const signature = lines.map((line) => `${line.sku}x${line.qty}`).join('-');
    orders.push({
      orderId: `ord-${input.windowIndex}-${slot}-${signature}`,
      kind: 'board',
      slot,
      requirements: lines,
      multiplierBp,
      rewardCoins,
      createdAtMs: bounds.startMs,
      expiresAtMs: bounds.endMs,
      decorBonus: rng.chance(ORDER_DECOR_BONUS_CHANCE),
    });
  }

  return {
    windowIndex: input.windowIndex,
    createdAtMs: bounds.startMs,
    expiresAtMs: bounds.endMs,
    orders,
    completedOrderIds: [],
  };
}

export type OrderErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_ALREADY_COMPLETED'
  | 'ORDER_EXPIRED'
  | 'MISSING_ITEMS'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'STARS_TOO_LOW'
  | 'TOO_SLOW'
  | 'WRONG_DISH';

export interface OrderFailure {
  readonly ok: false;
  readonly code: OrderErrorCode;
  readonly messageVi: string;
}

export interface BoardCompletion {
  readonly ok: true;
  readonly board: OrderBoardState;
  readonly inventory: InventoryState;
  readonly ledgerEntry: CoinLedgerEntry;
  readonly rewardCoins: number;
  readonly decorBonus: boolean;
}

export type BoardCompletionResult = BoardCompletion | OrderFailure;

function fail(code: OrderErrorCode, messageVi: string): OrderFailure {
  return { ok: false, code, messageVi };
}

/**
 * Completes one board order: consumes every required item (all-or-nothing), pays
 * the reward through the ledger and empties the slot. Completed orders are kept
 * in a bounded id list so a retry cannot be paid twice.
 */
export function completeOrder(
  board: OrderBoardState,
  request: {
    orderId: string;
    inventory: InventoryState;
    nowMs: number;
    idempotencyKey: string;
    actorId: string;
  },
  history: readonly CoinLedgerEntry[] = [],
): BoardCompletionResult {
  if (board.completedOrderIds.includes(request.orderId)) {
    return fail('ORDER_ALREADY_COMPLETED', 'Đơn hàng này đã hoàn thành');
  }
  if (hasIdempotencyKey(history, request.idempotencyKey)) {
    return fail(
      'DUPLICATE_IDEMPOTENCY_KEY',
      'Giao dịch đã được xử lý — server phải trả lại kết quả đã lưu',
    );
  }
  const order = board.orders.find((entry) => entry?.orderId === request.orderId);
  if (!order) {
    return fail('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng trong kỳ hiện tại');
  }
  if (request.nowMs >= order.expiresAtMs) {
    return fail('ORDER_EXPIRED', 'Đơn hàng đã hết hạn — không mất gì, chỉ mất cơ hội');
  }
  for (const line of order.requirements) {
    if (inventoryQty(request.inventory, line.sku) < line.qty) {
      return fail(
        'MISSING_ITEMS',
        `Thiếu ${line.sku}: cần ${line.qty}, còn ${inventoryQty(request.inventory, line.sku)}`,
      );
    }
  }

  let inventory = request.inventory;
  for (const line of order.requirements) {
    inventory = applyItemDelta(inventory, { [line.sku]: -line.qty });
  }

  const ledgerEntry: CoinLedgerEntry = {
    id: `order-${request.orderId}`,
    kind: 'earn',
    deltaCoins: order.rewardCoins,
    reason: 'order_board',
    idempotencyKey: request.idempotencyKey,
    createdAt: request.nowMs,
  };

  const completedOrderIds = [...board.completedOrderIds, order.orderId].slice(-50);
  return {
    ok: true,
    board: {
      ...board,
      orders: board.orders.map((entry) => (entry?.orderId === order.orderId ? null : entry)),
      completedOrderIds,
    },
    inventory,
    ledgerEntry,
    rewardCoins: order.rewardCoins,
    decorBonus: order.decorBonus,
  };
}

// --------------------------------------------------------------------------
// Restaurant orders (V0.3 Cooking)
// --------------------------------------------------------------------------

export interface RestaurantOrder {
  readonly orderId: string;
  readonly kind: 'restaurant';
  readonly dishSku: string;
  readonly minStars: 2 | 3;
  readonly multiplierBp: number;
  readonly rewardCoins: number;
  readonly createdAtMs: number;
  readonly deadlineMs: number;
}

export const RESTAURANT_MULTIPLIER_MIN_BP = 16_000;
export const RESTAURANT_MULTIPLIER_MAX_BP = 20_000;

/**
 * Restaurant order for the Cooking milestone. Returns `null` before V0.3 or when
 * no dish is available yet, so callers can simply skip mounting it.
 */
export function generateRestaurantOrder(input: {
  seed: number;
  windowIndex: number;
  milestone: MilestoneId;
  nowMs: number;
}): RestaurantOrder | null {
  if (!isMilestoneAtOrBefore('V0.3.0', input.milestone)) {
    return null;
  }
  const dishes = ITEM_CATALOG.filter(
    (item) =>
      item.group === 'dish' &&
      item.sellChannels.includes('restaurant') &&
      isMilestoneAtOrBefore(item.milestone, input.milestone),
  );
  if (dishes.length === 0) {
    return null;
  }
  const rng = createRng(deriveSeed(input.seed, 'restaurant', input.windowIndex));
  const dish = rng.pick(dishes);
  const multiplierBp = rng.int(RESTAURANT_MULTIPLIER_MIN_BP, RESTAURANT_MULTIPLIER_MAX_BP + 1);
  const minStars = rng.chance(0.3) ? 3 : 2;
  return {
    orderId: `resto-${input.windowIndex}-${dish.sku}`,
    kind: 'restaurant',
    dishSku: dish.sku,
    minStars,
    multiplierBp,
    rewardCoins: rewardForLine(dish.sku, 1, multiplierBp),
    createdAtMs: input.nowMs,
    deadlineMs: rng.int(RESTAURANT_DEADLINE_MIN_MS, RESTAURANT_DEADLINE_MAX_MS + 1),
  };
}

export interface RestaurantSettlement {
  readonly ok: true;
  readonly rewardCoins: number;
  readonly ledgerEntry: CoinLedgerEntry;
}

/** Validates a served dish against an order; failing only loses the bonus. */
export function settleRestaurantOrder(
  order: RestaurantOrder,
  served: {
    dishSku: string;
    stars: number;
    servedAtMs: number;
    idempotencyKey: string;
  },
): RestaurantSettlement | OrderFailure {
  if (served.dishSku !== order.dishSku) {
    return fail('WRONG_DISH', `Đơn cần ${order.dishSku}, nhận ${served.dishSku}`);
  }
  if (served.servedAtMs > order.createdAtMs + order.deadlineMs) {
    return fail('TOO_SLOW', 'Món ra trễ hạn của đơn — mất thưởng nhưng không mất món');
  }
  if (served.stars < order.minStars) {
    return fail('STARS_TOO_LOW', `Đơn cần ${order.minStars} sao, món chỉ đạt ${served.stars} sao`);
  }
  return {
    ok: true,
    rewardCoins: order.rewardCoins,
    ledgerEntry: {
      id: `restaurant-${order.orderId}`,
      kind: 'earn',
      deltaCoins: order.rewardCoins,
      reason: 'restaurant_order',
      idempotencyKey: served.idempotencyKey,
      createdAt: served.servedAtMs,
    },
  };
}
