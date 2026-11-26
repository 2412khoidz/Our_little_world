import Phaser from 'phaser';
import type { Direction } from '../../shared/types';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import {
  cabacosHeldToolTextureKey,
  heldSeedCropSprite,
} from '../../shared/donor/cabacos-79e423d/farmHeldToolPresentation';
import { ensureLivingItemTextures, LIVING_ITEMS_ATLAS_KEY } from '../pet/petSpriteBuilder';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import type { DonorToolActionState } from './donorPydewToolController';

export class HeldItemRenderer {
  private readonly image: Phaser.GameObjects.Image;
  private boundTextureKey = LIVING_ITEMS_ATLAS_KEY;
  private boundFrameKey = '';

  constructor(scene: Phaser.Scene) {
    ensureLivingItemTextures(scene);
    this.image = scene.add
      .image(0, 0, LIVING_ITEMS_ATLAS_KEY, 'food_kibble')
      .setOrigin(0.5, 0.5)
      .setScale(0.55)
      .setVisible(false);
  }

  private applyHeldVisual(held: HeldItemState): boolean {
    const scene = this.image.scene;
    const cabTool = held.itemSku ? cabacosHeldToolTextureKey(held.itemSku) : null;
    if (cabTool && scene.textures.exists(cabTool)) {
      if (this.boundTextureKey !== cabTool || this.boundFrameKey !== '') {
        this.image.setTexture(cabTool);
        this.boundTextureKey = cabTool;
        this.boundFrameKey = '';
      }
      return true;
    }
    const seedSprite = held.itemSku?.startsWith('seed_') ? heldSeedCropSprite(held.itemSku) : null;
    if (seedSprite && scene.textures.exists(seedSprite.textureKey)) {
      if (seedSprite.kind === 'spritesheet') {
        if (this.boundTextureKey !== seedSprite.textureKey || this.boundFrameKey !== `${seedSprite.frame}`) {
          this.image.setTexture(seedSprite.textureKey, seedSprite.frame);
          this.boundTextureKey = seedSprite.textureKey;
          this.boundFrameKey = `${seedSprite.frame}`;
        }
      } else if (this.boundTextureKey !== seedSprite.textureKey || this.boundFrameKey !== '') {
        this.image.setTexture(seedSprite.textureKey);
        this.boundTextureKey = seedSprite.textureKey;
        this.boundFrameKey = '';
      }
      return true;
    }
    const propsFrame = held.propsIconId?.trim();
    if (propsFrame && scene.textures.exists(WORLD_PROPS_KEY) && scene.textures.get(WORLD_PROPS_KEY).has(propsFrame)) {
      if (this.boundTextureKey !== WORLD_PROPS_KEY || this.boundFrameKey !== propsFrame) {
        this.image.setTexture(WORLD_PROPS_KEY, propsFrame);
        this.boundTextureKey = WORLD_PROPS_KEY;
        this.boundFrameKey = propsFrame;
      }
      return true;
    }
    if (held.iconId) {
      if (this.boundTextureKey !== LIVING_ITEMS_ATLAS_KEY || this.boundFrameKey !== held.iconId) {
        this.image.setTexture(LIVING_ITEMS_ATLAS_KEY, held.iconId);
        this.boundTextureKey = LIVING_ITEMS_ATLAS_KEY;
        this.boundFrameKey = held.iconId;
      }
      return true;
    }
    return false;
  }

  sync(
    avatarX: number,
    avatarY: number,
    avatarDepth: number,
    facing: Direction,
    moving: boolean,
    held: HeldItemState,
    timeMs: number,
    avatarScale = 1,
    toolAction: DonorToolActionState | null = null,
  ): void {
    const toolHeld = held.itemKind === 'tool';
    const actionActive = Boolean(toolAction?.active) || (toolHeld && held.temporaryActionState !== 'none');

    // Never paste selected hotbar tools continuously over the character while idling or walking!
    if (held.itemKind === 'none' || (toolHeld && !actionActive) || !this.applyHeldVisual(held)) {
      this.image.setVisible(false);
      this.image.setRotation(0);
      this.image.setFlipX(false);
      return;
    }

    if (toolHeld && actionActive) {
      const p = toolAction?.active ? toolAction.progress : (Math.sin(timeMs / 95) * 0.5 + 0.5);
      const isWaterCan = toolAction?.toolKind === 'water' || held.itemSku?.includes('water');
      const useFacing = toolAction?.active ? toolAction.facing : facing;
      this.image.setScale((isWaterCan ? 0.54 : 0.6) * avatarScale);
      this.image.setFlipX(useFacing === 'left');
      this.image.setOrigin(
        isWaterCan ? 0.5 : useFacing === 'left' ? 0.8 : 0.2,
        isWaterCan ? 0.5 : 0.85,
      );

      // Directional swing arc (wind-up -> impact strike) or watering-can tilt
      const swingCurve = p < 0.35
        ? -0.82 * (p / 0.35)
        : -0.82 + 1.75 * Math.min(1, (p - 0.35) / 0.45);
      const rot = isWaterCan
        ? (useFacing === 'left' ? -0.45 : 0.45) * Math.sin(p * Math.PI)
        : (useFacing === 'left' ? -swingCurve : swingCurve);

      let ox: number;
      let oy: number;
      let depth = avatarDepth + 3;
      if (useFacing === 'left') {
        ox = -6 * avatarScale;
        oy = -5.5 * avatarScale;
      } else if (useFacing === 'right') {
        ox = 6 * avatarScale;
        oy = -5.5 * avatarScale;
      } else if (useFacing === 'up') {
        ox = 3.5 * avatarScale;
        oy = -8 * avatarScale;
        depth = avatarDepth - 2;
      } else {
        ox = -3 * avatarScale;
        oy = -3 * avatarScale;
      }

      this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
      this.image.setRotation(rot);
      this.image.setDepth(depth);
      this.image.setVisible(true);
      return;
    }

    // Carried non-tool items (gifts, flowers, food, crops, seeds): natural hands/waist carry pose
    const seedHeld = Boolean(held.itemSku?.startsWith('seed_'));
    this.image.setOrigin(0.5, 0.5);
    this.image.setFlipX(false);
    this.image.setRotation(0);
    this.image.setScale((seedHeld ? 0.2 : 0.54) * avatarScale);

    const walkBob = moving ? Math.sin(timeMs * 0.014) * 0.7 * avatarScale : 0;
    let ox: number;
    let oy: number;
    let depth = avatarDepth + 3;

    if (facing === 'left') {
      ox = -5.5 * avatarScale;
      oy = -5 * avatarScale + walkBob;
    } else if (facing === 'right') {
      ox = 5.5 * avatarScale;
      oy = -5 * avatarScale + walkBob;
    } else if (facing === 'up') {
      ox = 0;
      oy = -6.5 * avatarScale + walkBob;
      depth = avatarDepth - 4;
    } else {
      ox = 0;
      oy = -4.5 * avatarScale + walkBob;
      depth = avatarDepth + 4;
    }

    this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
    this.image.setDepth(depth);
    this.image.setVisible(true);
  }

  destroy(): void {
    this.image.destroy();
  }
}
