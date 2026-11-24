import Phaser from 'phaser';
import {
  HAIR_COLOR_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import type { AvatarConfig } from '../../shared/types';
import { buildRampLookup, drawFrameAccessories, RIG_RAMPS, selectRigForHairStyle, type RgbTriplet } from '../art/avatarPalette';

/**
 * Source base character animations from Modern Interiors Free (16x32 frames, 24 cols/row):
 * - cols 0..5: Right
 * - cols 6..11: Up
 * - cols 12..17: Left
 * - cols 18..23: Down
 */
export function getUnifiedAvatarKey(config: AvatarConfig): string {
  return [
    'e-avatar',
    config.skinTone,
    config.hairStyle,
    config.hairColor,
    config.outfitStyle,
    config.outfitColor,
    config.accessory,
  ].join('-');
}

/**
 * Builds a live recolored 4-dir spritesheet (384x64: row 0 = idle 4x6, row 1 = run 4x6)
 * directly from Modern Interiors Free rig sources and registers Phaser idle/walk anims.
 */
export function ensureUnifiedAvatarTexture(
  scene: Phaser.Scene,
  config: AvatarConfig,
): string {
  const texKey = getUnifiedAvatarKey(config);
  if (scene.textures.exists(texKey)) {
    return texKey;
  }

  const rig = selectRigForHairStyle(config.hairStyle);
  const idleTex = scene.textures.get(`e-rig-${rig}-idle`);
  const runTex = scene.textures.get(`e-rig-${rig}-run`);
  const idleSrc = idleTex.getSourceImage() as HTMLImageElement;
  const runSrc = runTex.getSourceImage() as HTMLImageElement;

  const skinOpt = SKIN_TONE_OPTIONS.find((s) => s.id === config.skinTone) ?? SKIN_TONE_OPTIONS[1]!;
  const hairOpt = HAIR_COLOR_OPTIONS.find((h) => h.id === config.hairColor) ?? HAIR_COLOR_OPTIONS[0]!;
  const outfitOpt =
    OUTFIT_COLOR_OPTIONS.find((o) => o.id === config.outfitColor) ?? OUTFIT_COLOR_OPTIONS[0]!;

  const ramps = RIG_RAMPS[rig];
  const hairMap = buildRampLookup(ramps.hair, hairOpt.baseHex, hairOpt.shadeHex);
  const skinMap = buildRampLookup(ramps.skin, skinOpt.baseHex, skinOpt.shadeHex);
  const outfitMap = buildRampLookup(ramps.outfit, outfitOpt.baseHex, outfitOpt.shadeHex);

  const canvasTex = scene.textures.createCanvas(texKey, 384, 64);
  if (!canvasTex) return `e-rig-${rig}-idle`;

  const ctx = canvasTex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(idleSrc, 0, 0);
  ctx.drawImage(runSrc, 0, 32);

  const imgData = ctx.getImageData(0, 0, 384, 64);
  const data = imgData.data;

  for (let y = 0; y < 64; y += 1) {
    const localY = y % 32;
    for (let x = 0; x < 384; x += 1) {
      const i = (y * 384 + x) * 4;
      const a = data[i + 3] ?? 0;
      if (a < 128) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

      let target: RgbTriplet | undefined;
      if (localY <= 19) {
        target = hairMap.get(hex) ?? skinMap.get(hex) ?? outfitMap.get(hex);
      } else {
        target = outfitMap.get(hex) ?? skinMap.get(hex);
        // For Adam's olive boots/cuffs when y > 26, recolor hair-shared olive to hair tint cleanly
        if (!target && localY <= 25) {
          target = hairMap.get(hex);
        }
      }

      if (target) {
        data[i] = target.r;
        data[i + 1] = target.g;
        data[i + 2] = target.b;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Add crisp 1-2px V0.1 accessories & outfit details per frame
  const dirs: Array<'right' | 'up' | 'left' | 'down'> = ['right', 'up', 'left', 'down'];
  for (let row = 0; row < 2; row += 1) {
    const fy = row * 32;
    for (let col = 0; col < 24; col += 1) {
      const dir = dirs[Math.floor(col / 6)] ?? 'down';
      drawFrameAccessories(ctx, col * 16, fy, dir, rig, config);
    }
  }

  canvasTex.refresh();

  // Register explicit 16x32 frames (0..23 = idle row 0, 24..47 = run row 1)
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 24; col += 1) {
      const idx = row * 24 + col;
      canvasTex.add(idx, 0, col * 16, row * 32, 16, 32);
    }
  }

  // Register 4-direction Idle & Walk animations
  const dirOffsets: Array<{ name: 'right' | 'up' | 'left' | 'down'; startCol: number }> = [
    { name: 'right', startCol: 0 },
    { name: 'up', startCol: 6 },
    { name: 'left', startCol: 12 },
    { name: 'down', startCol: 18 },
  ];

  for (const d of dirOffsets) {
    const idleKey = `${texKey}-idle-${d.name}`;
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: Array.from({ length: 6 }, (_, k) => ({ key: texKey, frame: d.startCol + k })),
        frameRate: 7,
        repeat: -1,
      });
    }
    const walkKey = `${texKey}-walk-${d.name}`;
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: Array.from({ length: 6 }, (_, k) => ({ key: texKey, frame: 24 + d.startCol + k })),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  return texKey;
}
