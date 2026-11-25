import { describe, expect, it } from 'vitest';
import { resolvePetShopCareMode, selectPetShopCareFace } from '../../src/shared/donor/pet-shop-j4lpan/petShopCareFace';
import type { PetVitals } from '../../src/shared/pet/petTypes';

const baseVitals: PetVitals = { hunger: 70, energy: 70, fun: 70 };

describe('selectPetShopCareFace (pet-shop donor)', () => {
  it('shows heart eyes when vuốt ve flash is active', () => {
    const face = selectPetShopCareFace({
      mood: 'cozy',
      vitals: baseVitals,
      careMode: 'pet',
    });
    expect(face.eyes).toBe('hearts');
    expect(face.mouth).toBe('smile');
    expect(face.tailWagBoost).toBe(true);
  });

  it('maps hungry mood to angry eyes', () => {
    const face = selectPetShopCareFace({
      mood: 'hungry',
      vitals: { ...baseVitals, hunger: 38 },
      careMode: 'idle',
    });
    expect(face.eyes).toBe('angry');
    expect(face.mouth).toBe('grumpy');
  });

  it('uses tongue mouth during early feed flash', () => {
    const face = selectPetShopCareFace({
      mood: 'happy',
      vitals: baseVitals,
      careMode: 'feed',
      feedEatPhase: true,
    });
    expect(face.mouth).toBe('tongue');
  });
});

describe('resolvePetShopCareMode', () => {
  it('expires care flash after window', () => {
    expect(resolvePetShopCareMode('pet', 1_000, 4_000)).toBe('idle');
    expect(resolvePetShopCareMode('feed', 1_000, 2_000)).toBe('feed');
  });
});