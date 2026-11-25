import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import type { PetActionType, PetSnapshot } from '../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../shared/petLiving/petVisualTypes';
import {
  createLocomotionSnapshot,
  stepPetLocomotion,
  type PetBehaviorIntent,
  type PetLocomotionSnapshot,
} from '../pet/PetAnimationController';
import {
  ensureLivingCatSpritesheet,
  getLivingCatAnimKey,
  getLivingCatTextureKey,
} from '../pet/petSpriteBuilder';
import type { PetLivingMainGameDriver } from '../pet/PetLivingMainGameDriver';

const HOME_WAYPOINTS = [
  { x: 13.5 * TILE_SIZE, y: 10.2 * TILE_SIZE }, // Coral pet rug
  { x: 12.6 * TILE_SIZE, y: 10.2 * TILE_SIZE }, // Food/water bowls
  { x: 10.5 * TILE_SIZE, y: 8.6 * TILE_SIZE },  // Central cozy floor
  { x: 6.5 * TILE_SIZE, y: 8.0 * TILE_SIZE },   // Living rug edge
];

const STUDY_LOUNGE_SPOT = { x: 11.4 * TILE_SIZE, y: 5.4 * TILE_SIZE };
const FOOD_BOWL_SPOT = { x: 12.4 * TILE_SIZE, y: 10.1 * TILE_SIZE };

export class PetEntity {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly nameTag: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Text | null = null;

  private variant: CatCoatVariantId = 'ginger-tabby';
  private accessory: CatAccessoryId = 'ribbon_rose';
  private loco: PetLocomotionSnapshot = createLocomotionSnapshot(13.5 * TILE_SIZE, 10.2 * TILE_SIZE);

  private petSnapshot: PetSnapshot | null = null;
  private visible = false;
  private studyMode = false;

  private targetX = 13.5 * TILE_SIZE;
  private targetY = 10.2 * TILE_SIZE;
  private nextDecisionAtMs = 0;
  private reactionUntilMs = 0;
  private reactionIntent: PetBehaviorIntent = 'happy_hop';
  private bubbleTimerMs = 0;
  private livingDriver: PetLivingMainGameDriver | null = null;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;

    ensureLivingCatSpritesheet(scene, this.variant, this.accessory);
    const texKey = getLivingCatTextureKey(this.variant, this.accessory);
    const startX = this.loco.x;
    const startY = this.loco.y;

    this.shadow = scene.add
      .ellipse(startX, startY - 1, 13, 5, 0x22151c, 0.34)
      .setVisible(false);

