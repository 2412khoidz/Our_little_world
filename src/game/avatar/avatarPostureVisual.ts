import type Phaser from 'phaser';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import { cardinalFromFacing8, type Facing8 } from '../../shared/movement/facing8';
import { avatarWalkAnimKey } from '../art/avatarAtlasLayout';
import { avatarIdleFrame } from '../art/phaserAvatarTexture';

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
  running = false,
): void {
  const cardinal = cardinalFromFacing8(facing);
  if (moving) {
    resetAvatarSpriteOrigin(sprite);
    const prefix = running ? 'run' : 'walk';
    const moveKey = running ? `${textureKey}:run-${facing}` : avatarWalkAnimKey(textureKey, facing);
    if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === moveKey) return;
    if (scene.anims.exists(moveKey)) {
      sprite.play(moveKey, true);
      return;
    }
    const cardinalMove = `${textureKey}:${prefix}-${cardinal}`;
    if (scene.anims.exists(cardinalMove)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== cardinalMove) {
        sprite.play(cardinalMove, true);
      }
      return;
    }
    const fallbackWalk = avatarWalkAnimKey(textureKey, cardinal);
    if (scene.anims.exists(fallbackWalk)) {
      sprite.play(fallbackWalk, true);
    }
    return;
  }

  if (posture === 'none') {
    resetAvatarSpriteOrigin(sprite);
    const idleKey = `${textureKey}:idle-${cardinal}`;
    if (scene.anims.exists(idleKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== idleKey) {
        sprite.play(idleKey, true);
      }
      return;
    }
    sprite.stop();
    sprite.setFrame(avatarIdleFrame(textureKey, cardinal));
    return;
  }

  if (posture === 'hug' || posture === 'hold_hands') {
    resetAvatarSpriteOrigin(sprite);
    const standingFacing = posture === 'hold_hands' ? 'down' : cardinal;
    const idleKey = `${textureKey}:idle-${standingFacing}`;
    if (scene.anims.exists(idleKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== idleKey) {
        sprite.play(idleKey, true);
      }
      return;
    }
    sprite.stop();
    sprite.setFrame(avatarIdleFrame(textureKey, standingFacing));
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

  if (posture === 'sit_sofa' || posture === 'sit_bench') {
    // Horizontal sofas & benches face South toward camera; use front-facing frame instead of profile sit sprite
    sprite.setOrigin(0.5, 0.82);
    const frontIdleKey = `${textureKey}:idle-down`;
    if (scene.anims.exists(frontIdleKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== frontIdleKey) {
        sprite.play(frontIdleKey, true);
      }
      return;
    }
    sprite.stop();
    sprite.setFrame(avatarIdleFrame(textureKey, 'down'));
    return;
  }

  if (posture === 'sit_study') {
    resetAvatarSpriteOrigin(sprite);
    const sitKey = `${textureKey}:sit-up`;
    if (scene.anims.exists(sitKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== sitKey) {
        sprite.play(sitKey, true);
      }
    }
  }
}
