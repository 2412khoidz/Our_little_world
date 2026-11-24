import Phaser from 'phaser';
import type { AvatarConfig } from '../../shared/types';
import {
  buildAvatarSpritesheetCanvas,
  getAvatarTextureKey,
} from './avatarSpriteBuilder';

export function ensurePhaserAvatarTexture(scene: Phaser.Scene, config: AvatarConfig): string {
  const key = getAvatarTextureKey(config);
  if (scene.textures.exists(key)) {
    return key;
  }

  const canvas = buildAvatarSpritesheetCanvas(config);
  const tex = scene.textures.addCanvas(key, canvas);
  if (!tex) {
    return key;
  }
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  let frameIndex = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      tex.add(frameIndex, 0, col * 16, row * 24, 16, 24);
      frameIndex += 1;
    }
  }

  const dirNames: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
  dirNames.forEach((dir, row) => {
    const animKey = `${key}:walk-${dir}`;
    if (!scene.anims.exists(animKey)) {
      const base = row * 3;
      scene.anims.create({
        key: animKey,
        frames: [
          { key, frame: base + 1 },
          { key, frame: base },
          { key, frame: base + 2 },
          { key, frame: base },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  });

  return key;
}
