import type Phaser from 'phaser';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';

const SCENE_KEY = 'PetCareScene';
let pendingSleepTimer: number | null = null;

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
  if (pendingSleepTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(pendingSleepTimer);
    pendingSleepTimer = null;
  }
  game.scene.run(SCENE_KEY, payload);
  game.scene.bringToTop(SCENE_KEY);
  game.canvas.style.visibility = 'hidden';

  // Let Phaser run 1 tick so PetCareScene.create() registers bridge identity & listeners, then sleep 2D RAF loop.
  if (typeof window !== 'undefined') {
    pendingSleepTimer = window.setTimeout(() => {
      pendingSleepTimer = null;
      const careScene = game.scene.getScene(SCENE_KEY);
      if (careScene && careScene.scene.isActive() && typeof game.loop.sleep === 'function') {
        game.loop.sleep();
      }
    }, 60);
  }
}

export function exitPetCareRuntime(game: Phaser.Game): void {
  if (pendingSleepTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(pendingSleepTimer);
    pendingSleepTimer = null;
  }
  if (typeof game.loop.wake === 'function') {
    game.loop.wake();
  }
  game.canvas.style.visibility = '';
  const scene = game.scene.getScene(SCENE_KEY);
  if (scene && 'shutdownPetCare' in scene) {
    (scene as { shutdownPetCare: () => void }).shutdownPetCare();
  }
  game.scene.stop(SCENE_KEY);
}
