import Phaser from 'phaser';
import type { Direction } from '../../shared/types';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import {
  cabacosHeldToolTextureKey,
  heldSeedCropSprite,
} from '../../shared/donor/cabacos-79e423d/farmHeldToolPresentation';
import { ensureLivingItemTextures, LIVING_ITEMS_ATLAS_KEY } from '../pet/petSpriteBuilder';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';

export class HeldItemRenderer {
  private readonly image: Phaser.GameObjects.Image;
  private boundTextureKey = LIVING_ITEMS_ATLAS_KEY;
  private boundFrameKey = '';

  constructor(scene: Phaser.Scene) {
    ensureLivingItemTextures(scene);
    this.image = scene.add
      .image(0, 0, LIVING_ITEMS_ATLAS_KEY, 'food_kibble')
      .setOrigin(0.5, 0.5)
      .setScale(0.75)
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
  ): void {
    if (held.itemKind === 'none' || !this.applyHeldVisual(held)) {
      this.image.setVisible(false);
      this.image.setRotation(0);
      return;
    }

    const toolHeld = held.itemKind === 'tool';
    const seedHeld = Boolean(held.itemSku?.startsWith('seed_'));
    const baseScale = toolHeld ? 0.56 : seedHeld ? 0.22 : 0.72;
    this.image.setScale(baseScale * avatarScale);

    const walkBob = moving ? Math.sin(timeMs / 90) * 1.1 * avatarScale : 0;
    const toolSwing =
      toolHeld && held.temporaryActionState === 'none' && moving
        ? Math.sin(timeMs / 120) * 1.3 * avatarScale
        : 0;
    const actionActive = held.temporaryActionState !== 'none';
    const actionBob = actionActive ? -2.2 * avatarScale : toolSwing;
    const swingAngle = actionActive
      ? (facing === 'left' ? -0.52 : 0.52) * Math.sin(timeMs / 75)
      : 0;

    let ox: number;
    let oy: number;
    let depth = avatarDepth + 1;

    if (facing === 'left') {
      ox = -7 * avatarScale;
      oy = -8 * avatarScale + walkBob + actionBob;
    } else if (facing === 'right') {
      ox = 7 * avatarScale;
      oy = -8 * avatarScale + walkBob + actionBob;
    } else if (facing === 'up') {
      ox = 5 * avatarScale;
      oy = -11 * avatarScale + walkBob + actionBob;
      depth = avatarDepth - 1;
    } else {
      ox = -5 * avatarScale;
      oy = -7 * avatarScale + walkBob + actionBob;
    }

    this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
    this.image.setRotation(swingAngle);
    this.image.setDepth(depth);
    this.image.setVisible(true);
  }

  destroy(): void {
    this.image.destroy();
  }
}
