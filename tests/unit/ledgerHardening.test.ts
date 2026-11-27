/**
 * P0 — Ledger correctness regressions.
 *
 * Each case reproduces a counterexample from the independent GPT review
 * (docs/research/GPT_INTEGRATION_REVIEW.md, SHA 5eda187) against the current
 * implementation. They are written BEFORE the fix so the failure is proven.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_COINS,
  MAX_ITEM_QTY,
  MAX_PRICE_BP,
  applyItemDelta,
  applyLedgerEntry,
  createWallet,
  inventoryQty,
  mulBp,
  replayLedger,
  signedDelta,
  type CoinLedgerEntry,
  type LedgerKind,
} from '../../src/shared/economy/ledgerMath';

function entry(kind: LedgerKind, deltaCoins: number, key: string): CoinLedgerEntry {
  return {
    id: `e-${key}`,
    kind,
    deltaCoins,
    reason: 'test',
    idempotencyKey: key,
    createdAt: 0,
  };
}

describe('P0 — inventory overflow (GPT counterexample)', () => {
  it('rejects a quantity that would exceed the PostgreSQL int4 range', () => {
    const start = { wheat: MAX_ITEM_QTY - 1 };
    expect(() => applyItemDelta(start, { wheat: 2 })).toThrow(/INVENTORY_OVERFLOW/);
  });

  it('accepts exactly the int4 maximum', () => {
    expect(inventoryQty(applyItemDelta({}, { wheat: MAX_ITEM_QTY }), 'wheat')).toBe(MAX_ITEM_QTY);
  });

  it('rejects a single delta above the int4 range', () => {
    expect(() => applyItemDelta({}, { wheat: MAX_ITEM_QTY + 1 })).toThrow(/INVENTORY_OVERFLOW/);
  });
});

describe('P0 — wallet cap', () => {
  it('rejects earning past the domain coin cap', () => {
    const wallet = createWallet(MAX_COINS);
    expect(() => applyLedgerEntry(wallet, entry('earn', 1, 'a'))).toThrow(/WALLET_OVERFLOW/);
  });

  it('rejects an initial balance above the cap', () => {
    expect(() => createWallet(MAX_COINS + 1)).toThrow(/WALLET_OVERFLOW/);
  });
});

describe('P0 — basis-point domain', () => {
  it('rejects negative basis points instead of producing negative money', () => {
    expect(() => mulBp(100, -5_000)).toThrow(/INVALID_BP/);
  });

  it('rejects absurd multipliers', () => {
    expect(() => mulBp(100, MAX_PRICE_BP + 1)).toThrow(/INVALID_BP/);
  });

  it('still accepts the real multiplier range', () => {
    expect(mulBp(100, 0)).toBe(0);
    expect(mulBp(100, 15_500)).toBe(155);
    expect(mulBp(100, MAX_PRICE_BP)).toBe(10_000);
  });
});

describe('P0 — ledger kind validation', () => {
  it('rejects an unknown kind instead of treating it as income', () => {
    const forged = { ...entry('earn', 10, 'k'), kind: 'bonus' as never };
    expect(() => applyLedgerEntry(createWallet(10), forged)).toThrow(/INVALID_LEDGER_KIND/);
    expect(() => signedDelta(forged)).toThrow(/INVALID_LEDGER_KIND/);
  });
});

describe('P0 — replay exactness near the cap', () => {
  it('keeps the wallet identity exact at a very high balance', () => {
    const start = MAX_COINS - 10;
    const summary = replayLedger(start, [entry('spend', 5, 'a'), entry('earn', 5, 'b')]);
    expect(summary.endingCoins).toBe(start);
    expect(summary.issues).toEqual([]);
  });

  it('reports an entry that would overflow instead of drifting silently', () => {
    const summary = replayLedger(MAX_COINS, [
      entry('earn', 10, 'over'),
      entry('spend', 10, 'ok'),
    ]);
    expect(summary.endingCoins).toBe(MAX_COINS - 10);
    expect(summary.totalEarned).toBe(0);
    expect(summary.issues.some((issue) => issue.includes('WALLET_OVERFLOW'))).toBe(true);
  });

  it('exposes a PostgreSQL-compatible integer contract', () => {
    // inventory_items.qty is `integer` (int4); coins are kept far below 2^53.
    expect(MAX_ITEM_QTY).toBe(2_147_483_647);
    expect(MAX_COINS).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    // Must allow the 2.0x restaurant ceiling with headroom.
    expect(MAX_PRICE_BP).toBeGreaterThanOrEqual(20_000);
  });
});
