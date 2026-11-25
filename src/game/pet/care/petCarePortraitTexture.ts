import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  ensureLicensedCareCatReady,
  getLicensedCareCatAnimKey,
  getLicensedCareCatTextureKey,
} from './petCareCatOrange';

/** @deprecated Procedural atlas retired — returns unified cat-orange sheet key. */
export function ensurePetCarePortraitSheet(
  scene: Phaser.Scene,
  _variant: CatCoatVariantId,
  _accessory: CatAccessoryId,
): string {
  ensureLicensedCareCatReady(scene);
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