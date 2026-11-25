import Phaser from 'phaser';
import type { AvatarConfig } from '../../shared/types';
import { AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED } from '../../shared/assets/avatarGameplayPolicy';
import { AVATAR_ATLAS_KEY } from './atlasProfile';
import { buildAvatarSpritesheetCanvas, getAvatarTextureKey, getIdleFrameIndex } from './avatarSpriteBuilder';
import {
  donorGameplayTextureForConfig,
  registerDonorPydewFarmerAnims,
} from './donorPydewFarmerAvatarTexture';

export {
  avatarIdleFrame,
  avatarIdleFrameForFacing8,
  isDonorGameplayAvatarTexture,
  isDonorPunyAvatarTexture,
  playDonorToolUseAnim,
} from './donorPydewFarmerAvatarTexture';
import { AVATAR_ATLAS_ROW_LIE, AVATAR_ATLAS_ROW_SIT, AVATAR_ATLAS_ROW_WALK } from './avatarAtlasLayout';
import {
  AVATAR_DIRECTIONS,
  AVATAR_FRAME_COUNT,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  buildWorldAvatarCanvas,
} from './worldAvatarCanvas';

import type { Direction } from '../../shared/types';

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

function donorGameplayPreferred(scene: Phaser.Scene, config: AvatarConfig): string | null {
  const key = donorGameplayTextureForConfig(config);
  if (!scene.textures.exists(key)) return null;
  registerDonorPydewFarmerAnims(scene, key);
  return key;
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
): void {
  const xBase = directionStrideX(direction);
  const animKey = `${key}:${animSuffix}-${direction}`;
  if (scene.anims.exists(animKey)) return;
  const frames: string[] = [];
  for (let i = 0; i < AVATAR_FRAME_COUNT; i += 1) {
    const frameName = `${animSuffix}-${direction}-${i}`;
    tex.add(frameName, 0, xBase + i * AVATAR_FRAME_WIDTH, rowY(atlasRow), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
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
  const donorKey = donorGameplayPreferred(scene, config);
  if (donorKey) return donorKey;

  const key = getAvatarTextureKey(config);
  if (scene.textures.exists(key)) return key;

  const source = scene.textures.exists(AVATAR_ATLAS_KEY)
    ? scene.textures.get(AVATAR_ATLAS_KEY).getSourceImage()
    : null;
  const atlasCanvas = source && buildWorldAvatarCanvas(source as CanvasImageSource, config);
  const procSheet = atlasCanvas ? null : buildAvatarSpritesheetCanvas(config);
  const tex = scene.textures.addCanvas(key, atlasCanvas || procSheet!);
  if (!tex) return key;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const usingAtlasLayout = Boolean(atlasCanvas);

  for (const direction of LEGACY_DIRECTIONS) {
    const base = getIdleFrameIndex(direction);
    let frames: (number | string)[] = [base + 1, base, base + 2, base];
    if (atlasCanvas) {
      const x = directionStrideX(direction);
      tex.add(base, 0, x, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 1, 0, x + AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 2, 0, x + 4 * AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      frames = Array.from({ length: AVATAR_FRAME_COUNT }, (_, i) => {
        const frame = direction + '-walk-' + i;
        tex.add(frame, 0, x + i * AVATAR_FRAME_WIDTH, rowY(AVATAR_ATLAS_ROW_WALK), AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
        return frame;
      });
      registerDirectionalClips(scene, key, tex, direction, 'sit', AVATAR_ATLAS_ROW_SIT, 4, -1);
      registerDirectionalClips(scene, key, tex, direction, 'lie', AVATAR_ATLAS_ROW_LIE, 3, -1);
    } else {
      for (let col = 0; col < 3; col += 1) {
        tex.add(base + col, 0, col * 16, base / 3 * 24, 16, 24);
      }
    }
    const animKey = key + ':walk-' + direction;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: frames.map((frame) => ({ key, frame })),
        frameRate: atlasCanvas ? 10 : 8,
        repeat: -1,
      });
    }
    if (!usingAtlasLayout) {
      const sitAnimKey = key + ':sit-' + direction;
      if (!scene.anims.exists(sitAnimKey)) {
        scene.anims.create({
          key: sitAnimKey,
          frames: [{ key, frame: base }],
          frameRate: 4,
          repeat: -1,
        });
      }
      const lieAnimKey = key + ':lie-' + direction;
      if (!scene.anims.exists(lieAnimKey)) {
        scene.anims.create({
          key: lieAnimKey,
          frames: [{ key, frame: base }],
          frameRate: 3,
          repeat: -1,
        });
      }
    }
  }

  if (procSheet && !usingAtlasLayout && !AVATAR_DIAGONAL_ALPHA_COMPOSITE_BANNED) {
    // Diagonal procedural rows removed — gameplay diagonals use donor PyDew cardinal clips.
  }

  return key;
}