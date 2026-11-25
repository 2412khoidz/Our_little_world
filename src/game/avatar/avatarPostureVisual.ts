import type Phaser from 'phaser';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import type { Direction } from '../../shared/types';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';

const DEFAULT_ORIGIN_Y = 0.88;
const LIE_ORIGIN_Y = 0.95;

export function resetAvatarSpriteOrigin(sprite: Phaser.GameObjects.Sprite): void {
  sprite.setOrigin(0.5, DEFAULT_ORIGIN_Y);
}

export function playAvatarPostureAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  posture: CouplePostureKind,
  facing: Direction,
  moving: boolean,
): void {
  if (moving || posture === 'none') {
    resetAvatarSpriteOrigin(sprite);
    const walkKey = `${textureKey}:walk-${facing}`;
    if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === walkKey) return;
    if (scene.anims.exists(walkKey)) {
      sprite.play(walkKey, true);
    } else {
      sprite.stop();
      sprite.setFrame(getIdleFrameIndex(facing));
    }
    return;
  }

  if (posture === 'hug') {
    resetAvatarSpriteOrigin(sprite);
    const hugFacing = facing;
    const sitKey = `${textureKey}:sit-${hugFacing}`;
    if (scene.anims.exists(sitKey)) {
      sprite.play(sitKey, true);
    } else {
      sprite.stop();
      sprite.setFrame(getIdleFrameIndex(hugFacing));
    }
    return;
  }

  if (posture === 'lie_bed') {
    sprite.setOrigin(0.5, LIE_ORIGIN_Y);
    const lieKey = `${textureKey}:lie-${facing}`;
    if (scene.anims.exists(lieKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== lieKey) {
        sprite.play(lieKey, true);
      }
      return;
    }
    const sitKey = `${textureKey}:sit-${facing}`;
    if (scene.anims.exists(sitKey)) {
      sprite.play(sitKey, true);
      return;
    }
    sprite.stop();
    sprite.setFrame(getIdleFrameIndex('down'));
    return;
  }

  if (posture === 'sit_study' || posture === 'sit_sofa' || posture === 'sit_bench') {
    resetAvatarSpriteOrigin(sprite);
    const sitFacing = posture === 'sit_study' ? 'up' : facing;
    const sitKey = `${textureKey}:sit-${sitFacing}`;
    if (scene.anims.exists(sitKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== sitKey) {
        sprite.play(sitKey, true);
      }
      return;
    }
    sprite.stop();
    sprite.setFrame(getIdleFrameIndex(sitFacing));
  }
}