import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';
import { getAvatarTextureKey } from '../../src/game/art/avatarSpriteBuilder';
import { selectRigForHairStyle } from '../../src/game/art/avatarPalette';
import { isCozyHumanAvatarTexture, isDonorPunyAvatarTexture } from '../../src/game/art/phaserAvatarTexture';

describe('Mây & Nắng gameplay rig identity (Cozy Human V2)', () => {
  it('assigns distinct male/female rigs and texture keys for Mây & Nắng matching wardrobe', () => {
    const keyA = getAvatarTextureKey(DEFAULT_AVATAR_PARTNER_A);
    const keyB = getAvatarTextureKey(DEFAULT_AVATAR_PARTNER_B);

    expect(selectRigForHairStyle(DEFAULT_AVATAR_PARTNER_A.hairStyle)).toBe('adam');
    expect(selectRigForHairStyle(DEFAULT_AVATAR_PARTNER_B.hairStyle)).toBe('amelia');
    expect(keyA).not.toBe(keyB);
    expect(isCozyHumanAvatarTexture(keyA)).toBe(true);
    expect(isCozyHumanAvatarTexture(keyB)).toBe(true);
    expect(isDonorPunyAvatarTexture(keyA)).toBe(false);
  });
});
