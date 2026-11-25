import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/shared/rng';
import { resolveMeadowbrookCatch, MEADOWBROOK_MIN_CATCH_SCORE } from '../../src/shared/donor/webfarmville-c420bc2/meadowbrookNatureCatch';

describe('donor meadowbrook catch', () => {
  it('always escapes when score below minimum', () => {
    const rng = createRng(12345);
    const result = resolveMeadowbrookCatch({
      kind: 'fish',
      score: MEADOWBROOK_MIN_CATCH_SCORE - 1,
      hour: 14,
      nowMs: 1_700_000_000_000,
      rng01: () => rng.next(),
    });
    expect(result.escaped).toBe(true);
  });

  it('returns fish metadata when score is high', () => {
    const rng = createRng(54321);
    const result = resolveMeadowbrookCatch({
      kind: 'fish',
      score: 95,
      hour: 14,
      nowMs: 1_700_000_000_000,
      rng01: () => rng.next(),
    });
    expect(result.critterId).toBeTruthy();
    expect(result.critterName).toBeTruthy();
  });
});