import type Phaser from 'phaser';
import type { PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import { licensedCatFrameSeriesForState } from '../../../shared/petLiving/petCare/petCareLicensedCatMaps';
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