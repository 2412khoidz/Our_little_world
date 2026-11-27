import { describe, expect, it } from 'vitest';
import {
  AVATAR_ATLAS_ROW_COUNT,
  AVATAR_ATLAS_ROW_IDLE,
  AVATAR_ATLAS_ROW_PHONE,
  AVATAR_ATLAS_ROW_SIT,
  AVATAR_ATLAS_ROW_WALK,
} from '../../src/game/art/avatarAtlasLayout';
import { AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH } from '../../src/game/art/worldAvatarCanvas';
import { PUNY_SHEET } from '../../src/shared/donor/punyCharacter8dSheet';

describe('private vs public avatar pipeline sync', () => {
  it('wardrobe and gameplay share the unified 4-row 16x32 cozy human atlas', () => {
    expect(AVATAR_ATLAS_ROW_IDLE).toBe(0);
    expect(AVATAR_ATLAS_ROW_WALK).toBe(1);
    expect(AVATAR_ATLAS_ROW_SIT).toBe(2);
    expect(AVATAR_ATLAS_ROW_PHONE).toBe(3);
    expect(AVATAR_ATLAS_ROW_COUNT).toBe(4);
    expect(AVATAR_FRAME_WIDTH).toBe(16);
    expect(AVATAR_FRAME_HEIGHT).toBe(32);
    expect(PUNY_SHEET.frameWidth).toBe(32);
  });
});
