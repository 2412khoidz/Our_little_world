import { describe, expect, it } from 'vitest';
import { AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED } from '../../src/shared/assets/avatarGameplayPolicy';
import { olwAssetRegistryPolicy, OLW_ASSET_REGISTRY } from '../../src/shared/assets/olwAssetRegistry';
import { buildAvatarSpritesheetCanvas } from '../../src/game/art/avatarSpriteBuilder';
import { DEFAULT_AVATAR_PARTNER_A } from '../../src/shared/avatar';

describe('avatar gameplay policy', () => {
  it('bans diagonal alpha composite on procedural fallback sheet', () => {
    expect(AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED).toBe(true);
    expect(olwAssetRegistryPolicy().diagonalAlphaCompositeBanned).toBe(true);
    const sheet = buildAvatarSpritesheetCanvas(DEFAULT_AVATAR_PARTNER_A);
    expect(sheet.height).toBe(96);
    expect(sheet.width).toBe(48);
  });

  it('registers Cozy Human V2 as active gameplay rig and PyDew/Cabacos/Puny as references', () => {
    const gameplay = OLW_ASSET_REGISTRY.find((r) => r.id === 'avatar.gameplay.cozy-human-v2');
    expect(gameplay?.role).toBe('gameplay');
    expect(gameplay?.frames).toMatchObject({ width: 16, height: 32 });

    const pydew = OLW_ASSET_REGISTRY.find((r) => r.id === 'avatar.walk.pydew-farmer');
    expect(pydew?.role).toBe('reference');

    const cabacos = OLW_ASSET_REGISTRY.find((r) => r.id === 'avatar.reference.cabacos-sunnyside');
    expect(cabacos?.role).toBe('reference');
  });
});
