import { describe, expect, it } from 'vitest';
import type { PetLivingAuthoritySnapshot } from '../../src/shared/petLiving/petAuthorityTypes';

describe('pet living authority types', () => {
  it('snapshot shape matches server JSON contract', () => {
    const snap: PetLivingAuthoritySnapshot = {
      worldId: 'w',
      petId: 'p',
      livingVersion: 2,
      serverNowMs: 1_700_000_000_000,
      personalityJson: { profileId: 'mischievous_quyt' },
      brainStateJson: null,
      activeAction: null,
      pendingOffers: [],
      recentMemory: [],
      bowl: {
        version: 1,
        foodPortions: 0,
        foodSku: null,
        foodQuality: null,
        waterVolume: 60,
      },
      pet: null,
    };
    expect(snap.livingVersion).toBe(2);
    expect(snap.bowl.foodPortions).toBe(0);
  });
});