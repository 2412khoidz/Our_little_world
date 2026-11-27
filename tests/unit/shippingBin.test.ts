import { describe, expect, it } from 'vitest';
import { computeSellLot, requireItem } from '../../src/shared/economy/catalogConfig';
import { replayLedger } from '../../src/shared/economy/ledgerMath';
import {
  buildShippingBinTransaction,
  createShippingBinState,
  DAY_MS,
  quoteShippingBinSale,
  sellToShippingBin,
  vietnamDayIndex,
} from '../../src/shared/economy/shippingBin';
import {
  claimForage,
  createForageState,
  FORAGE_NODES,
  remainingForageToday,
} from '../../src/shared/economy/forage';

const T0 = Date.UTC(2026, 0, 1, 1, 0, 0); // 08:00 Asia/Ho_Chi_Minh

function bin(walletCoins: number, inventory: Record<string, number> = {}, nowMs = T0) {
  return createShippingBinState(
    { coins: walletCoins },
    inventory,
    nowMs,
  );
}

describe('shipping bin — pricing', () => {
  it('sells one herb for its base price and updates wallet + inventory', () => {
    const state = bin(0, { wild_herb: 2 });
    const result = sellToShippingBin(state, {
      lines: [{ sku: 'wild_herb', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 'k1',
      actorId: 'a',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalCoins).toBe(5);
    expect(result.state.wallet.coins).toBe(5);
    expect(result.state.inventory.wild_herb).toBe(1);
  });

  it('supports several stacks in one transaction and sums the total', () => {
    const state = bin(0, { wild_herb: 2, wood_branch: 1 });
    const quote = quoteShippingBinSale(state, [
      { sku: 'wild_herb', qty: 2 },
      { sku: 'wood_branch', qty: 1 },
    ]);
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.totalCoins).toBe(5 * 2 + 6);
    expect(quote.lines).toHaveLength(2);
  });

  it('applies quality multipliers only where the item allows them', () => {
    const state = bin(0, { wheat: 1, seed_wheat: 1 });
    const wheatGold = quoteShippingBinSale(state, [{ sku: 'wheat', qty: 1, quality: 'gold' }]);
    expect(wheatGold.ok && wheatGold.totalCoins).toBe(12); // floor(8 * 1.55)

    const seedGold = quoteShippingBinSale(state, [{ sku: 'seed_wheat', qty: 1, quality: 'gold' }]);
    expect(seedGold.ok).toBe(false);
    if (seedGold.ok) return;
    expect(seedGold.code).toBe('INVALID_QUALITY');
  });

  it('applies soft saturation across a big lot exactly like computeSellLot', () => {
    const state = bin(0, { wheat: 30 });
    const result = sellToShippingBin(state, {
      lines: [{ sku: 'wheat', qty: 25 }],
      nowMs: T0,
      idempotencyKey: 'big',
      actorId: 'a',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalCoins).toBe(computeSellLot('wheat', 'normal', 0, 25).totalCoins);
    expect(result.totalCoins).toBe(195); // 20 x 8c + 5 x 7c
  });

  it('is order independent for the same basket (best quality takes the cheapest slots)', () => {
    const state = bin(0, { wheat: 4 });
    const forward = quoteShippingBinSale(state, [
      { sku: 'wheat', qty: 2, quality: 'normal' },
      { sku: 'wheat', qty: 2, quality: 'gold' },
    ]);
    const reversed = quoteShippingBinSale(state, [
      { sku: 'wheat', qty: 2, quality: 'gold' },
      { sku: 'wheat', qty: 2, quality: 'normal' },
    ]);
    expect(forward.ok && reversed.ok).toBe(true);
    if (!forward.ok || !reversed.ok) return;
    expect(forward.totalCoins).toBe(2 * 12 + 2 * 8);
    expect(reversed.totalCoins).toBe(forward.totalCoins);
    expect(forward.lines[0]?.quality).toBe('gold');
  });

  it('never rounds in aggregate: total is the sum of per-unit floors', () => {
    const state = bin(0, { strawberry: 7 });
    const quote = quoteShippingBinSale(state, [{ sku: 'strawberry', qty: 7, quality: 'silver' }]);
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    const line = quote.lines[0];
    const sum = line?.unitCoins.reduce((total, coins) => total + coins, 0);
    expect(quote.totalCoins).toBe(sum);
  });

  it('matches the documented order-channel multipliers when a demand box is used', () => {
    // The bin always pays 1.0x; this asserts the catalog's demand hook is opt-in.
    const state = bin(0, { wheat: 1 });
    const quote = quoteShippingBinSale(state, [{ sku: 'wheat', qty: 1 }]);
    expect(quote.ok && quote.totalCoins).toBe(8);
    expect(requireItem('wheat').orderMultiplierBp).toBe(14_000);
  });
});

describe('shipping bin — validation and retry safety', () => {
  it('rejects an empty sale', () => {
    const result = sellToShippingBin(bin(0, {}), {
      lines: [],
      nowMs: T0,
      idempotencyKey: 'empty',
      actorId: 'a',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('EMPTY_SALE');
  });

  it.each([0, -1, 1.5])('rejects an invalid quantity (%s)', (qty) => {
    const result = sellToShippingBin(bin(0, { wild_herb: 3 }), {
      lines: [{ sku: 'wild_herb', qty }],
      nowMs: T0,
      idempotencyKey: 'q',
      actorId: 'a',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_QTY');
  });

  it('rejects selling more than the inventory holds and leaves state untouched', () => {
    const state = bin(7, { wild_herb: 1 });
    const result = sellToShippingBin(state, {
      lines: [{ sku: 'wild_herb', qty: 2 }],
      nowMs: T0,
      idempotencyKey: 'over',
      actorId: 'a',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INSUFFICIENT_ITEMS');
    expect(state.wallet.coins).toBe(7);
    expect(state.inventory.wild_herb).toBe(1);
  });

  it('rejects unknown, unsellable and duplicated lines', () => {
    const state = bin(0, { bait_free_worm: 1, wild_herb: 2 });
    const unknown = sellToShippingBin(state, {
      lines: [{ sku: 'not_an_item', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 'u',
      actorId: 'a',
    });
    expect(unknown.ok === false && unknown.code).toBe('UNKNOWN_SKU');

    const unsellable = sellToShippingBin(state, {
      lines: [{ sku: 'bait_free_worm', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 's',
      actorId: 'a',
    });
    expect(unsellable.ok === false && unsellable.code).toBe('NOT_SELLABLE');

    const duplicate = sellToShippingBin(state, {
      lines: [
        { sku: 'wild_herb', qty: 1 },
        { sku: 'wild_herb', qty: 1 },
      ],
      nowMs: T0,
      idempotencyKey: 'd',
      actorId: 'a',
    });
    expect(duplicate.ok === false && duplicate.code).toBe('DUPLICATE_LINE');
  });

  it('rejects a replayed idempotency key instead of paying twice', () => {
    const state = bin(0, { wild_herb: 2 });
    const first = sellToShippingBin(state, {
      lines: [{ sku: 'wild_herb', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 'same-key',
      actorId: 'a',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const replay = sellToShippingBin(first.state, {
      lines: [{ sku: 'wild_herb', qty: 1 }],
      nowMs: T0,
      idempotencyKey: 'same-key',
      actorId: 'a',
    }, [first.ledgerEntry]);
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.code).toBe('DUPLICATE_IDEMPOTENCY_KEY');
  });

  it('keeps the ledger invariant after a sale', () => {
    const state = bin(10, { wild_herb: 3 });
    const result = sellToShippingBin(state, {
      lines: [{ sku: 'wild_herb', qty: 2 }],
      nowMs: T0,
      idempotencyKey: 'inv',
      actorId: 'a',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const replay = replayLedger(10, [result.ledgerEntry]);
    expect(replay.issues).toEqual([]);
    expect(replay.endingCoins).toBe(result.state.wallet.coins);
    expect(result.ledgerEntry.reason).toBe('sell_bin');
  });

  it('resets saturation on the next local day', () => {
    const day0 = bin(0, { wheat: 50 }, T0);
    const first = sellToShippingBin(day0, {
      lines: [{ sku: 'wheat', qty: 25 }],
      nowMs: T0,
      idempotencyKey: 'day0',
      actorId: 'a',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.totalCoins).toBe(195);

    const t1 = T0 + DAY_MS;
    const second = sellToShippingBin(first.state, {
      lines: [{ sku: 'wheat', qty: 25 }],
      nowMs: t1,
      idempotencyKey: 'day1',
      actorId: 'a',
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(vietnamDayIndex(t1)).toBe(vietnamDayIndex(T0) + 1);
    expect(second.totalCoins).toBe(195); // full price again, counters reset
  });

  it('builds a canonical RPC payload without any client price', () => {
    const transaction = buildShippingBinTransaction({
      worldId: 'world-1',
      actorId: 'user-1',
      idempotencyKey: 'rpc-1',
      lines: [{ sku: 'wheat', qty: 3, quality: 'silver' }],
      clientSentAtMs: T0,
    });
    expect(transaction.action).toBe('sell_bin');
    expect(transaction.lines).toEqual([{ sku: 'wheat', qty: 3, quality: 'silver' }]);
    expect(JSON.stringify(transaction)).not.toMatch(/price|coins/i);
  });
});

describe('foraging — zero wallet recovery path', () => {
  it('claims one herb, then refuses until the respawn window passes', () => {
    const state = createForageState({}, T0);
    const first = claimForage(state, { nodeId: 'gate_herb_a', nowMs: T0 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.item).toEqual({ sku: 'wild_herb', qty: 1 });
    expect(first.state.inventory.wild_herb).toBe(1);

    const tooEarly = claimForage(first.state, { nodeId: 'gate_herb_a', nowMs: T0 + 1_000 });
    expect(tooEarly.ok).toBe(false);
    if (tooEarly.ok) return;
    expect(tooEarly.code).toBe('NOT_READY');

    const ready = claimForage(first.state, {
      nodeId: 'gate_herb_a',
      nowMs: T0 + 180_000,
    });
    expect(ready.ok).toBe(true);
  });

  it('caps claims per node per day and resets on the next day', () => {
    const definition = FORAGE_NODES[0];
    if (!definition) throw new Error('missing node fixture');
    let state = createForageState({}, T0);
    for (let index = 0; index < definition.dailyCap; index += 1) {
      const result = claimForage(state, {
        nodeId: definition.nodeId,
        nowMs: T0 + index * definition.respawnMs,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }
    const capped = claimForage(state, {
      nodeId: definition.nodeId,
      nowMs: T0 + definition.dailyCap * definition.respawnMs,
    });
    expect(capped.ok).toBe(false);
    if (capped.ok) return;
    expect(capped.code).toBe('DAILY_CAP');

    const nextDay = claimForage(state, {
      nodeId: definition.nodeId,
      nowMs: T0 + DAY_MS,
    });
    expect(nextDay.ok).toBe(true);
    expect(remainingForageToday(state)).toBe(
      FORAGE_NODES.reduce((sum, node) => sum + node.dailyCap, 0) - definition.dailyCap,
    );
  });

  it('rejects an unknown node', () => {
    const result = claimForage(createForageState({}, T0), { nodeId: 'nope', nowMs: T0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNKNOWN_NODE');
  });

  it('recovers a completely empty wallet: forage then sell for a wheat seed', () => {
    const empty = createShippingBinState({ coins: 0 }, {}, T0);
    const forage = createForageState(empty.inventory, T0);
    const claimed = claimForage(forage, { nodeId: 'gate_herb_a', nowMs: T0 });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;

    const sale = sellToShippingBin(
      { ...empty, inventory: claimed.state.inventory },
      {
        lines: [{ sku: 'wild_herb', qty: 1 }],
        nowMs: T0 + 60_000,
        idempotencyKey: 'recovery',
        actorId: 'a',
      },
    );
    expect(sale.ok).toBe(true);
    if (!sale.ok) return;
    expect(sale.state.wallet.coins).toBeGreaterThanOrEqual(
      requireItem('seed_wheat').storeBuy ?? 0,
    );
  });
});
