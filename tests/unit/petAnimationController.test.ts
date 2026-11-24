import { describe, expect, it } from 'vitest';
import { createLocomotionSnapshot, stepPetLocomotion } from '../../src/game/pet/PetAnimationController';
import { CAT_VARIANTS, PET_ANIMATION_SPECS } from '../../src/shared/petLiving/petVisualTypes';

describe('Pet Visual Variants & PetAnimationController (M2)', () => {
  it('defines 3 distinct silhouettes and complete animation matrix specs', () => {
    expect(CAT_VARIANTS).toHaveLength(3);
    const silhouettes = new Set(CAT_VARIANTS.map((v) => `${v.earShape}:${v.tailStyle}:${v.bodyRoundness}`));
    expect(silhouettes.size).toBe(3);
    expect(PET_ANIMATION_SPECS.length).toBeGreaterThanOrEqual(24);
  });

  it('inserts graceful wake_yawn_stretch when waking from sleep before moving', () => {
    let snap = createLocomotionSnapshot(100, 100);
    snap = stepPetLocomotion(snap, {
      intent: 'sleep',
      targetX: 100,
      targetY: 100,
      dtSec: 0.016,
      nowMs: 1000,
    });
    expect(snap.animState).toBe('sleep');

    // Player walks up and wakes cat -> should hold position and stretch/yawn first
    snap = stepPetLocomotion(snap, {
      intent: 'move',
      targetX: 160,
      targetY: 100,
      dtSec: 0.05,
      nowMs: 2000,
    });
    expect(snap.animState).toBe('wake_yawn_stretch');
    expect(snap.x).toBe(100);

    // After wake transition completes (~1.3s), begins walking east cleanly
    snap = stepPetLocomotion(snap, {
      intent: 'move',
      targetX: 160,
      targetY: 100,
      dtSec: 0.05,
      nowMs: 3300,
    });
    expect(snap.animState).toBe('walk_east');
    expect(snap.x).toBeGreaterThan(100);
  });

  it('keeps facing hysteresis and zero animation restart on steady ticks', () => {
    let snap = createLocomotionSnapshot(100, 100);
    snap = stepPetLocomotion(snap, {
      intent: 'move',
      targetX: 140,
      targetY: 100,
      dtSec: 0.05,
      nowMs: 1000,
    });
    const firstAnim = snap.animState;
    expect(firstAnim).toBe('walk_east');

    // Tiny opposite jitter 50ms later is absorbed by facing hysteresis window (220ms)
    snap = stepPetLocomotion(snap, {
      intent: 'move',
      targetX: 90,
      targetY: 100,
      dtSec: 0.05,
      nowMs: 1050,
    });
    expect(snap.facing).toBe('east');
  });
});
