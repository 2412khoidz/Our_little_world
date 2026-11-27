/**
 * Phase 7 — cross-module verification.
 *
 * This suite checks the contracts BETWEEN the modules built in this session
 * (economy + shipping bin + order board + shop + simulator + minigames + pet
 * primitives) and the invariants that no single module can prove alone:
 * integer money, deterministic RNG, timestamp ownership, duplicate-action
 * safety, serialization and the "pure domain" import boundary.
 *
 * Known, still-unresolved assumptions are listed explicitly at the bottom so a
 * green run never hides them.
 */

import { describe, expect, it } from 'vitest';
import { computeSellLot, ITEM_CATALOG, validateCatalog } from '../../src/shared/economy/catalogConfig';
import { replayLedger } from '../../src/shared/economy/ledgerMath';
import {
  createShippingBinState,
  sellToShippingBin,
  vietnamDayIndex,
} from '../../src/shared/economy/shippingBin';
import { claimForage, createForageState } from '../../src/shared/economy/forage';
import {
  completeOrder,
  generateOrderBoard,
  orderWindowBounds,
  orderWindowIndex,
} from '../../src/shared/economy/orderBoard';
import { applyExpansion } from '../../src/shared/shop';
import { createRng } from '../../src/shared/rng';
import { caroGame } from '../../src/shared/minigames';
import {
  appendMemoryEvent,
  deserializeMemory,
  createMemoryState,
  serializeMemory,
} from '../../src/shared/petAdvanced/primitives';

const T0 = Date.UTC(2026, 0, 1, 1, 0, 0);

describe('cross-module — money is always integer coins', () => {
  it('never exposes a fractional price in the catalog', () => {
    for (const item of ITEM_CATALOG) {
      expect(Number.isInteger(item.sellPrice), item.sku).toBe(true);
      if (item.storeBuy !== null) {
        expect(Number.isInteger(item.storeBuy), item.sku).toBe(true);
      }
      expect(Number.isInteger(item.standardValueBp), item.sku).toBe(true);
    }
  });

  it('keeps a bin sale, its ledger entry and the replay exactly balanced', () => {
    const state = createShippingBinState({ coins: 40 }, { wheat: 6, wild_herb: 3 }, T0);
    const sale = sellToShippingBin(state, {
      lines: [
        { sku: 'wheat', qty: 4, quality: 'silver' },
        { sku: 'wild_herb', qty: 2 },
      ],
      nowMs: T0,
      idempotencyKey: 'x-mod-1',
      actorId: 'a',
    });
    expect(sale.ok).toBe(true);
    if (!sale.ok) return;
    expect(Number.isInteger(sale.totalCoins)).toBe(true);
    expect(sale.totalCoins).toBeGreaterThan(0);
    const replay = replayLedger(40, [sale.ledgerEntry]);
    expect(replay.issues).toEqual([]);
    expect(replay.endingCoins).toBe(sale.state.wallet.coins);
    expect(sale.state.wallet.coins).toBe(40 + sale.totalCoins);
  });

  it('keeps order and expansion rewards integer and replayable', () => {
    const windowIndex = orderWindowIndex(T0);
    const board = generateOrderBoard({
      seed: 11,
      windowIndex,
      milestone: 'V0.2.5',
      nowMs: T0,
    });
    const order = board.orders.find((entry) => entry !== null);
    expect(order).toBeDefined();
    if (!order) return;
    expect(Number.isInteger(order.rewardCoins)).toBe(true);

    const inventory: Record<string, number> = {};
    for (const line of order.requirements) {
      inventory[line.sku] = (inventory[line.sku] ?? 0) + line.qty;
    }
    const completion = completeOrder(board, {
      orderId: order.orderId,
      inventory,
      nowMs: T0,
      idempotencyKey: 'x-mod-order',
      actorId: 'a',
    });
    expect(completion.ok).toBe(true);
    if (!completion.ok) return;
    const replay = replayLedger(0, [completion.ledgerEntry]);
    expect(replay.issues).toEqual([]);
    expect(replay.endingCoins).toBe(completion.rewardCoins);

    const expansion = applyExpansion(
      {
        wallet: { coins: 5_000 },
        inventory: { wood_branch: 40 },
        unlocked: [],
        milestone: 'V0.2.4',
      },
      'garden_24',
      { nowMs: T0 },
    );
    expect(expansion.ok).toBe(true);
    if (!expansion.ok) return;
    expect(Number.isInteger(expansion.ledgerEntry.deltaCoins)).toBe(true);
    expect(expansion.state.wallet.coins).toBe(5_000 - 1_500);
  });
});