    // Native 1:1 24x24 pixel sprite for razor-sharp Demo E parity without blurry scaling
    this.sprite = scene.add
      .sprite(startX, startY, texKey, 0)
      .setOrigin(0.5, 0.85)
      .setVisible(false);

    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 14) {
        onTap();
      }
    });

    this.nameTag = scene.add
      .text(startX, startY - 21, 'Bé mèo', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '6px',
        fontStyle: 'bold',
        color: '#ffe8c7',
        backgroundColor: '#281e24cc',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(9400)
      .setVisible(false);
  }

  setAppearance(variant: CatCoatVariantId, accessory: CatAccessoryId): void {
    if (this.variant === variant && this.accessory === accessory) return;
    this.variant = variant;
    this.accessory = accessory;
    ensureLivingCatSpritesheet(this.scene, variant, accessory);
    this.sprite.setTexture(getLivingCatTextureKey(variant, accessory), 0);
    this.playAnimState(this.loco.animState);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    this.nameTag.setVisible(visible);
    if (!visible && this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
  }

  setLivingDriver(driver: PetLivingMainGameDriver | null): void {
    this.livingDriver = driver;
    driver?.seedFromSnapshot(this.petSnapshot);
  }

  applyLivingLocomotion(loco: PetLocomotionSnapshot, bubbleText: string | null): void {
    this.loco = loco;
    this.sprite.setPosition(Math.round(loco.x), Math.round(loco.y));
    this.syncShadowAndLabel();
    this.playAnimState(loco.animState);
    if (bubbleText) this.spawnFloatingBubble(bubbleText);
  }

  syncSnapshot(pet: PetSnapshot | null, currentMapId: import('../../shared/types').MapId): void {
    this.petSnapshot = pet;
    this.livingDriver?.seedFromSnapshot(pet);
    const show = currentMapId === 'home';
    this.nameTag.setText(pet ? pet.name : 'Mèo con');
    this.setVisible(show);
    if (show) {
      this.playAnimState(pet ? this.loco.animState : 'sleep');
    }
  }

  setStudyMode(active: boolean): void {
    this.studyMode = active;
    if (active) {
      this.targetX = STUDY_LOUNGE_SPOT.x;
      this.targetY = STUDY_LOUNGE_SPOT.y;
    }
  }

  triggerReaction(action: PetActionType): void {
    const now = Date.now();
    this.reactionUntilMs = now + 2600;
    this.reactionIntent = action === 'feed' ? 'eat' : action === 'water' ? 'drink' : 'pet_purr';
    if (action === 'feed' || action === 'water') {
      this.targetX = FOOD_BOWL_SPOT.x;
      this.targetY = FOOD_BOWL_SPOT.y;
    }
    this.spawnFloatingBubble(action === 'feed' ? '🐟' : action === 'water' ? '💧' : '❤️');
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  isOnMapVisible(): boolean {
    return this.visible;
  }

  isNearbyTile(tileX: number, tileY: number): boolean {
    const cx = this.sprite.x / TILE_SIZE;
    const cy = this.sprite.y / TILE_SIZE;
    return Math.hypot(tileX - cx, tileY - cy) <= 2.4;
  }

  update(dtSec: number): void {
    if (!this.visible) return;
    if (this.livingDriver) return;
    const now = Date.now();

    if (!this.petSnapshot) {
      this.loco = stepPetLocomotion(this.loco, {
        intent: 'sleep',
        targetX: 13.6 * TILE_SIZE,
        targetY: 10.3 * TILE_SIZE,
        dtSec,
        nowMs: now,
      });
      this.sprite.setPosition(13.6 * TILE_SIZE, 10.3 * TILE_SIZE);
      this.syncShadowAndLabel();
      this.playAnimState(this.loco.animState);
      this.tickAmbientBubble(dtSec, 'zz');
      return;
    }

    const dist = Math.hypot(this.targetX - this.loco.x, this.targetY - this.loco.y);
    let desiredIntent: PetBehaviorIntent;

    if (dist > 2) {
      desiredIntent = 'move';
    } else if (now < this.reactionUntilMs) {
      desiredIntent = this.reactionIntent;
    } else if (this.studyMode || this.petSnapshot.emotion === 'sleepy') {
      desiredIntent = 'sleep';
      this.tickAmbientBubble(dtSec, '~');
    } else {
      const cycle = Math.floor(now / 12000) % 4;
      desiredIntent = cycle === 2 ? 'sleep' : cycle === 3 ? 'sit' : 'idle';
      if (desiredIntent === 'sleep') {
        this.tickAmbientBubble(dtSec, 'Zzz');
      } else if (this.petSnapshot.emotion === 'hungry' && cycle === 0) {
        this.tickAmbientBubble(dtSec, '🐟?');
      }

      if (now >= this.nextDecisionAtMs) {
        this.nextDecisionAtMs = now + 6000 + ((now % 4) * 1000);
        const seed = Math.floor(now / 6000) + this.petSnapshot.version;
        const wp = HOME_WAYPOINTS[seed % HOME_WAYPOINTS.length]!;
        this.targetX = wp.x;
        this.targetY = wp.y;
      }
    }

    this.loco = stepPetLocomotion(this.loco, {
      intent: desiredIntent,
      targetX: this.targetX,
      targetY: this.targetY,
      dtSec,
      nowMs: now,
    });

    this.sprite.setPosition(Math.round(this.loco.x), Math.round(this.loco.y));
    this.syncShadowAndLabel();
    this.playAnimState(this.loco.animState);

    if (this.bubble && this.bubble.active) {
      this.bubble.y -= 10 * dtSec;
      this.bubble.alpha = Math.max(0, this.bubble.alpha - 0.45 * dtSec);
      if (this.bubble.alpha <= 0.02) {
        this.bubble.destroy();
        this.bubble = null;
      }
    }
  }

  private syncShadowAndLabel(): void {
    const depth = Math.round(this.sprite.y);
    this.sprite.setDepth(depth);
    this.shadow.setPosition(this.sprite.x, this.sprite.y);
    this.shadow.setDepth(depth - 1);
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - 20);
  }

  private playAnimState(state: PetAnimState): void {
    const animKey = getLivingCatAnimKey(this.variant, this.accessory, state);
    if (this.scene.anims.exists(animKey) && this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey, true);
    }
  }

  private tickAmbientBubble(dtSec: number, text: string): void {
    this.bubbleTimerMs += dtSec * 1000;
    if (this.bubbleTimerMs >= 3200) {
      this.bubbleTimerMs = 0;
      this.spawnFloatingBubble(text);
    }
  }

  private spawnFloatingBubble(text: string): void {
    if (this.bubble) this.bubble.destroy();
    this.bubble = this.scene.add
      .text(this.sprite.x + 4, this.sprite.y - 25, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '7px',
        fontStyle: 'bold',
        color: '#ffd9e3',
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(9600);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubble?.destroy();
  }
}
