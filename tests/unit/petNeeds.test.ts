import { describe, expect, it } from 'vitest';
import {
  applyPetActionVitals,
  computePetVitalsAt,
  derivePetMood,
  getPetActionCooldownRemainingMs,
  PET_STAT_FLOOR,
} from '../../src/shared/pet/petNeeds';

const HOUR = 3_600_000;

describe('V0.1.5 Pet Needs & Offline Catch-up (OLW-015-03)', () => {
  it('computes deterministic non-lethal vitals at 0h, 8h, 12h, 48h and caps 720h identically to 48h', () => {
    const start = 1_700_000_000_000;
    const initial = { hunger: 100, energy: 100, fun: 100 };

    expect(computePetVitalsAt(initial, start, start)).toEqual({ hunger: 100, energy: 100, fun: 100 });

    const at12h = computePetVitalsAt(initial, start, start + 12 * HOUR);
    expect(at12h).toEqual({ hunger: 76, energy: 88, fun: 88 });

    const at48h = computePetVitalsAt(initial, start, start + 48 * HOUR);
    const at720h = computePetVitalsAt(initial, start, start + 720 * HOUR);
    expect(at48h).toEqual(at720h);
    expect(at48h.hunger).toBe(PET_STAT_FLOOR);
    expect(at48h.energy).toBe(52);
    expect(at48h.fun).toBe(52);
  });

  it('recovers energy to at least 50 when absent 8h+ even if exhausted beforehand', () => {
    const start = 1_700_000_000_000;
    const tired = { hunger: 50, energy: 32, fun: 60 };
    const after8h = computePetVitalsAt(tired, start, start + 8 * HOUR);
    expect(after8h.energy).toBe(50);
    expect(after8h.hunger).toBe(34);
    expect(after8h.fun).toBe(52);
  });

  it('clamps interaction gains at 100 and derives accurate cooldowns & mood', () => {
    const fed = applyPetActionVitals({ hunger: 85, energy: 98, fun: 97 }, 'feed');
    expect(fed).toEqual({ hunger: 100, energy: 100, fun: 100 });
    expect(derivePetMood(fed)).toBe('happy');
    expect(derivePetMood({ hunger: 35, energy: 80, fun: 80 })).toBe('hungry');

    const now = 1_700_000_000_000;
    expect(getPetActionCooldownRemainingMs('feed', now - 10_000, now)).toBe(50_000);
    expect(getPetActionCooldownRemainingMs('feed', now - 65_000, now)).toBe(0);
  });
});
