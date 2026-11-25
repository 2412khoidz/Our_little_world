import Phaser from 'phaser';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  ensureLicensedCareCatReady,
  getLicensedCareCatAnimKey,
  getLicensedCareCatTextureKey,
} from './petCareCatOrange';
import {
  buildCarePortraitCanvas,
  carePortraitFrameIndex,
  carePortraitFramesForAnim,
  getCarePortraitAnimList,
  PET_CARE_ATLAS_FRAME,
} from './petCarePortraitPainter';

function illustrationFrameCount(): number {
  let total = 0;
  for (const anim of getCarePortraitAnimList()) {
    total += carePortraitFramesForAnim(anim);
  }
  return total;
}

const ILLUSTRATION_KEY_PREFIX = 'pet-care-illustration';

export function petCareIllustrationTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return `${ILLUSTRATION_KEY_PREFIX}-${variant}-${accessory}`;
}

export function ensurePetCareIllustrationSheet(
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): string {
  const key = petCareIllustrationTextureKey(variant, accessory);
  if (scene.textures.exists(key)) return key;

  const canvas = buildCarePortraitCanvas(variant, accessory);
  const cols = 6;
  const frameW = PET_CARE_ATLAS_FRAME;
  const frameCount = illustrationFrameCount();
  const tex = scene.textures.addCanvas(key, canvas);
  if (!tex) return key;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (let i = 0; i < frameCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    tex.add(i, 0, col * frameW, row * frameW, frameW, frameW);
  }
  return key;
}

export function petCareIllustrationFrameForState(state: PetAnimState, subFrame = 0): number {
  return carePortraitFrameIndex(state, subFrame);
}

export function ensurePetCarePortraitSheet(
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): string {
  ensureLicensedCareCatReady(scene);
  void variant;
  void accessory;
  return getLicensedCareCatTextureKey();
}

export function getPetCarePortraitAnimKey(
  _variant: CatCoatVariantId,
  _accessory: CatAccessoryId,
  state: PetAnimState,
): string {
  return getLicensedCareCatAnimKey(state);
}

export function getPetCarePortraitTextureKey(
  _variant: CatCoatVariantId,
  _accessory: CatAccessoryId,
): string {
  return getLicensedCareCatTextureKey();
}

export { PET_CARE_CAT_ORANGE_SCALE as PET_CARE_DISPLAY_SCALE } from './petCareCatOrange';