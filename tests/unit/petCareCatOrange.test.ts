import { describe, expect, it } from 'vitest';
import {
  licensedCareCatShadowFrame,
  mapCareStateToOlwCatAnim,
  mapCareStateToOlwCatShadowAnim,
  PET_CARE_LICENSED_IDLE_SOUTH_FRAME,
} from '../../src/shared/petLiving/petCare/petCareLicensedCatMaps';

describe('petCareLicensedCatMaps', () => {
  it('maps care states to Frakassets Idle/Happy/Sleep/Walk South', () => {
    expect(mapCareStateToOlwCatAnim('sit_south')).toBe('olw-cat-Idle_South');
    expect(mapCareStateToOlwCatAnim('sleep')).toBe('olw-cat-Sleep_South');
    expect(mapCareStateToOlwCatAnim('play_pounce')).toBe('olw-cat-Happy_South');
    expect(mapCareStateToOlwCatAnim('walk_south')).toBe('olw-cat-Walk_South');
  });

  it('uses pinned sheet frame index for Idle_South start', () => {
    expect(PET_CARE_LICENSED_IDLE_SOUTH_FRAME).toBe('sheet.cat_orange:48');
  });

  it('shadow anim keys mirror body', () => {
    expect(mapCareStateToOlwCatShadowAnim('eat')).toBe('olw-cat-shadow-Happy_South');
    expect(licensedCareCatShadowFrame()).toBe('sheet.cat_orange_shadow:48');
  });
});