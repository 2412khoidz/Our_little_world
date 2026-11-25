import type Phaser from 'phaser';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import { licensedCatFrameSeriesForState } from '../../../shared/petLiving/petCare/petCareLicensedCatMaps';
import { carePortraitFrameIndex, carePortraitFramesForAnim } from './petCarePortraitPainter';
import { ensurePetCareIllustrationSheet, petCareIllustrationTextureKey } from './petCarePortraitTexture';
import {
  ensurePetCareIsolatedCatSheets,
  petCareCatBodyTextureKey,
  petCareCatShadowTextureKey,
} from './petCareCatIsolateTexture';

export type PetCareLicensedAnimPlayer = {
  setState: (state: PetAnimState) => void;
  tick: (deltaMs: number) => void;
};

export function createPetCareLicensedFramePlayer(
  body: Phaser.GameObjects.Sprite,
  shadow: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
): PetCareLicensedAnimPlayer {
  let state: PetAnimState = 'sit_south';
  let indices = licensedCatFrameSeriesForState(state);
  let cursor = 0;
  let accum = 0;
  const frameMs = 130;

  ensurePetCareIsolatedCatSheets(scene);

  const applyFrame = (index: number) => {
    const bodyKey = petCareCatBodyTextureKey();
    const shadowKey = petCareCatShadowTextureKey();
    if (scene.textures.exists(bodyKey)) {
      body.setTexture(bodyKey, index);
    }
    if (scene.textures.exists(shadowKey)) {
      shadow.setTexture(shadowKey, index);
    }
  };

  applyFrame(indices[0] ?? 48);

  return {
    setState(next) {
      if (next === state) return;
      state = next;
      indices = licensedCatFrameSeriesForState(state);
      cursor = 0;
      accum = 0;
      applyFrame(indices[0] ?? 48);
    },
    tick(deltaMs) {
      if (indices.length <= 1) return;
      accum += deltaMs;
      if (accum < frameMs) return;
      accum = 0;
      cursor = (cursor + 1) % indices.length;
      applyFrame(indices[cursor] ?? 48);
    },
  };
}

export function createPetCareIllustrationFramePlayer(
  body: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): PetCareLicensedAnimPlayer {
  ensurePetCareIllustrationSheet(scene, variant, accessory);
  const texKey = petCareIllustrationTextureKey(variant, accessory);
  let state: PetAnimState = 'sit_south';
  let subFrame = 0;
  let accum = 0;
  const frameMs = 140;

  const apply = () => {
    const index = carePortraitFrameIndex(state, subFrame);
    if (scene.textures.exists(texKey)) {
      body.setTexture(texKey, index);
    }
  };

  apply();

  return {
    setState(next) {
      if (next === state) return;
      state = next;
      subFrame = 0;
      accum = 0;
      apply();
    },
    tick(deltaMs) {
      const frames = carePortraitFramesForAnim(state);
      if (frames <= 1) return;
      accum += deltaMs;
      if (accum < frameMs) return;
      accum = 0;
      subFrame = (subFrame + 1) % frames;
      apply();
    },
  };
}