import { describe, expect, it } from 'vitest';
import { AVATAR_ATLAS_ROW_COUNT } from '../../src/game/art/avatarAtlasLayout';
import { PUNY_SHEET } from '../../src/shared/donor/punyCharacter8dSheet';
import {
  PYDEW_FARMER_GAMEPLAY_MANIFEST,
  pydewDonorAssetBasePath,
} from '../../src/shared/donor/pydewFarmerCharacterSheet';

describe('private vs public avatar pipeline sync', () => {
  it('wardrobe atlas uses 3 rows; gameplay uses PyDew farmer 64px grid', () => {
    expect(AVATAR_ATLAS_ROW_COUNT).toBe(3);
    expect(PUNY_SHEET.frameWidth).toBe(32);
    expect(PYDEW_FARMER_GAMEPLAY_MANIFEST.frameWidth).toBe(64);
  });

  it('private profile loads PyDew farmer from private-unified mirror path', () => {
    expect(pydewDonorAssetBasePath(true)).toBe('/assets/private-unified/donor-pydew-characters');
    expect(pydewDonorAssetBasePath(false)).toBe('/assets/donor/pydew-characters');
  });
});