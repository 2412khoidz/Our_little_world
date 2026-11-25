import type Phaser from 'phaser';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import { cardinalFromFacing8, type Facing8 } from '../../shared/movement/facing8';
import { avatarWalkAnimKey } from '../art/avatarAtlasLayout';
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
  facing: Facing8,
  moving: boolean,
): void {
  const cardinal = cardinalFromFacing8(facing);
  if (moving) {
    resetAvatarSpriteOrigin(sprite);
    const walkKey = avatarWalkAnimKey(textureKey, facing);
    if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === walkKey) return;
    if (scene.anims.exists(walkKey)) {
      sprite.play(walkKey, true);
      return;
    }
    const cardinalWalk = avatarWalkAnimKey(textureKey, cardinal);
    if (scene.anims.exists(cardinalWalk)) {
      sprite.play(cardinalWalk, true);
    }
    return;
  }

  if (posture === 'none') {
    resetAvatarSpriteOrigin(sprite);
    sprite.stop();
    sprite.setFrame(getIdleFrameIndex(cardinal));
    return;
  }

  if (posture === 'hug') {
    resetAvatarSpriteOrigin(sprite);
    const hugFacing = cardinal;
    const sitKey = `${textureKey}:sit-${hugFacing}`;
    if (scene.anims.exists(sitKey)) {
      sprite.play(sitKey, true);
    }
    return;
  }

  if (posture === 'lie_bed') {
    sprite.setOrigin(0.5, LIE_ORIGIN_Y);
    const lieKey = `${textureKey}:lie-${cardinal}`;
    if (scene.anims.exists(lieKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== lieKey) {
        sprite.play(lieKey, true);
      }
    }
    return;
  }

  if (posture === 'sit_study' || posture === 'sit_sofa' || posture === 'sit_bench') {
    resetAvatarSpriteOrigin(sprite);
    const sitFacing = posture === 'sit_study' ? 'up' : cardinal;
    const sitKey = `${textureKey}:sit-${sitFacing}`;
    if (scene.anims.exists(sitKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== sitKey) {
        sprite.play(sitKey, true);
      }
    }
  }
}