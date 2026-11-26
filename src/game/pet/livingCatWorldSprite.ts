import type Phaser from 'phaser';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import extIds from '../art/worldExtendedArtIds.json';
import type { CatCoatVariantId } from '../../shared/petLiving/petVisualTypes';
import { mapWorldPetStateToOlwCatAnim } from '../../shared/petLiving/petMovement/livingCatWorldAnimMap';

/** Frakassets Free Pets Pack — single licensed overworld cat (Quýt / ginger-tabby). */
export const LIVING_CAT_PACK_ID = 'frakassets-cat-orange';
export const LIVING_CAT_FRAME_PX = 16;
/** Match prior 24px procedural silhouette height at default world scale. */
export const LIVING_PET_LICENSED_WORLD_SCALE = 2.175;

/** High-detail 32x32 Frakassets cat-orange spritesheet loaded cleanly for crisp overworld silhouettes. */
export const LIVING_CAT_32_KEY = 'olw-cat-orange-32';
export const LIVING_CAT_32_URL = '/assets/pets/cat-orange-32px.png';
export const LIVING_CAT_32_WORLD_SCALE = 0.78;
export const LIVING_CAT_32_ANIM_PREFIX = 'olw-cat-32-';

const DEFAULT_FRAME = `${extIds.sheets.cat_orange}:48`;

export function livingCat32PackReady(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): boolean {
  if (variant !== 'ginger-tabby') return false;
  if (!scene.textures.exists(LIVING_CAT_32_KEY)) return false;
  return scene.anims.exists(`${LIVING_CAT_32_ANIM_PREFIX}Idle_South`);
}

export function livingCatLicensedPackReady(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): boolean {
  if (livingCat32PackReady(scene, variant)) return true;
  if (variant !== 'ginger-tabby') return false;
  if (!scene.textures.exists(WORLD_PROPS_KEY)) return false;
  const sheet = scene.textures.get(WORLD_PROPS_KEY);
  if (!sheet.has(DEFAULT_FRAME)) return false;
  return scene.anims.exists(mapWorldPetStateToOlwCatAnim('idle_south'));
}

export function livingCatWorldTextureKey(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): string | null {
  if (livingCat32PackReady(scene, variant)) return LIVING_CAT_32_KEY;
  if (livingCatLicensedPackReady(scene, variant)) return WORLD_PROPS_KEY;
  return null;
}

export function livingCatWorldDefaultFrame(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): string | number {
  if (livingCat32PackReady(scene, variant)) return 48;
  return DEFAULT_FRAME;
}

export function livingCatWorldAnimKey(
  scene: Phaser.Scene,
  state: import('../../shared/petLiving/petVisualTypes').PetAnimState,
  variant: CatCoatVariantId = 'ginger-tabby',
): string {
  const baseKey = mapWorldPetStateToOlwCatAnim(state);
  if (livingCat32PackReady(scene, variant)) {
    return `${LIVING_CAT_32_ANIM_PREFIX}${baseKey.replace(/^olw-cat-/, '')}`;
  }
  return baseKey;
}

export function livingCatWorldScale(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): number {
  return livingCat32PackReady(scene, variant)
    ? LIVING_CAT_32_WORLD_SCALE
    : LIVING_PET_LICENSED_WORLD_SCALE;
}

export function stampLivingCatPackDataset(scene: Phaser.Scene, licensed: boolean): void {
  const canvas = scene.game.canvas;
  canvas.dataset.livingCatPack = licensed ? LIVING_CAT_PACK_ID : 'procedural-cc0';
}

export function livingCatDefaultFrameId(): string {
  return DEFAULT_FRAME;
}

export { mapWorldPetStateToOlwCatAnim };