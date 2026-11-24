import Phaser from 'phaser';
import type { Direction } from '../../shared/types';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { ensureLivingItemTextures, LIVING_ITEMS_ATLAS_KEY } from '../pet/petSpriteBuilder';

export class HeldItemRenderer {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    ensureLivingItemTextures(scene);
    this.image = scene.add
      .image(0, 0, LIVING_ITEMS_ATLAS_KEY, 'food_kibble')
      .setOrigin(0.5, 0.5)
      .setScale(0.75)
      .setVisible(false);
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
    if (held.itemKind === 'none' || !held.iconId) {
      this.image.setVisible(false);
      return;
    }

    if (this.image.frame.name !== held.iconId) {
      this.image.setFrame(held.iconId);
    }

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
