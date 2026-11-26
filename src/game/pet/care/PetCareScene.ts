import Phaser from 'phaser';
import { gameEventBus } from '../../eventBus';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';
import { setPetCareModeActive } from '../../../shared/petLiving/petCare/petCareModeFlag';
import { PetCareSessionGoals } from '../../../shared/petLiving/petCare/petCareSessionGoals';
import type { PetCareActionKind } from '../../../shared/petLiving/petCare/petCareTypes';
import { setPetCareBridgeIdentity } from './petCareBridgeState';

export interface PetCareSceneData {
  variant: CatCoatVariantId;
  accessory: CatAccessoryId;
  petName: string;
  traitId?: string;
  petSnapshot: PetSnapshot | null;
}

/**
 * Lightweight Phaser bridge scene active during 3D Pet Care.
 * Avoids mounting any hidden 2D canvas objects so GPU/CPU stay dedicated to WebGL2 3D care.
 */
export class PetCareScene extends Phaser.Scene {
  private readonly unsubs: Array<() => void> = [];
  private readonly sessionGoals = new PetCareSessionGoals();

  constructor() {
    super({ key: 'PetCareScene', active: false, visible: false });
  }

  init(_data: PetCareSceneData): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  create(data: PetCareSceneData): void {
    setPetCareModeActive(true);
    this.scene.setVisible(false);

    setPetCareBridgeIdentity({
      variant: data.variant,
      accessory: data.accessory,
      petName: data.petName,
      traitId: data.traitId,
      petSnapshot: data.petSnapshot,
    });
    this.game.canvas.dataset.petCareRig = 'portrait';
    gameEventBus.emit('evt:pet-care-mode', { active: true });

    this.unsubs.push(
      gameEventBus.on('evt:pet-care-stroke-done', () => {
        if (this.sessionGoals.record('stroke')) this.emitSessionGoals();
      }),
      gameEventBus.on('evt:pet-care-autonomy-cue', () => {
        if (this.sessionGoals.record('autonomy')) this.emitSessionGoals();
      }),
      gameEventBus.on('cmd:pet-care-action', (payload) => {
        this.recordActionGoal(payload.kind);
      }),
    );
  }

  private recordActionGoal(kind: PetCareActionKind): void {
    if (this.sessionGoals.recordAction(kind)) this.emitSessionGoals();
  }

  private emitSessionGoals(): void {
    const p = this.sessionGoals.progress;
    gameEventBus.emit('evt:pet-care-session-goals', {
      count: p.count,
      total: p.total,
      labelsVi: p.labelsVi,
    });
  }

  shutdownPetCare(): void {
    this.cleanup();
  }

  private cleanup(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    setPetCareModeActive(false);
    delete this.game.canvas.dataset.petCareRig;
    gameEventBus.emit('evt:pet-care-mode', { active: false });
  }
}
