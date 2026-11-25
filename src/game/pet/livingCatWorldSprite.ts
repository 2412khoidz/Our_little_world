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

const DEFAULT_FRAME = `${extIds.sheets.cat_orange}:48`;

export function livingCatLicensedPackReady(
  scene: Phaser.Scene,
  variant: CatCoatVariantId = 'ginger-tabby',
): boolean {
  if (variant !== 'ginger-tabby') return false;
  if (!scene.textures.exists(WORLD_PROPS_KEY)) return false;
  const sheet = scene.textures.get(WORLD_PROPS_KEY);
  if (!sheet.has(DEFAULT_FRAME)) return false;
  return scene.anims.exists(mapWorldPetStateToOlwCatAnim('idle_south'));
}

export function stampLivingCatPackDataset(scene: Phaser.Scene, licensed: boolean): void {
  const canvas = scene.game.canvas;
  canvas.dataset.livingCatPack = licensed ? LIVING_CAT_PACK_ID : 'procedural-cc0';
}

export function livingCatDefaultFrameId(): string {
  return DEFAULT_FRAME;
}

export { mapWorldPetStateToOlwCatAnim };