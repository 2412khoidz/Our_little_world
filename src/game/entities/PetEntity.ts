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
import {
  livingCat32PackReady,
  livingCatLicensedPackReady,
  livingCatWorldAnimKey,
  livingCatWorldDefaultFrame,
  livingCatWorldScale,
  livingCatWorldTextureKey,
} from '../pet/livingCatWorldSprite';
import { FOLLOW_CAT_MAPS, type PetLivingMainGameDriver } from '../pet/PetLivingMainGameDriver';

const HOME_WAYPOINTS = [
  { x: 13.5 * TILE_SIZE, y: 10.2 * TILE_SIZE }, // Coral pet rug
  { x: 12.6 * TILE_SIZE, y: 10.2 * TILE_SIZE }, // Food/water bowls
  { x: 10.5 * TILE_SIZE, y: 8.6 * TILE_SIZE },  // Central cozy floor
  { x: 6.5 * TILE_SIZE, y: 8.0 * TILE_SIZE },   // Living rug edge
];

const STUDY_LOUNGE_SPOT = { x: 11.4 * TILE_SIZE, y: 5.4 * TILE_SIZE };
const FOOD_BOWL_SPOT = { x: 12.4 * TILE_SIZE, y: 10.1 * TILE_SIZE };

/** Mission 04C — readable in world without blurry upscale. */
const LIVING_PET_WORLD_SCALE = 1.45;
/** Legacy zoom-scale — Mission 04C close-up rig replaces this in care mode. */
const LIVING_PET_CARE_SCALE = 1.45;

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
  private careCloseUp = false;
  private lastLocoAtMs = 0;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;

    ensureLivingCatSpritesheet(scene, this.variant, this.accessory);
    const licensedKey = livingCatWorldTextureKey(scene, this.variant);
    const texKey = licensedKey ?? getLivingCatTextureKey(this.variant, this.accessory);
    const startFrame = licensedKey ? livingCatWorldDefaultFrame(scene, this.variant) : 0;
    const startX = this.loco.x;
    const startY = this.loco.y;

    this.shadow = scene.add
      .ellipse(startX, startY - 1, 15, 6, 0x22151c, 0.36)
      .setVisible(false);

    this.sprite = scene.add
      .sprite(startX, startY, texKey, startFrame)
      .setOrigin(0.5, 0.85)
      .setVisible(false);

    this.applySpriteScale();
    this.sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });
    this.sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 22) {
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
    const licensedKey = livingCatWorldTextureKey(this.scene, variant);
    const texKey = licensedKey ?? getLivingCatTextureKey(variant, accessory);
    const frame = licensedKey ? livingCatWorldDefaultFrame(this.scene, variant) : 0;
    this.sprite.setTexture(texKey, frame);
    this.applySpriteScale();
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
    if (driver) this.applySpriteScale();
  }

  getVisualIdentity(): { variant: CatCoatVariantId; accessory: CatAccessoryId; name: string } {
    return {
      variant: this.variant,
      accessory: this.accessory,
      name: this.petSnapshot?.name ?? 'Bé mèo',
    };
  }

  setCareCloseUp(active: boolean): void {
    this.careCloseUp = active;
    this.applySpriteScale();
    const depthBoost = active ? 200 : 0;
    this.sprite.setDepth(Math.round(this.sprite.y) + depthBoost);
    if (active) {
      this.playAnimState('sit_south');
      this.spawnFloatingBubble('Mrow?');
    }
  }

  triggerCareStroke(zone: 'head' | 'chin' | 'back'): void {
    const anim: PetAnimState =
      zone === 'back' ? 'groom' : zone === 'chin' ? 'sit_south' : 'happy_hop';
    this.playAnimState(anim);
    const bubble = zone === 'chin' ? 'Purr~' : zone === 'head' ? '❤️' : 'Mlem';
    this.spawnFloatingBubble(bubble);
  }

  private applySpriteScale(): void {
    const licensed = livingCatLicensedPackReady(this.scene, this.variant);
    const worldScale = licensed ? livingCatWorldScale(this.scene, this.variant) : LIVING_PET_WORLD_SCALE;
    const careScale = livingCat32PackReady(this.scene, this.variant) ? 2.4 : LIVING_PET_CARE_SCALE;
    const scale = this.careCloseUp
      ? careScale
      : this.livingDriver
        ? worldScale
        : licensed
          ? worldScale
          : 1;
    this.sprite.setScale(scale);
  }

  applyLivingLocomotion(loco: PetLocomotionSnapshot, bubbleText: string | null): void {
    const now = Date.now();
    const dtSec = this.lastLocoAtMs > 0 ? Math.min(0.1, Math.max(0.008, (now - this.lastLocoAtMs) / 1000)) : 0.016;
    this.lastLocoAtMs = now;
    this.loco = loco;
    this.sprite.setPosition(Math.round(loco.x), Math.round(loco.y));
    this.syncShadowAndLabel();
    this.playAnimState(loco.animState);
    if (bubbleText) {
      this.spawnFloatingBubble(bubbleText);
    } else {
      this.tickFloatingBubble(dtSec);
    }
  }

  teleportNear(x: number, y: number): void {
    this.loco = createLocomotionSnapshot(x, y);
    this.targetX = x;
    this.targetY = y;
    this.livingDriver?.teleportTo(x, y);
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.syncShadowAndLabel();
  }

  syncSnapshot(pet: PetSnapshot | null, currentMapId: import('../../shared/types').MapId): void {
    this.petSnapshot = pet;
    this.livingDriver?.seedFromSnapshot(pet);
    const show = pet === null ? currentMapId === 'home' : FOLLOW_CAT_MAPS.has(currentMapId);
    this.nameTag.setText(pet ? pet.name : 'Mèo con');
    this.setVisible(show);
    if (show) {
      this.syncShadowAndLabel();
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
    if (this.livingDriver && this.petSnapshot) return;
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
      this.tickAmbientBubble(dtSec, 'Zzz');
      this.tickFloatingBubble(dtSec);
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

    this.tickFloatingBubble(dtSec);
  }

  private tickFloatingBubble(dtSec: number): void {
    if (this.bubble && this.bubble.active) {
      this.bubble.y -= 10 * dtSec;
      this.bubble.alpha = Math.max(0, this.bubble.alpha - 0.55 * dtSec);
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
    const licensedKey = livingCatWorldTextureKey(this.scene, this.variant);
    if (licensedKey) {
      const animKey = livingCatWorldAnimKey(this.scene, state, this.variant);
      if (!this.scene.anims.exists(animKey)) return;
      if (this.sprite.texture.key !== licensedKey) {
        this.sprite.setTexture(licensedKey, livingCatWorldDefaultFrame(this.scene, this.variant));
      }
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey, true);
      }
      return;
    }
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
