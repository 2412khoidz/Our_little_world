import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import type { PetActionType, PetSnapshot } from '../../shared/pet/petTypes';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import extIds from '../art/worldExtendedArtIds.json';

type FacingCardinal = 'South' | 'East' | 'North' | 'West';

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
  private readonly shadow: Phaser.GameObjects.Sprite;
  private readonly nameTag: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Text | null = null;

  private petSnapshot: PetSnapshot | null = null;
  private visible = false;
  private studyMode = false;

  private targetX = 13.5 * TILE_SIZE;
  private targetY = 10.2 * TILE_SIZE;
  private facing: FacingCardinal = 'South';
  private nextDecisionAtMs = 0;
  private reactionUntilMs = 0;
  private reactionAnim: 'Happy_South' | 'Sleep_South' = 'Happy_South';
  private bubbleTimerMs = 0;

  constructor(scene: Phaser.Scene, onTap: () => void) {
    this.scene = scene;

    const startX = 13.5 * TILE_SIZE;
    const startY = 10.2 * TILE_SIZE;

    const hasShadow =
      scene.textures.exists(WORLD_PROPS_KEY) &&
      scene.textures.get(WORLD_PROPS_KEY).has(`${extIds.sheets.cat_orange_shadow}:48`);

    this.shadow = scene.add
      .sprite(
        startX,
        startY,
        WORLD_PROPS_KEY,
        hasShadow ? `${extIds.sheets.cat_orange_shadow}:48` : `${extIds.sheets.cat_orange}:48`,
      )
      .setOrigin(0.5, 0.85)
      .setScale(1.25)
      .setAlpha(hasShadow ? 0.85 : 0.25)
      .setVisible(false);

    this.sprite = scene.add
      .sprite(startX, startY, WORLD_PROPS_KEY, `${extIds.sheets.cat_orange}:48`)
      .setOrigin(0.5, 0.85)
      .setScale(1.25)
      .setVisible(false);

    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() <= 14) {
        onTap();
      }
    });

    this.nameTag = scene.add
      .text(startX, startY - 19, 'Quýt', {
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

  syncSnapshot(pet: PetSnapshot | null, currentMapId: 'home' | 'garden'): void {
    this.petSnapshot = pet;
    const show = currentMapId === 'home';
    this.nameTag.setText(pet ? pet.name : 'Mèo cam');
    this.setVisible(show);
    if (show && !this.sprite.anims.isPlaying) {
      this.playSyncedAnim(pet ? 'Idle_South' : 'Sleep_South');
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
    this.reactionAnim = 'Happy_South';
    if (action === 'feed' || action === 'water') {
      this.targetX = FOOD_BOWL_SPOT.x;
      this.targetY = FOOD_BOWL_SPOT.y;
    }
    this.spawnFloatingBubble(action === 'feed' ? '❤️🐟' : action === 'water' ? '💧✨' : '❤️');
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  isNearbyTile(tileX: number, tileY: number): boolean {
    const cx = this.sprite.x / TILE_SIZE;
    const cy = this.sprite.y / TILE_SIZE;
    return Math.hypot(tileX - cx, tileY - cy) <= 2.4;
  }

  update(dtSec: number): void {
    if (!this.visible) return;
    const now = Date.now();

    // Unadopted kitty sleeps cutely in the pet corner Waiting to be named
    if (!this.petSnapshot) {
      this.sprite.setPosition(13.6 * TILE_SIZE, 10.3 * TILE_SIZE);
      this.syncShadowAndLabel();
      this.playSyncedAnim('Sleep_South');
      this.tickAmbientBubble(dtSec, 'zz');
      return;
    }

    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const speed = 28;
      const step = Math.min(speed * dtSec, dist);
      this.sprite.x += (dx / dist) * step;
      this.sprite.y += (dy / dist) * step;
      this.facing =
        Math.abs(dx) > Math.abs(dy)
          ? dx >= 0
            ? 'East'
            : 'West'
          : dy >= 0
            ? 'South'
            : 'North';
      this.syncShadowAndLabel();
      this.playSyncedAnim(`Walk_${this.facing}`);
    } else if (now < this.reactionUntilMs) {
      this.syncShadowAndLabel();
      this.playSyncedAnim(this.reactionAnim);
    } else if (this.studyMode || this.petSnapshot.emotion === 'sleepy') {
      this.syncShadowAndLabel();
      this.playSyncedAnim('Sleep_South');
      this.tickAmbientBubble(dtSec, '~');
    } else {
      this.syncShadowAndLabel();
      const shouldNap = Math.floor(now / 12000) % 3 === 2;
      this.playSyncedAnim(shouldNap ? 'Sleep_South' : `Idle_${this.facing}`);
      if (shouldNap) this.tickAmbientBubble(dtSec, 'Zzz');

      if (now >= this.nextDecisionAtMs) {
        this.nextDecisionAtMs = now + 5500 + ((now % 4) * 1000);
        // Deterministic waypoint selection derived cleanly from server clock & pet version
        const seed = Math.floor(now / 6000) + this.petSnapshot.version;
        const wp = HOME_WAYPOINTS[seed % HOME_WAYPOINTS.length]!;
        this.targetX = wp.x;
        this.targetY = wp.y;
      }
    }

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
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 1);
    this.shadow.setDepth(depth - 1);
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - 18);
  }

  private playSyncedAnim(tag: string): void {
    const mainKey = `olw-cat-${tag}`;
    if (this.scene.anims.exists(mainKey) && this.sprite.anims.currentAnim?.key !== mainKey) {
      this.sprite.play(mainKey, true);
    }
    const shKey = `olw-cat-shadow-${tag}`;
    if (this.scene.anims.exists(shKey) && this.shadow.anims.currentAnim?.key !== shKey) {
      this.shadow.play(shKey, true);
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
      .text(this.sprite.x + 4, this.sprite.y - 24, text, {
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
