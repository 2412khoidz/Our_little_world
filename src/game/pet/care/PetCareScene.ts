import Phaser from 'phaser';
import { gameEventBus } from '../../eventBus';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';
import { PetCareAutonomy } from '../../../shared/petLiving/petCare/PetCareAutonomy';
import { derivePetCareMood } from '../../../shared/petLiving/petCare/petCareMood';
import type { PetCareActionKind } from '../../../shared/petLiving/petCare/petCareTypes';
import { PET_PERSONALITY_PRESETS } from '../../../shared/petLiving/petIntelligenceConfig';
import { setPetCareModeActive } from '../../../shared/petLiving/petCare/petCareModeFlag';
import { PetCareSessionGoals } from '../../../shared/petLiving/petCare/petCareSessionGoals';
import { PetCarePortraitRig } from './PetCarePortraitRig';

export interface PetCareSceneData {
  variant: CatCoatVariantId;
  accessory: CatAccessoryId;
  petName: string;
  traitId?: string;
  petSnapshot: PetSnapshot | null;
}

export class PetCareScene extends Phaser.Scene {
  private rig: PetCarePortraitRig | null = null;
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private autonomy: PetCareAutonomy | null = null;
  private readonly unsubs: Array<() => void> = [];
  private sessionStartMs = 0;
  private readonly sessionGoals = new PetCareSessionGoals();

  constructor() {
    super({ key: 'PetCareScene', active: false, visible: false });
  }

  init(_data: PetCareSceneData): void {
    this.sessionStartMs = Date.now();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  create(data: PetCareSceneData): void {
    setPetCareModeActive(true);
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 - 12;

    this.backdrop = this.add
      .rectangle(cx, cy, width + 8, height + 8, 0x0e0a10, 0.72)
      .setScrollFactor(0)
      .setDepth(0);

    const traits = PET_PERSONALITY_PRESETS.find((p) => p.id === data.traitId)?.traits ?? PET_PERSONALITY_PRESETS[0]!.traits;
    this.autonomy = new PetCareAutonomy(derivePetCareMood(data.petSnapshot, traits));

    this.rig = new PetCarePortraitRig(
      this,
      cx,
      cy,
      data.variant,
      data.accessory,
      data.petName,
      data.petSnapshot,
      data.traitId,
    );

    this.game.canvas.dataset.petCareRig = 'portrait';
    gameEventBus.emit('evt:pet-care-mode', { active: true });

    this.unsubs.push(
      gameEventBus.on('cmd:pet-care-stroke', ({ zone, strokeIndex }) => {
        this.rig?.strokeFromHud(zone, strokeIndex);
      }),
      gameEventBus.on('evt:pet-care-stroke-done', () => {
        if (this.sessionGoals.record('stroke')) this.emitSessionGoals();
      }),
      gameEventBus.on('cmd:pet-care-action', (payload) => {
        this.handleCareAction(payload.kind, payload.sku, payload.quality, payload.ownerScope);
      }),
      gameEventBus.on('cmd:sync-pet', (pet) => {
        this.rig?.syncSnapshot(pet);
        if (this.autonomy && pet) {
          const t = PET_PERSONALITY_PRESETS[0]!.traits;
          this.autonomy.setMood(derivePetCareMood(pet, t));
        }
      }),
    );
  }

  private handleCareAction(
    kind: PetCareActionKind,
    sku?: string,
    quality: 'normal' | 'silver' | 'gold' = 'normal',
    ownerScope = 'shared',
  ): void {
    this.rig?.performAction(kind);
    if (this.sessionGoals.recordAction(kind)) this.emitSessionGoals();
    // offer_food only → inventory RPC (dev LAN / Supabase); brush/pour_water stay scene-local.
    if (kind === 'offer_food' && sku) {
      gameEventBus.emit('evt:pet-care-request-consume', { sku, quality, ownerScope });
    }
  }

  private emitSessionGoals(): void {
    const p = this.sessionGoals.progress;
    gameEventBus.emit('evt:pet-care-session-goals', {
      count: p.count,
      total: p.total,
      labelsVi: p.labelsVi,
    });
  }

  update(_time: number, deltaMs: number): void {
    const now = Date.now();
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2 - 12;
    this.rig?.setPosition(cx, cy);
    this.backdrop?.setPosition(cx, cy);
    this.rig?.update(deltaMs, now);

    if (this.autonomy && this.rig) {
      const quiet = now - this.rig.getLastInteractionMs();
      const cue = this.autonomy.tick(now, quiet);
      if (cue.kind === 'proactive') {
        this.rig.performAction(cue.action);
        if (this.sessionGoals.record('autonomy')) this.emitSessionGoals();
        if (this.sessionGoals.recordAction(cue.action)) this.emitSessionGoals();
      }
    }
  }

  shutdownPetCare(): void {
    this.cleanup();
  }

  private cleanup(): void {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
    this.rig?.destroy();
    this.rig = null;
    this.backdrop?.destroy();
    this.backdrop = null;
    setPetCareModeActive(false);
    delete this.game.canvas.dataset.petCareRig;
    gameEventBus.emit('evt:pet-care-mode', { active: false });
    void this.sessionStartMs;
  }
}