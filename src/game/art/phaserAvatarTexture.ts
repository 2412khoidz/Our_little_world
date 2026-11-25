import Phaser from 'phaser';
import type { AvatarConfig, Direction } from '../../shared/types';
import { AVATAR_ATLAS_KEY } from './atlasProfile';
import { buildAvatarSpritesheetCanvas, getAvatarTextureKey, getIdleFrameIndex } from './avatarSpriteBuilder';
import {
  AVATAR_DIRECTIONS,
  AVATAR_FRAME_COUNT,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  buildWorldAvatarCanvas,
} from './worldAvatarCanvas';

const LEGACY_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

export function ensurePhaserAvatarTexture(scene: Phaser.Scene, config: AvatarConfig): string {
  const key = getAvatarTextureKey(config);
  if (scene.textures.exists(key)) return key;

  const source = scene.textures.exists(AVATAR_ATLAS_KEY)
    ? scene.textures.get(AVATAR_ATLAS_KEY).getSourceImage()
    : null;
  const atlasCanvas = source && buildWorldAvatarCanvas(source as CanvasImageSource, config);
  const tex = scene.textures.addCanvas(key, atlasCanvas || buildAvatarSpritesheetCanvas(config));
  if (!tex) return key;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  for (const direction of LEGACY_DIRECTIONS) {
    const base = getIdleFrameIndex(direction);
    let frames: (number | string)[] = [base + 1, base, base + 2, base];
    let sitFrames: (number | string)[] = [base];
    if (atlasCanvas) {
      const x = AVATAR_DIRECTIONS.indexOf(direction) * AVATAR_FRAME_COUNT * AVATAR_FRAME_WIDTH;
      // Keep the existing numeric idle frame index and walk animation names.
      tex.add(base, 0, x, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 1, 0, x + AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      tex.add(base + 2, 0, x + 4 * AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
      frames = Array.from({ length: AVATAR_FRAME_COUNT }, (_, i) => {
        const frame = direction + '-walk-' + i;
        tex.add(frame, 0, x + i * AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
        return frame;
      });
      sitFrames = Array.from({ length: AVATAR_FRAME_COUNT }, (_, i) => {
        const frame = direction + '-sit-' + i;
        tex.add(frame, 0, x + i * AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT * 2, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
        return frame;
      });
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
    const sitAnimKey = key + ':sit-' + direction;
    if (!scene.anims.exists(sitAnimKey)) {
      scene.anims.create({
        key: sitAnimKey,
        frames: sitFrames.map((frame) => ({ key, frame })),
        frameRate: 4,
        repeat: -1,
      });
    }
    const lieAnimKey = key + ':lie-' + direction;
    if (!scene.anims.exists(lieAnimKey)) {
      scene.anims.create({
        key: lieAnimKey,
        frames: sitFrames.slice(0, Math.min(3, sitFrames.length)).map((frame) => ({ key, frame })),
        frameRate: 3,
        repeat: -1,
      });
    }
  }

  return key;
}
