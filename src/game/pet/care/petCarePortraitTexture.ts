import type Phaser from 'phaser';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  buildCarePortraitCanvas,
  carePortraitFrameIndex,
  carePortraitFramesForAnim,
  getCarePortraitAnimList,
  PET_CARE_ATLAS_FRAME,
} from './petCarePortraitPainter';

function portraitTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return `olw-pet-care-atlas-${variant}-${accessory}`;
}

function portraitAnimKey(variant: CatCoatVariantId, accessory: CatAccessoryId, state: PetAnimState): string {
  return `${portraitTextureKey(variant, accessory)}:${state}`;
}

export function ensurePetCarePortraitSheet(
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): string {
  const key = portraitTextureKey(variant, accessory);
  if (scene.textures.exists(key)) return key;

  const canvas = buildCarePortraitCanvas(variant, accessory);
  scene.textures.addCanvas(key, canvas);

  for (const state of getCarePortraitAnimList()) {
    const frameCount = carePortraitFramesForAnim(state);
    const frames = Array.from({ length: frameCount }, (_, fi) => ({
      key,
      frame: carePortraitFrameIndex(state, fi),
    }));
    const fps =
      state === 'sleep' || state === 'idle_south'
        ? 5
        : state === 'play_pounce'
          ? 9
          : 7;
    if (!scene.anims.exists(portraitAnimKey(variant, accessory, state))) {
      scene.anims.create({
        key: portraitAnimKey(variant, accessory, state),
        frames,
        frameRate: fps,
        repeat: -1,
      });
    }
  }

  return key;
}

export function getPetCarePortraitAnimKey(
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
  state: PetAnimState,
): string {
  const allowed = getCarePortraitAnimList();
  const anim = (allowed as readonly string[]).includes(state) ? state : 'sit_south';
  return portraitAnimKey(variant, accessory, anim);
}

export function getPetCarePortraitTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return portraitTextureKey(variant, accessory);
}

export { PET_CARE_ATLAS_FRAME };