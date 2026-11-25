import type Phaser from 'phaser';
import type { PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import {
  licensedCatFrameId,
  licensedCatFrameSeriesForState,
} from '../../../shared/petLiving/petCare/petCareLicensedCatMaps';
import { WORLD_PROPS_KEY } from '../../art/worldAtlas';
import extIds from '../../art/worldExtendedArtIds.json';

const CAT_SHEET = extIds.sheets.cat_orange;
const CAT_SHADOW_SHEET = extIds.sheets.cat_orange_shadow;

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

  const applyFrame = (index: number) => {
    const bodyFrame = licensedCatFrameId(CAT_SHEET, index);
    const shadowFrame = licensedCatFrameId(CAT_SHADOW_SHEET, index);
    const tex = scene.textures.get(WORLD_PROPS_KEY);
    if (tex.has(bodyFrame)) body.setFrame(bodyFrame);
    if (tex.has(shadowFrame)) shadow.setFrame(shadowFrame);
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