import type Phaser from 'phaser';
import type { AvatarConfig, Direction } from '../../shared/types';
import { AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED } from '../../shared/assets/avatarGameplayPolicy';
import { cardinalFromFacing8, FACING8_VALUES, type Facing8 } from '../../shared/movement/facing8';
import { AVATAR_ATLAS_KEY } from './atlasProfile';
import { buildAvatarSpritesheetCanvas, getAvatarTextureKey, getIdleFrameIndex } from './avatarSpriteBuilder';
import {
  AVATAR_ATLAS_ROW_IDLE,
  AVATAR_ATLAS_ROW_LIE,
  AVATAR_ATLAS_ROW_PHONE,
  AVATAR_ATLAS_ROW_SIT,
  AVATAR_ATLAS_ROW_WALK,
} from './avatarAtlasLayout';
import {
  AVATAR_DIRECTIONS,
  AVATAR_FRAME_COUNT,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  buildWorldAvatarCanvas,
} from './worldAvatarCanvas';
import type { PydewFarmerAction } from '../../shared/donor/pydewFarmerCharacterSheet';

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

export function isCozyHumanAvatarTexture(textureKey: string): boolean {
  return textureKey.startsWith('avatar-') || textureKey.startsWith('avatar:');
}

export function isDonorGameplayAvatarTexture(textureKey: string): boolean {
  return isCozyHumanAvatarTexture(textureKey);
}

/** @deprecated legacy helper kept for compatibility — cozy human V2 uses unified scale 1 */
export function isDonorPunyAvatarTexture(_textureKey: string): boolean {
  return false;
}

export function avatarIdleFrame(_textureKey: string, direction: Direction): number {
  return getIdleFrameIndex(direction);
}

export function avatarIdleFrameForFacing8(_textureKey: string, facing: Facing8): number {
  return getIdleFrameIndex(cardinalFromFacing8(facing));
}

export function playCozyActionMotion(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  _textureKey: string,
  facing: Direction,
  action: PydewFarmerAction | 'tool' | 'plant' | 'harvest' = 'hoe',
): void {
  if (!sprite.scene) return;
  scene.tweens.killTweensOf(sprite);
  const baseScaleX = sprite.scaleX || 1;
  const baseScaleY = sprite.scaleY || 1;
  sprite.setRotation(0);

  if (action === 'plant') {
    const nudgeX = facing === 'left' ? -1.5 : facing === 'right' ? 1.5 : 0;
    const origX = sprite.x;
    scene.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 1.06,
      scaleY: baseScaleY * 0.84,
      x: origX + nudgeX,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (sprite.scene) {
          sprite.setPosition(origX, sprite.y);
          sprite.setScale(baseScaleX, baseScaleY);
        }
      },
    });
    return;
  }

  if (action === 'harvest') {
    const origY = sprite.y;
    scene.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 0.94,
      scaleY: baseScaleY * 1.1,
      y: origY - 2.5,
      rotation: facing === 'left' ? -0.05 : 0.05,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (sprite.scene) {
          sprite.setPosition(sprite.x, origY);
          sprite.setRotation(0);
          sprite.setScale(baseScaleX, baseScaleY);
        }
      },
    });
    return;
  }

  const tilt = action === 'fish' ? (facing === 'left' ? -0.06 : 0.06) : facing === 'left' ? -0.1 : 0.1;
  scene.tweens.add({
    targets: sprite,
    scaleY: baseScaleY * 0.92,
    rotation: tilt,
    duration: 115,
    yoyo: true,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      if (sprite.scene) {
        sprite.setRotation(0);
        sprite.setScale(baseScaleX, baseScaleY);
      }
    },
  });
}

/** Plays honest non-combat tool motion on the consistent cozy human rig. */
export function playDonorToolUseAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  facing: Direction,
  action: PydewFarmerAction | 'tool' | 'plant' | 'harvest' = 'hoe',
): void {
  playCozyActionMotion(scene, sprite, textureKey, facing, action);
}

function rowY(row: number): number {
  return row * AVATAR_FRAME_HEIGHT;
}

function directionStrideX(direction: Direction): number {
  const index = AVATAR_DIRECTIONS.indexOf(direction);
  return index * AVATAR_FRAME_COUNT * AVATAR_FRAME_WIDTH;
}

function registerDirectionalClips(
  scene: Phaser.Scene,
  key: string,
  tex: Phaser.Textures.CanvasTexture,
  direction: Direction,
  animSuffix: string,
  atlasRow: number,
  frameRate: number,
  repeat: number,
  frameCount = AVATAR_FRAME_COUNT,
): void {
  const xBase = directionStrideX(direction);
  const animKey = `${key}:${animSuffix}-${direction}`;
  if (scene.anims.exists(animKey)) return;
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const frameName = `${animSuffix}-${direction}-${i}`;
    if (!tex.has(frameName)) {
      tex.add(frameName, 0, xBase + i * AVATAR_FRAME_WIDTH, rowY(atlasRow), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    }
    frames.push(frameName);
  }
  scene.anims.create({
    key: animKey,
    frames: frames.map((frame) => ({ key, frame })),
    frameRate,
    repeat,
  });
}

