import { describe, expect, it } from 'vitest';
import {
  addToInventory,
  applyItemDelta,
  applyLedgerEntry,
  canAfford,
  createWallet,
  divFloor,
  hasIdempotencyKey,
  inventoryQty,
  inventoryTotal,
  mulBp,
  qualityMultiplierBp,
  removeFromInventory,
  replayLedger,
  saturationMultiplierBp,
  signedDelta,
  type CoinLedgerEntry,
  type LedgerKind,
} from '../../src/shared/economy/ledgerMath';

function entry(
  kind: LedgerKind,
  deltaCoins: number,
  reason: string,
  idempotencyKey: string,
): CoinLedgerEntry {
  return {
    id: `entry-${idempotencyKey}`,
    kind,
    deltaCoins,
    reason,
    idempotencyKey,
    createdAt: 1_700_000_000_000,
  };
}

describe('basis-point math', () => {
  it('floors every multiplication', () => {
    expect(mulBp(1_000, 15_000)).toBe(1_500);
    expect(mulBp(3, 5_000)).toBe(1); // 1.5 -> 1
    expect(mulBp(0, 15_000)).toBe(0);
    expect(mulBp(99, 9_900)).toBe(98); // 98.01 -> 98
    expect(divFloor(7, 2)).toBe(3);
    expect(divFloor(8, 2)).toBe(4);
  });

  it('rejects negative or fractional money inputs', () => {
    expect(() => mulBp(-1, 10_000)).toThrow(/NEGATIVE_AMOUNT/);
    expect(() => mulBp(1.5, 10_000)).toThrow(/UNSAFE_ARITHMETIC/);
    expect(() => mulBp(10, 10_000.5)).toThrow(/UNSAFE_ARITHMETIC/);
    expect(() => divFloor(10, 0)).toThrow(/UNSAFE_ARITHMETIC/);
  });

  it('maps quality tiers to the documented multipliers', () => {
    expect(qualityMultiplierBp('normal')).toBe(10_000);
    expect(qualityMultiplierBp('silver')).toBe(12_500);
    expect(qualityMultiplierBp('gold')).toBe(15_500);
    expect(qualityMultiplierBp(null)).toBe(10_000);
  });

  it('ramps soft saturation down from the threshold to the floor', () => {
    expect(saturationMultiplierBp(0)).toBe(10_000);
    expect(saturationMultiplierBp(19)).toBe(10_000);
    expect(saturationMultiplierBp(20)).toBe(9_900);
    expect(saturationMultiplierBp(21)).toBe(9_800);
    expect(saturationMultiplierBp(49)).toBe(7_000);
    expect(saturationMultiplierBp(5_000)).toBe(7_000);
  });

  it('rejects an invalid saturation configuration', () => {
    expect(() => saturationMultiplierBp(-1)).toThrow(/INVALID_SATURATION_CONFIG/);
    expect(() =>
      saturationMultiplierBp(0, { threshold: -1, stepBp: 100, floorBp: 7_000 }),
    ).toThrow(/INVALID_SATURATION_CONFIG/);
    expect(() =>
      saturationMultiplierBp(0, { threshold: 20, stepBp: 100, floorBp: 12_000 }),
    ).toThrow(/INVALID_SATURATION_CONFIG/);
  });
});

describe('wallet ledger', () => {
  it('applies earn/grant/spend with integer math', () => {
    let wallet = createWallet(100);
    wallet = applyLedgerEntry(wallet, entry('earn', 20, 'sell_bin', 'a'));
    wallet = applyLedgerEntry(wallet, entry('grant', 5, 'minigame_reward', 'b'));
    wallet = applyLedgerEntry(wallet, entry('spend', 30, 'buy_seed', 'c'));
    expect(wallet.coins).toBe(95);
  });

  it('never allows an overdraft', () => {
    const wallet = createWallet(10);
    expect(() => applyLedgerEntry(wallet, entry('spend', 11, 'buy_seed', 'd'))).toThrow(
      /INSUFFICIENT_FUNDS/,
    );
    expect(applyLedgerEntry(wallet, entry('spend', 10, 'buy_seed', 'e')).coins).toBe(0);
  });

  it('rejects invalid entries', () => {
    const wallet = createWallet(10);
    expect(() => applyLedgerEntry(wallet, entry('earn', 0, 'x', 'f'))).toThrow(/NEGATIVE_AMOUNT/);
    expect(() => applyLedgerEntry(wallet, entry('earn', 1.5, 'x', 'g'))).toThrow(
      /NON_INTEGER_MONEY/,
    );
    expect(() => createWallet(-1)).toThrow(/NEGATIVE_AMOUNT/);
  });

  it('computes signed deltas and affordability', () => {
    expect(signedDelta(entry('earn', 5, 'r', 'k'))).toBe(5);
    expect(signedDelta(entry('grant', 5, 'r', 'k'))).toBe(5);
    expect(signedDelta(entry('spend', 5, 'r', 'k'))).toBe(-5);
    expect(canAfford(createWallet(5), 5)).toBe(true);
    expect(canAfford(createWallet(5), 6)).toBe(false);
  });
});

