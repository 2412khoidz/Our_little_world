import type Phaser from 'phaser';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import { cardinalFromFacing8, type Facing8 } from '../../shared/movement/facing8';
import { avatarWalkAnimKey } from '../art/avatarAtlasLayout';
import { avatarIdleFrame } from '../art/phaserAvatarTexture';
import {
  coupleHugFrameName,
  ensureCoupleHugFrames,
  getCoupleHugTextureKey,
} from './couplePairedPoseTextures';

const DEFAULT_ORIGIN_Y = 0.88;
const LIE_ORIGIN_Y = 0.95;

export function resetAvatarSpriteOrigin(sprite: Phaser.GameObjects.Sprite): void {
  sprite.setOrigin(0.5, DEFAULT_ORIGIN_Y);
}

function restoreBaseTextureIfNeeded(sprite: Phaser.GameObjects.Sprite, textureKey: string): void {
  if (sprite.texture?.key !== textureKey && sprite.scene.textures.exists(textureKey)) {
    sprite.stop();
    sprite.setTexture(textureKey, avatarIdleFrame(textureKey, 'down'));
  }
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
    restoreBaseTextureIfNeeded(sprite, textureKey);
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
    restoreBaseTextureIfNeeded(sprite, textureKey);
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

  if (posture === 'hug') {
    resetAvatarSpriteOrigin(sprite);
    const embraceDir: 'left' | 'right' = cardinal === 'left' ? 'left' : 'right';
    if (ensureCoupleHugFrames(scene, textureKey)) {
      const hugTexKey = getCoupleHugTextureKey(textureKey);
      const hugFrame = coupleHugFrameName(embraceDir);
      sprite.stop();
      if (sprite.texture?.key !== hugTexKey || sprite.frame?.name !== hugFrame) {
        sprite.setTexture(hugTexKey, hugFrame);
      }
      return;
    }
  }

  if (
    posture === 'hug' ||
    posture === 'hold_hands' ||
    posture === 'kiss' ||
    posture === 'lean_shoulder' ||
    posture === 'dance' ||
    posture === 'give_flower'
  ) {
    restoreBaseTextureIfNeeded(sprite, textureKey);
    resetAvatarSpriteOrigin(sprite);
    const standingFacing = posture === 'lean_shoulder' ? 'down' : cardinal;
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
    restoreBaseTextureIfNeeded(sprite, textureKey);
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
    restoreBaseTextureIfNeeded(sprite, textureKey);
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
    restoreBaseTextureIfNeeded(sprite, textureKey);
    resetAvatarSpriteOrigin(sprite);
    const sitKey = `${textureKey}:sit-up`;
    if (scene.anims.exists(sitKey)) {
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== sitKey) {
        sprite.play(sitKey, true);
      }
    }
  }
}
