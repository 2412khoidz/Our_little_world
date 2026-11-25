import { describe, expect, it } from 'vitest';
import {
  createDonorPetAutonomyState,
  donorCarePhysicalSeed,
  tickDonorPetAutonomy,
} from '../../src/shared/petLiving/donor/donorPetCareAutonomy';

describe('donorPetCareAutonomy', () => {
  it('enters sleep posture when fun is low', () => {
    const physical = { ...donorCarePhysicalSeed(), fun: 30, hunger: 20 };
    const autonomy = createDonorPetAutonomyState();
    const res = tickDonorPetAutonomy(physical, autonomy, 1_000, 2000);
    expect(res.autonomy.posture).toBe('sleep');
    expect(res.anim).toBe('sleep');
  });

  it('chases toy when lonely with empty bowl', () => {
    const physical = {
      ...donorCarePhysicalSeed(),
      fun: 20,
      hunger: 60,
      foodBowl: { foodSku: null, foodQuality: 'normal' as const, portions: 0 },
    };
    const res = tickDonorPetAutonomy(physical, createDonorPetAutonomyState(), 2_000, 2000);
    expect(res.autonomy.posture).toBe('chase_toy');
  });
});