import { describe, expect, it } from 'vitest';
import { mulBp } from '../../src/shared/economy/ledgerMath';

describe('PostgreSQL basis-point reference vectors', () => {
  it('uses the same results and safe-product boundary', () => {
    expect(mulBp(0, 10000)).toBe(0);
    expect(mulBp(5, 15500)).toBe(7);
    expect(mulBp(9999, 7000)).toBe(6999);
    expect(mulBp(900719925474, 10000)).toBe(900719925474);
    expect(() => mulBp(900719925475, 10000)).toThrow();
  });
});
