import type Phaser from 'phaser';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';

const SCENE_KEY = 'PetCareScene';

export function enterPetCareRuntime(
  game: Phaser.Game,
  payload: {
    variant: CatCoatVariantId;
    accessory: CatAccessoryId;
    petName: string;
    traitId?: string;
    petSnapshot: PetSnapshot | null;
  },
): void {
  game.scene.run(SCENE_KEY, payload);
  game.scene.bringToTop(SCENE_KEY);
}

export function exitPetCareRuntime(game: Phaser.Game): void {
  const scene = game.scene.getScene(SCENE_KEY);
  if (scene && 'shutdownPetCare' in scene) {
    (scene as { shutdownPetCare: () => void }).shutdownPetCare();
  }
  game.scene.stop(SCENE_KEY);
}