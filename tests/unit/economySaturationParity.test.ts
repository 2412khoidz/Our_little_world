import { describe, expect, it } from 'vitest';
import { saturationMultiplierBp } from '../../src/shared/economy/ledgerMath.ts';

/** Mirrors public._economy_saturation_mul_bp default args in migration 01100. */
function sqlSaturationBp(unitIndex: number, threshold = 20, stepBp = 250, floorBp = 7000): number {
  if (unitIndex < threshold) return 10_000;
  return Math.max(floorBp, 10_000 - stepBp * (unitIndex - threshold + 1));
}

describe('economy saturation TS/SQL parity vectors', () => {
  const indices = [0, 19, 20, 21, 40, 100];

  it.each(indices)('unit index %i', (unitIndex) => {
    expect(saturationMultiplierBp(unitIndex, { threshold: 20, stepBp: 250, floorBp: 7000 })).toBe(
      sqlSaturationBp(unitIndex),
    );
  });
});