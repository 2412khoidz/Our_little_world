import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';
import {
  donorGameplayTextureForConfig,
  MAY_GAMEPLAY_PYDEW_TEXTURE,
  NANG_GAMEPLAY_PYDEW_TEXTURE,
  DONOR_PYDEW_TEXTURE_IDS,
} from '../../src/game/art/donorPydewFarmerAvatarTexture';

describe('Mây & Nắng gameplay rig identity', () => {
  it('pins default couple configs to PyDew farmer atlases (not Puny)', () => {
    expect(donorGameplayTextureForConfig(DEFAULT_AVATAR_PARTNER_A)).toBe(MAY_GAMEPLAY_PYDEW_TEXTURE);
    expect(donorGameplayTextureForConfig(DEFAULT_AVATAR_PARTNER_B)).toBe(NANG_GAMEPLAY_PYDEW_TEXTURE);
    expect(MAY_GAMEPLAY_PYDEW_TEXTURE).toBe(DONOR_PYDEW_TEXTURE_IDS.may);
    expect(NANG_GAMEPLAY_PYDEW_TEXTURE).toBe(DONOR_PYDEW_TEXTURE_IDS.nang);
  });
});