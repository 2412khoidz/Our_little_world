/**
 * Pet care close-up — Frakassets `cat-orange` via unified world-props atlas (CC BY 4.0).
 */
import type Phaser from 'phaser';
import {
  ensurePetCareIsolatedCatSheets,
  petCareAtlasProfileLabel,
  petCareCatBodyTextureKey,
} from './petCareCatIsolateTexture';
import type { PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  licensedCareCatShadowFrame,
  licensedCatFrameSeriesForState,
  mapCareStateToOlwCatAnim,
  mapCareStateToOlwCatShadowAnim,
  PET_CARE_LICENSED_IDLE_SOUTH_FRAME,
} from '../../../shared/petLiving/petCare/petCareLicensedCatMaps';
import { petCareCatShadowTextureKey } from './petCareCatIsolateTexture';

/** 16px cell × scale → readable phone silhouette without blurry upscale. */
export const PET_CARE_CAT_ORANGE_SCALE = 8.25;

export const getLicensedCareCatAnimKey = mapCareStateToOlwCatAnim;
export const getLicensedCareCatShadowAnimKey = mapCareStateToOlwCatShadowAnim;
export const getLicensedCareCatDefaultFrame = () => PET_CARE_LICENSED_IDLE_SOUTH_FRAME;
export const getLicensedCareCatShadowFrame = licensedCareCatShadowFrame;

export function getLicensedCareCatTextureKey(): string {
  return petCareCatBodyTextureKey();
}

export function ensureLicensedCareCatReady(scene: Phaser.Scene): boolean {
  return ensurePetCareIsolatedCatSheets(scene);
}

export function getPetCareAtlasProfileLabel(): string {
  return petCareAtlasProfileLabel();
}

export function playLicensedCareCatAnim(
  sprite: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  state: PetAnimState,
): void {
  void mapCareStateToOlwCatAnim(state);
  ensurePetCareIsolatedCatSheets(scene);
  const texKey = petCareCatBodyTextureKey();
  const index = licensedCatFrameSeriesForState(state)[0] ?? 48;
  if (scene.textures.exists(texKey)) {
    sprite.setTexture(texKey, index);
  }
}

export function playLicensedCareCatShadowAnim(
  sprite: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  state: PetAnimState,
): void {
  void mapCareStateToOlwCatShadowAnim(state);
  ensurePetCareIsolatedCatSheets(scene);
  const texKey = petCareCatShadowTextureKey();
  const index = licensedCatFrameSeriesForState(state)[0] ?? 48;
  if (scene.textures.exists(texKey)) {
    sprite.setTexture(texKey, index);
  }
}