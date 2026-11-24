import { describe, expect, it } from 'vitest';
import { computeSellPriceBp } from '../../src/shared/economy/catalogConfig';
import { divFloor } from '../../src/shared/economy/ledgerMath';
import {
  ORDER_MULTIPLIER_MAX_BP,
  ORDER_MULTIPLIER_MIN_BP,
  ORDER_REFRESH_HOURS,
  completeOrder,
  generateOrderBoard,
  generateRestaurantOrder,
  orderWindowBounds,
  orderWindowIndex,
  orderableItems,
  settleRestaurantOrder,
} from '../../src/shared/economy/orderBoard';
import { runSimulation } from '../../src/shared/economy/sim/run';

const SEED = 20261125;
const WINDOW = 1_000;
const BOARD_START = orderWindowBounds(WINDOW).startMs;

function board(overrides: Partial<Parameters<typeof generateOrderBoard>[0]> = {}) {
  return generateOrderBoard({
    seed: SEED,
    windowIndex: WINDOW,
    milestone: 'V0.2.5',
    nowMs: BOARD_START + 1_000,
    ...overrides,
  });
}

function inventoryFor(requirements: readonly { sku: string; qty: number }[]) {
  const inventory: Record<string, number> = {};
  for (const line of requirements) {
    inventory[line.sku] = (inventory[line.sku] ?? 0) + line.qty;
  }
  return inventory;
}

describe('order board — generation', () => {
  it('is deterministic for the same seed, window and milestone', () => {
    expect(board()).toEqual(board());
  });

  it('creates three slots and changes with the window', () => {
    const first = board();
    expect(first.orders).toHaveLength(3);
    expect(first.orders.every((order) => order !== null)).toBe(true);
    const next = board({ windowIndex: WINDOW + 1 });
    expect(next.windowIndex).toBe(WINDOW + 1);
    expect(next.orders).not.toEqual(first.orders);
  });

  it('respects the milestone: no orderable items before farming ships', () => {
    expect(orderableItems('V0.2.0')).toEqual([]);
    const early = board({ milestone: 'V0.2.0' });
    expect(early.orders).toEqual([null, null, null]);
    expect(orderableItems('V0.2.1').length).toBeGreaterThan(0);
  });

  it('only requests items that exist at the profile milestone', () => {
    const available = new Set(orderableItems('V0.2.2').map((item) => item.sku));
    for (const order of board({ milestone: 'V0.2.2' }).orders) {
      for (const line of order?.requirements ?? []) {
        expect(available.has(line.sku), `${line.sku} không thuộc mốc V0.2.2`).toBe(true);
      }
    }
  });

  it('pays the documented 1.35x–1.70x premium over the base value', () => {
    for (const order of board().orders) {
      if (!order) continue;
      expect(order.multiplierBp).toBeGreaterThanOrEqual(ORDER_MULTIPLIER_MIN_BP);
      expect(order.multiplierBp).toBeLessThanOrEqual(ORDER_MULTIPLIER_MAX_BP);
      const expected = order.requirements.reduce(
        (sum, line) =>
          sum +
          divFloor(
            computeSellPriceBp(line.sku, 'normal', 0, { demandBp: order.multiplierBp }),
            10_000,
          ) *
            line.qty,
        0,
      );
      expect(order.rewardCoins).toBe(expected);
      expect(order.rewardCoins).toBeGreaterThan(0);
    }
  });

  it('rolls the window on the configured refresh boundary', () => {
    const windowMs = ORDER_REFRESH_HOURS * 3_600_000;
    const start = orderWindowBounds(WINDOW).startMs;
    expect(orderWindowIndex(start)).toBe(WINDOW);
    expect(orderWindowIndex(start + windowMs - 1)).toBe(WINDOW);
    expect(orderWindowIndex(start + windowMs)).toBe(WINDOW + 1);
  });
});

