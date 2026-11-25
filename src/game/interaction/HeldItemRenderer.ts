import Phaser from 'phaser';
import type { Direction } from '../../shared/types';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
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
    if (held.itemSku === 'tool_hoe' && scene.textures.exists('donor-cabacos-hoe')) {
      if (this.boundTextureKey !== 'donor-cabacos-hoe' || this.boundFrameKey !== '') {
        this.image.setTexture('donor-cabacos-hoe');
        this.boundTextureKey = 'donor-cabacos-hoe';
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
  ): void {
    if (held.itemKind === 'none' || !this.applyHeldVisual(held)) {
      this.image.setVisible(false);
      return;
    }

    const toolHeld = held.itemKind === 'tool';
    this.image.setScale(toolHeld ? 0.55 : 0.75);

    const walkBob = moving ? Math.sin(timeMs / 90) * 1.1 : 0;
    const actionBob = held.temporaryActionState !== 'none' ? -2 : 0;

    let ox: number;
    let oy: number;
    let depth = avatarDepth + 1;

    if (facing === 'left') {
      ox = -7;
      oy = -6 + walkBob + actionBob;
    } else if (facing === 'right') {
      ox = 7;
      oy = -6 + walkBob + actionBob;
    } else if (facing === 'up') {
      ox = 5;
      oy = -9 + walkBob + actionBob;
      depth = avatarDepth - 1;
    } else {
      ox = -5;
      oy = -6 + walkBob + actionBob;
    }

    this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
    this.image.setDepth(depth);
    this.image.setVisible(true);
  }

  destroy(): void {
    this.image.destroy();
  }
}
