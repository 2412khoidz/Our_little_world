import type Phaser from 'phaser';
import {
  CAT_VARIANTS,
  PET_ANIMATION_SPECS,
  type CatAccessoryId,
  type CatCoatVariantId,
  type PetAnimState,
} from '../../../shared/petLiving/petVisualTypes';
import { ensureLivingCatSpritesheet, getLivingCatAnimKey, getLivingCatTextureKey } from '../petSpriteBuilder';

/** Close-up care frames — separate atlas from overworld (48px), not upscaled world sprite. */
export const PET_CARE_PORTRAIT_FRAME = 48;
const SHEET_COLS = 6;

function portraitTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return `olw-pet-care-portrait-${variant}-${accessory}`;
}

function portraitAnimKey(variant: CatCoatVariantId, accessory: CatAccessoryId, state: PetAnimState): string {
  return `${portraitTextureKey(variant, accessory)}:${state}`;
}

/** Copy overworld sheet into portrait key so care uses its own texture namespace (future HD paint). */
export function ensurePetCarePortraitSheet(
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): string {
  const key = portraitTextureKey(variant, accessory);
  if (scene.textures.exists(key)) return key;

  ensureLivingCatSpritesheet(scene, variant, accessory);
  const srcKey = getLivingCatTextureKey(variant, accessory);
  const src = scene.textures.get(srcKey);
  const srcImg = src.getSourceImage() as HTMLCanvasElement | HTMLImageElement;

  const w = src.get().width;
  const h = src.get().height;
  const canvasTex = scene.textures.createCanvas(key, w, h);
  if (!canvasTex) return srcKey;
  const ctx = canvasTex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(srcImg, 0, 0);
  canvasTex.refresh();

  const OVERWORLD = 24;
  const scale = PET_CARE_PORTRAIT_FRAME / OVERWORLD;
  const states = PET_ANIMATION_SPECS.map((s) => s.key);
  for (const state of states) {
    const owAnim = getLivingCatAnimKey(variant, accessory, state);
    if (!scene.anims.exists(owAnim)) continue;
    const frames =
      scene.anims.get(owAnim)?.frames.map((f) => ({
        key,
        frame: f.index,
        duration: f.duration,
      })) ?? [];
    if (frames.length > 0 && !scene.anims.exists(portraitAnimKey(variant, accessory, state))) {
      scene.anims.create({ key: portraitAnimKey(variant, accessory, state), frames, repeat: -1 });
    }
  }

  void scale;
  void CAT_VARIANTS;
  void SHEET_COLS;
  return key;
}

export function getPetCarePortraitAnimKey(
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
  state: PetAnimState,
): string {
  return portraitAnimKey(variant, accessory, state);
}

export function getPetCarePortraitTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return portraitTextureKey(variant, accessory);
}