describe('order board — completion', () => {
  it('consumes the required items, pays once and empties the slot', () => {
    const first = board();
    const order = first.orders[0];
    if (!order) throw new Error('missing fixture');
    const inventory = inventoryFor(order.requirements);

    const result = completeOrder(first, {
      orderId: order.orderId,
      inventory,
      nowMs: BOARD_START + 1_000,
      idempotencyKey: 'order-key-1',
      actorId: 'a',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rewardCoins).toBe(order.rewardCoins);
    expect(result.ledgerEntry.reason).toBe('order_board');
    expect(result.board.orders[0]).toBeNull();
    for (const line of order.requirements) {
      expect(result.inventory[line.sku] ?? 0).toBe(0);
    }
  });

  it('rejects a second completion of the same order', () => {
    const first = board();
    const order = first.orders[0];
    if (!order) throw new Error('missing fixture');
    const done = completeOrder(first, {
      orderId: order.orderId,
      inventory: inventoryFor(order.requirements),
      nowMs: BOARD_START + 1_000,
      idempotencyKey: 'order-key-1',
      actorId: 'a',
    });
    if (!done.ok) throw new Error(done.messageVi);

    const again = completeOrder(
      done.board,
      {
        orderId: order.orderId,
        inventory: inventoryFor(order.requirements),
        nowMs: BOARD_START + 2_000,
        idempotencyKey: 'order-key-2',
        actorId: 'a',
      },
      [done.ledgerEntry],
    );
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe('ORDER_ALREADY_COMPLETED');
  });

  it('rejects a replayed idempotency key even for a different order', () => {
    const first = board();
    const order = first.orders[0];
    if (!order) throw new Error('missing fixture');
    const history = [
      {
        id: 'x',
        kind: 'earn' as const,
        deltaCoins: 10,
        reason: 'order_board',
        idempotencyKey: 'replayed',
        createdAt: 0,
      },
    ];
    const replay = completeOrder(
      first,
      {
        orderId: order.orderId,
        inventory: inventoryFor(order.requirements),
        nowMs: BOARD_START + 1_000,
        idempotencyKey: 'replayed',
        actorId: 'a',
      },
      history,
    );
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.code).toBe('DUPLICATE_IDEMPOTENCY_KEY');
  });

  it('rejects missing items without changing anything', () => {
    const first = board();
    const order = first.orders[0];
    if (!order) throw new Error('missing fixture');
    const result = completeOrder(first, {
      orderId: order.orderId,
      inventory: {},
      nowMs: BOARD_START + 1_000,
      idempotencyKey: 'missing',
      actorId: 'a',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('MISSING_ITEMS');
    expect(first.orders[0]).not.toBeNull();
  });

  it('lets an order expire with no penalty', () => {
    const first = board();
    const order = first.orders[0];
    if (!order) throw new Error('missing fixture');
    const result = completeOrder(first, {
      orderId: order.orderId,
      inventory: inventoryFor(order.requirements),
      nowMs: order.expiresAtMs,
      idempotencyKey: 'late',
      actorId: 'a',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ORDER_EXPIRED');
  });
});

describe('restaurant orders — future Cooking facade', () => {
  it('does not exist before the cooking milestone', () => {
    expect(
      generateRestaurantOrder({ seed: SEED, windowIndex: WINDOW, milestone: 'V0.2.5', nowMs: 0 }),
    ).toBeNull();
  });

  it('generates a deterministic order at V0.3.0 with a 90–150s deadline', () => {
    const order = generateRestaurantOrder({
      seed: SEED,
      windowIndex: WINDOW,
      milestone: 'V0.3.0',
      nowMs: BOARD_START,
    });
    expect(order).not.toBeNull();
    if (!order) return;
    expect(order.deadlineMs).toBeGreaterThanOrEqual(90_000);
    expect(order.deadlineMs).toBeLessThanOrEqual(150_000);
    expect(order.rewardCoins).toBeGreaterThan(0);
    expect(generateRestaurantOrder({
      seed: SEED,
      windowIndex: WINDOW,
      milestone: 'V0.3.0',
      nowMs: BOARD_START,
    })).toEqual(order);
  });

  it('rejects the wrong dish, a late plate and too few stars', () => {
    const order = generateRestaurantOrder({
      seed: SEED,
      windowIndex: WINDOW,
      milestone: 'V0.3.0',
      nowMs: BOARD_START,
    });
    if (!order) throw new Error('missing fixture');

    const otherDish = order.dishSku === 'carrot_soup' ? 'herb_carp' : 'carrot_soup';
    const wrong = settleRestaurantOrder(order, {
      dishSku: otherDish,
      stars: 3,
      servedAtMs: BOARD_START,
      idempotencyKey: 'k',
    });
    expect(wrong.ok === false && wrong.code).toBe('WRONG_DISH');

    const late = settleRestaurantOrder(order, {
      dishSku: order.dishSku,
      stars: 3,
      servedAtMs: order.createdAtMs + order.deadlineMs + 1,
      idempotencyKey: 'k',
    });
    expect(late.ok === false && late.code).toBe('TOO_SLOW');

    const lowStars = settleRestaurantOrder(order, {
      dishSku: order.dishSku,
      stars: 1,
      servedAtMs: order.createdAtMs,
      idempotencyKey: 'k',
    });
    // 1 star is below any minimum (2 or 3), so this must always fail.
    expect(lowStars.ok).toBe(false);
    if (lowStars.ok) return;
    expect(lowStars.code).toBe('STARS_TOO_LOW');
  });

  it('pays the order when served on time with enough stars', () => {
    const order = generateRestaurantOrder({
      seed: SEED,
      windowIndex: WINDOW,
      milestone: 'V0.3.0',
      nowMs: BOARD_START,
    });
    if (!order) throw new Error('missing fixture');
    const settled = settleRestaurantOrder(order, {
      dishSku: order.dishSku,
      stars: 3,
      servedAtMs: order.createdAtMs + 1_000,
      idempotencyKey: 'resto-ok',
    });
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(settled.rewardCoins).toBe(order.rewardCoins);
    expect(settled.ledgerEntry.reason).toBe('restaurant_order');
  });
});

describe('simulator — V0.2.5 order board profile', () => {
  it('earns order coins and keeps invariants for every persona', () => {
    for (const personaId of ['casual', 'coop', 'optimizer'] as const) {
      const result = runSimulation({
        seed: SEED,
        profileId: 'v025',
        personaId,
        days: 30,
      });
      expect(result.invariants.ok).toBe(true);
      const last = result.snapshots[result.snapshots.length - 1];
      const orderCoins = last?.sources.order_board ?? 0;
      const totalEarned = Object.values(last?.sources ?? {}).reduce(
        (sum, coins) => sum + coins,
        0,
      );
      expect(orderCoins).toBeGreaterThan(0);
      expect(orderCoins).toBeLessThanOrEqual(totalEarned);
    }
  });
});