describe('shared inventory math', () => {
  it('adds, removes and prunes zero rows', () => {
    let inventory = addToInventory({}, 'wheat', 3);
    expect(inventory).toEqual({ wheat: 3 });
    inventory = addToInventory(inventory, 'wheat', 2);
    expect(inventory.wheat).toBe(5);
    inventory = removeFromInventory(inventory, 'wheat', 5);
    expect(inventory).toEqual({});
    expect(inventoryQty(inventory, 'wheat')).toBe(0);
  });

  it('refuses to remove items that are not there', () => {
    expect(() => removeFromInventory({ wheat: 1 }, 'wheat', 2)).toThrow(/INSUFFICIENT_ITEMS/);
    expect(() => removeFromInventory({}, 'carrot', 1)).toThrow(/INSUFFICIENT_ITEMS/);
  });

  it('applies a multi-SKU delta atomically in one call', () => {
    const inventory = applyItemDelta({ wheat: 4, carrot: 2 }, { wheat: -2, carrot: -1, tomato: 3 });
    expect(inventory).toEqual({ wheat: 2, carrot: 1, tomato: 3 });
    expect(inventoryTotal(inventory)).toBe(6);
    expect(() => applyItemDelta({ wheat: 1 }, { wheat: -2 })).toThrow(/INSUFFICIENT_ITEMS/);
  });
});

describe('ledger replay invariants', () => {
  it('recomputes the wallet as start + earned + granted − spent', () => {
    const summary = replayLedger(100, [
      entry('earn', 20, 'sell_bin', 'a'),
      entry('grant', 5, 'minigame_reward', 'b'),
      entry('spend', 30, 'buy_seed', 'c'),
      entry('earn', 15, 'sell_bin', 'd'),
    ]);
    expect(summary.endingCoins).toBe(110);
    expect(summary.totalEarned).toBe(35);
    expect(summary.totalGranted).toBe(5);
    expect(summary.totalSpent).toBe(30);
    expect(summary.sources).toEqual({ sell_bin: 35, minigame_reward: 5 });
    expect(summary.sinks).toEqual({ buy_seed: 30 });
    expect(summary.issues).toEqual([]);
  });

  it('flags duplicate idempotency keys and does not double apply', () => {
    const summary = replayLedger(0, [
      entry('earn', 10, 'sell_bin', 'same-key'),
      entry('earn', 10, 'sell_bin', 'same-key'),
    ]);
    expect(summary.endingCoins).toBe(10);
    expect(summary.issues.some((issue) => issue.includes('trùng idempotencyKey'))).toBe(true);
    expect(hasIdempotencyKey([entry('earn', 1, 'r', 'x')], 'x')).toBe(true);
    expect(hasIdempotencyKey([entry('earn', 1, 'r', 'x')], 'y')).toBe(false);
  });

  it('reports an overdraw as an issue and keeps the invariant intact', () => {
    const summary = replayLedger(10, [
      entry('spend', 50, 'buy_seed', 'over'),
      entry('earn', 5, 'sell_bin', 'ok'),
    ]);
    expect(summary.endingCoins).toBe(15);
    expect(summary.totalSpent).toBe(0);
    expect(summary.issues).toHaveLength(1);
    expect(summary.issues[0]).toMatch(/INSUFFICIENT_FUNDS/);
  });
});
