import { describe, expect, it } from 'vitest';
import {
  PYDEW_FARMER_ACTION_ROWS,
  PYDEW_FARMER_GAMEPLAY_MANIFEST,
  PYDEW_FARMER_SHEET,
} from '../../src/shared/donor/pydewFarmerCharacterSheet';
import { avatarWalkAnimKey } from '../../src/game/art/avatarAtlasLayout';
import { avatarIdleFrame, avatarIdleFrameForFacing8 } from '../../src/game/art/phaserAvatarTexture';

describe('Cozy Human V2 animation & donor reference alignment', () => {
  it('keeps distinct directional idle indices and walk anim keys without combat frames', () => {
    expect(avatarIdleFrame('avatar:test', 'down')).toBe(0);
    expect(avatarIdleFrame('avatar:test', 'up')).toBe(3);
    expect(avatarIdleFrame('avatar:test', 'left')).toBe(6);
    expect(avatarIdleFrame('avatar:test', 'right')).toBe(9);
    expect(avatarIdleFrameForFacing8('avatar:test', 'down-right')).toBe(0);
    expect(avatarWalkAnimKey('avatar:test', 'down-right')).toBe('avatar:test:walk-down-right');
  });

  it('retains PyDew reference manifest constants for farm donor compatibility', () => {
    expect(PYDEW_FARMER_ACTION_ROWS.hoe).toBe(PYDEW_FARMER_SHEET.rows.hoe);
    expect(PYDEW_FARMER_ACTION_ROWS.water).toBe(PYDEW_FARMER_SHEET.rows.water);
    expect(PYDEW_FARMER_GAMEPLAY_MANIFEST.facing8Policy).toBe('cardinal-from-facing8');
  });
});