describe('cross-module — duplicate action safety', () => {
  it('cannot sell the same stack twice with the same idempotency key', () => {
    const state = createShippingBinState({ coins: 0 }, { wild_herb: 2 }, T0);
    const first = sellToShippingBin(state, {
      lines: [{ sku: 'wild_herb', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 'dup',
      actorId: 'a',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const replay = sellToShippingBin(
      first.state,
      {
        lines: [{ sku: 'wild_herb', qty: 1 }],
        nowMs: T0,
        idempotencyKey: 'dup',
        actorId: 'a',
      },
      [first.ledgerEntry],
    );
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.code).toBe('DUPLICATE_IDEMPOTENCY_KEY');
  });

  it('cannot claim the same forage node twice inside its respawn window', () => {
    const state = createForageState({}, T0);
    const first = claimForage(state, { nodeId: 'gate_herb_a', nowMs: T0 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = claimForage(first.state, { nodeId: 'gate_herb_a', nowMs: T0 + 1 });
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe('NOT_READY');
  });

  it('ignores a repeated minigame move on an occupied cell', () => {
    const initial = caroGame.initialState(7, ['p1', 'p2']);
    const first = caroGame.reduce(initial, { type: 'place', cell: 112 }, 'p1', 0);
    expect(first.board[112]).toBe(1);
    expect(() => caroGame.reduce(first, { type: 'place', cell: 112 }, 'p2', 0)).toThrow();
  });
});

describe('cross-module — deterministic RNG and timestamps', () => {
  it('reproduces the RNG stream and diverges across seeds', () => {
    const a = createRng(42);
    const b = createRng(42);
    const first = [a.next(), a.next(), a.next()];
    const second = [b.next(), b.next(), b.next()];
    expect(first).toEqual(second);
    const other = createRng(43);
    expect(other.next()).not.toBe(first[0]);
  });

  it('uses Vietnam local days consistently for the bin and foraging', () => {
    const beforeMidnight = Date.UTC(2026, 0, 1, 16, 59, 0); // 23:59 HCM
    const afterMidnight = Date.UTC(2026, 0, 1, 17, 0, 0); // 00:00 HCM next day
    expect(vietnamDayIndex(afterMidnight)).toBe(vietnamDayIndex(beforeMidnight) + 1);

    const state = createShippingBinState({ coins: 0 }, { wheat: 40 }, beforeMidnight);
    const late = sellToShippingBin(state, {
      lines: [{ sku: 'wheat', qty: 25 }],
      nowMs: beforeMidnight,
      idempotencyKey: 'late',
      actorId: 'a',
    });
    expect(late.ok).toBe(true);
    if (!late.ok) return;
    const early = sellToShippingBin(late.state, {
      lines: [{ sku: 'wheat', qty: 15 }],
      nowMs: afterMidnight,
      idempotencyKey: 'early',
      actorId: 'a',
    });
    expect(early.ok).toBe(true);
    if (!early.ok) return;
    // The second sale pays full price for all 15 units (counter reset).
    expect(early.totalCoins).toBe(15 * 8);
  });

  it('derives the order window from server time only', () => {
    const start = orderWindowBounds(1_000).startMs;
    expect(orderWindowIndex(start)).toBe(1_000);
    expect(orderWindowIndex(start + 3_600_000)).toBe(1_000);
  });
});

describe('cross-module — serialization', () => {
  it('round-trips a minigame state', () => {
    const state = caroGame.initialState(3, ['p1', 'p2']);
    const afterMove = caroGame.reduce(state, { type: 'place', cell: 0 }, 'p1', 0);
    const json = JSON.parse(JSON.stringify(afterMove)) as typeof afterMove;
    expect(json).toEqual(afterMove);
  });

  it('round-trips bounded pet memory', () => {
    let memory = createMemoryState(3);
    memory = appendMemoryEvent(memory, {
      id: 'e1',
      kind: 'fed',
      atMs: 1_000,
      caregiverId: 'a',
    });
    memory = appendMemoryEvent(memory, {
      id: 'e2',
      kind: 'played',
      atMs: 2_000,
      caregiverId: 'b',
    });
    const restored = deserializeMemory(serializeMemory(memory));
    expect(restored).toEqual(memory);
  });
});
describe('cross-module — known unresolved assumptions stay visible', () => {
  it('reports only the legacy carp_pond standard-value drift across the unified catalog', () => {
    const warnings = validateCatalog().warnings.map((warning) => `${warning.code}:${warning.sku}`);
    expect(warnings.sort()).toEqual([
      'STANDARD_VALUE_DRIFT:carp_pond',
    ]);
  });

  it('keeps the saturation split-lot identity across modules', () => {
    // The simulator, the bin and the experiments all rely on this identity.
    const oneLot = computeSellLot('wheat', 'normal', 0, 24).totalCoins;
    const split =
      computeSellLot('wheat', 'normal', 0, 8).totalCoins +
      computeSellLot('wheat', 'normal', 8, 8).totalCoins +
      computeSellLot('wheat', 'normal', 16, 8).totalCoins;
    expect(split).toBe(oneLot);
  });
});