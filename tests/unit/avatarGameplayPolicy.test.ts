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

  it('registers Puny gameplay + Cabacos reference rows', () => {
    const ids = OLW_ASSET_REGISTRY.map((r) => r.id);
    expect(ids).toContain('avatar.walk.pydew-farmer');
    expect(ids).toContain('avatar.reference.cabacos-sunnyside');
  });
});