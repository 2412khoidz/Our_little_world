/**
 * Pet care close-up — Frakassets `cat-orange` via unified world-props atlas (CC BY 4.0).
 */
import type Phaser from 'phaser';
import { WORLD_PROPS_KEY } from '../../art/worldAtlas';
import type { PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  licensedCareCatShadowFrame,
  mapCareStateToOlwCatAnim,
  mapCareStateToOlwCatShadowAnim,
  PET_CARE_LICENSED_IDLE_SOUTH_FRAME,
} from '../../../shared/petLiving/petCare/petCareLicensedCatMaps';

/** 16px cell × scale → readable phone silhouette without blurry upscale. */
export const PET_CARE_CAT_ORANGE_SCALE = 8.25;

export const getLicensedCareCatAnimKey = mapCareStateToOlwCatAnim;
export const getLicensedCareCatShadowAnimKey = mapCareStateToOlwCatShadowAnim;
export const getLicensedCareCatDefaultFrame = () => PET_CARE_LICENSED_IDLE_SOUTH_FRAME;
export const getLicensedCareCatShadowFrame = licensedCareCatShadowFrame;

export function getLicensedCareCatTextureKey(): string {
  return WORLD_PROPS_KEY;
}

export function ensureLicensedCareCatReady(scene: Phaser.Scene): boolean {
  if (!scene.textures.exists(WORLD_PROPS_KEY)) return false;
  const sheet = scene.textures.get(WORLD_PROPS_KEY);
  return sheet.has(getLicensedCareCatDefaultFrame());
}

export function playLicensedCareCatAnim(
  sprite: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  state: PetAnimState,
): void {
  const key = mapCareStateToOlwCatAnim(state);
  if (scene.anims.exists(key)) {
    sprite.play(key, true);
    return;
  }
  const frame = getLicensedCareCatDefaultFrame();
  if (scene.textures.get(WORLD_PROPS_KEY).has(frame)) {
    sprite.setFrame(frame);
  }
}

export function playLicensedCareCatShadowAnim(
  sprite: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  state: PetAnimState,
): void {
  const key = mapCareStateToOlwCatShadowAnim(state);
  if (scene.anims.exists(key)) {
    sprite.play(key, true);
  }
}