export function ensurePhaserAvatarTexture(scene: Phaser.Scene, config: AvatarConfig): string {
  const key = getAvatarTextureKey(config);
  if (scene.textures.exists(key)) return key;

  const source = scene.textures.exists(AVATAR_ATLAS_KEY)
    ? scene.textures.get(AVATAR_ATLAS_KEY).getSourceImage()
    : null;
  const atlasCanvas = source && buildWorldAvatarCanvas(source as CanvasImageSource, config);
  const procSheet = atlasCanvas ? null : buildAvatarSpritesheetCanvas(config);
  const tex = scene.textures.addCanvas(key, atlasCanvas || procSheet!);
  if (!tex) return key;
  tex.setFilter(0); // Phaser.Textures.FilterMode.NEAREST
  const usingAtlasLayout = Boolean(atlasCanvas);

  for (const direction of LEGACY_DIRECTIONS) {
    const base = getIdleFrameIndex(direction);
    let walkFrames: (number | string)[] = [base + 1, base, base + 2, base];
    if (atlasCanvas) {
      const x = directionStrideX(direction);
      tex.add(base, 0, x, rowY(AVATAR_ATLAS_ROW_IDLE), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 1, 0, x + AVATAR_FRAME_WIDTH, rowY(AVATAR_ATLAS_ROW_WALK), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 2, 0, x + 4 * AVATAR_FRAME_WIDTH, rowY(AVATAR_ATLAS_ROW_WALK), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      walkFrames = Array.from({ length: AVATAR_FRAME_COUNT }, (_, i) => {
        const frame = `${direction}-walk-${i}`;
        tex.add(frame, 0, x + i * AVATAR_FRAME_WIDTH, rowY(AVATAR_ATLAS_ROW_WALK), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
        return frame;
      });
      registerDirectionalClips(scene, key, tex, direction, 'idle', AVATAR_ATLAS_ROW_IDLE, 5, -1);
      registerDirectionalClips(scene, key, tex, direction, 'sit', AVATAR_ATLAS_ROW_SIT, 4, -1);
      registerDirectionalClips(scene, key, tex, direction, 'phone', AVATAR_ATLAS_ROW_PHONE, 6, -1);
      registerDirectionalClips(scene, key, tex, direction, 'lie', AVATAR_ATLAS_ROW_LIE, 3, -1, 1);
    } else {
      for (let col = 0; col < 3; col += 1) {
        tex.add(base + col, 0, col * 16, (base / 3) * 24, 16, 24);
      }
      if (!scene.anims.exists(`${key}:idle-${direction}`)) {
        scene.anims.create({
          key: `${key}:idle-${direction}`,
          frames: [{ key, frame: base }],
          frameRate: 4,
          repeat: -1,
        });
      }
      if (!scene.anims.exists(`${key}:sit-${direction}`)) {
        scene.anims.create({
          key: `${key}:sit-${direction}`,
          frames: [{ key, frame: base }],
          frameRate: 4,
          repeat: -1,
        });
      }
      if (!scene.anims.exists(`${key}:lie-${direction}`)) {
        scene.anims.create({
          key: `${key}:lie-${direction}`,
          frames: [{ key, frame: base }],
          frameRate: 3,
          repeat: -1,
        });
      }
    }

    const walkAnimKey = `${key}:walk-${direction}`;
    if (!scene.anims.exists(walkAnimKey)) {
      scene.anims.create({
        key: walkAnimKey,
        frames: walkFrames.map((frame) => ({ key, frame })),
        frameRate: atlasCanvas ? 8.5 : 8,
        repeat: -1,
      });
    }

    const runAnimKey = `${key}:run-${direction}`;
    if (!scene.anims.exists(runAnimKey)) {
      scene.anims.create({
        key: runAnimKey,
        frames: walkFrames.map((frame) => ({ key, frame })),
        frameRate: atlasCanvas ? 13.5 : 12,
        repeat: -1,
      });
    }
  }

  for (const facing8 of FACING8_VALUES) {
    if (!facing8.includes('-')) continue;
    const cardinal = cardinalFromFacing8(facing8);
    for (const prefix of ['walk', 'run', 'idle', 'sit'] as const) {
      const aliasKey = `${key}:${prefix}-${facing8}`;
      const srcAnim = scene.anims.get(`${key}:${prefix}-${cardinal}`);
      if (!scene.anims.exists(aliasKey) && srcAnim) {
        scene.anims.create({
          key: aliasKey,
          frames: srcAnim.frames.map((f) => ({ key, frame: f.frame.name })),
          frameRate: srcAnim.frameRate,
          repeat: srcAnim.repeat,
        });
      }
    }
  }

  if (procSheet && !usingAtlasLayout && !AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED) {
    // Diagonal alpha composites remain banned on the gameplay path.
  }

  return key;
}
