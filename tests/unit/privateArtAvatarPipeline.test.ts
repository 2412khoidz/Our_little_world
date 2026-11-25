import { describe, expect, it } from 'vitest';
import { AVATAR_ATLAS_ROW_COUNT } from '../../src/game/art/avatarAtlasLayout';
import {
  PUNY_DONOR_GAMEPLAY_MANIFEST,
  PUNY_SHEET,
  punyDonorAssetBasePath,
} from '../../src/shared/donor/punyCharacter8dSheet';

describe('private vs public avatar pipeline sync', () => {
  it('wardrobe atlas uses 3 rows; gameplay uses Puny 32px grid', () => {
    expect(AVATAR_ATLAS_ROW_COUNT).toBe(3);
    expect(PUNY_SHEET.frameWidth).toBe(PUNY_DONOR_GAMEPLAY_MANIFEST.frameWidth);
    expect(PUNY_DONOR_GAMEPLAY_MANIFEST.postureSameRig.sit).toBe('idle');
    expect(PUNY_DONOR_GAMEPLAY_MANIFEST.postureSameRig.lie).toBe('idle');
  });

  it('private profile loads Puny from private-unified mirror path', () => {
    expect(punyDonorAssetBasePath(true)).toBe('/assets/private-unified/donor-cc0-puny-8d');
    expect(punyDonorAssetBasePath(false)).toBe('/assets/donor/cc0-puny-8d');
  });
});