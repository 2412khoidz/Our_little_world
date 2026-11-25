import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';
import {
  donorPunyTextureForConfig,
  MAY_GAMEPLAY_PUNY_TEXTURE,
  NANG_GAMEPLAY_PUNY_TEXTURE,
  DONOR_PUNY_TEXTURE_IDS,
} from '../../src/game/art/donorPunyAvatarTexture';

describe('Mây & Nắng gameplay rig identity', () => {
  it('pins default couple configs to distinct Puny sheets', () => {
    expect(donorPunyTextureForConfig(DEFAULT_AVATAR_PARTNER_A)).toBe(MAY_GAMEPLAY_PUNY_TEXTURE);
    expect(donorPunyTextureForConfig(DEFAULT_AVATAR_PARTNER_B)).toBe(NANG_GAMEPLAY_PUNY_TEXTURE);
    expect(MAY_GAMEPLAY_PUNY_TEXTURE).toBe(DONOR_PUNY_TEXTURE_IDS.soldierBlue);
    expect(NANG_GAMEPLAY_PUNY_TEXTURE).toBe(DONOR_PUNY_TEXTURE_IDS.soldierRed);
  });
});