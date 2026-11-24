import Phaser from 'phaser';
import {
  HAIR_COLOR_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import type { AvatarConfig } from '../../shared/types';

/**
 * Source base character animations from Modern Interiors Free (16x32 frames, 24 cols/row):
 * - cols 0..5: Right
 * - cols 6..11: Up
 * - cols 12..17: Left
 * - cols 18..23: Down
 */
type RigId = 'adam' | 'alex' | 'amelia';

interface RgbTriplet {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RgbTriplet {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mixRgb(a: RgbTriplet, b: RgbTriplet, t: number): RgbTriplet {
  return {
    r: Math.max(0, Math.min(255, Math.round(a.r + (b.r - a.r) * t))),
    g: Math.max(0, Math.min(255, Math.round(a.g + (b.g - a.g) * t))),
    b: Math.max(0, Math.min(255, Math.round(a.b + (b.b - a.b) * t))),
  };
}

function buildRampLookup(
  sourceHexesByLightness: string[],
  targetBaseHex: string,
  targetShadeHex: string,
): Map<string, RgbTriplet> {
  const base = hexToRgb(targetBaseHex);
  const shade = hexToRgb(targetShadeHex);
  const deep = mixRgb(shade, { r: 38, g: 26, b: 36 }, 0.35);
  const hi = mixRgb(base, { r: 255, g: 248, b: 238 }, 0.28);

  const map = new Map<string, RgbTriplet>();
  const n = sourceHexesByLightness.length;
  sourceHexesByLightness.forEach((hex, idx) => {
    const t = n <= 1 ? 0.5 : idx / (n - 1);
    let col: RgbTriplet;
    if (t < 0.28) col = mixRgb(deep, shade, t / 0.28);
    else if (t < 0.72) col = mixRgb(shade, base, (t - 0.28) / 0.44);
    else col = mixRgb(base, hi, (t - 0.72) / 0.28);
    map.set(hex.toLowerCase(), col);
  });
  return map;
}

// Verified exact source color ramps extracted from Modern Interiors Free 16x16 idle/run strips
const RIG_RAMPS: Record<
  RigId,
  {
    hair: string[];
    skin: string[];
    outfit: string[];
    shoeTrim?: string[];
  }
> = {
  adam: {
    hair: ['#5d6043', '#5f694a', '#687253', '#959d58'],
    skin: ['#bba386', '#d3a38d', '#f69784', '#e19b9b', '#f6ae9f', '#ffb893', '#ffcbb0'],
    outfit: ['#6c5981', '#805e8e', '#9f74a8', '#787d93'],
  },
  alex: {
    hair: ['#6f5446', '#8a6552', '#8d7051', '#957350', '#ba8d5e'],
    skin: ['#d3a38d', '#f69784', '#e19b9b', '#f6ae9f', '#ffb893', '#ffcbb0'],
    outfit: ['#5a444a', '#6f494d', '#a2394b', '#ae4a52', '#8091a5', '#8b8bab', '#9da3b7'],
  },
  amelia: {
    hair: ['#674d49', '#8a6552', '#8d7051', '#957350', '#a77a67', '#ba8d5e'],
    skin: ['#b2736d', '#b57972', '#b58472', '#bf8b78'],
    outfit: ['#6c5981', '#787d93', '#a85377', '#aa5e56', '#b95d72', '#ab4a36', '#b35e3f', '#c78c59'],
  },
};

function selectRigForHairStyle(hairStyle: AvatarConfig['hairStyle']): RigId {
  if (hairStyle === 'short') return 'adam';
  if (hairStyle === 'bob') return 'alex';
  return 'amelia';
}

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

function drawFrameAccessories(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  dir: 'right' | 'up' | 'left' | 'down',
  rig: RigId,
  config: AvatarConfig,
): void {
  const faceHeadY = rig === 'amelia' ? 14 : 15;

  if (config.accessory === 'glasses') {
    ctx.fillStyle = '#3a3a50';
    if (dir === 'down') {
      // Crisp 2px lens frames sitting over eyes
      ctx.fillRect(frameX + 4, frameY + faceHeadY + 2, 3, 2);
      ctx.fillRect(frameX + 9, frameY + faceHeadY + 2, 3, 2);
      ctx.fillStyle = '#cbe7f5';
      ctx.fillRect(frameX + 5, frameY + faceHeadY + 2, 1, 1);
      ctx.fillRect(frameX + 10, frameY + faceHeadY + 2, 1, 1);
      ctx.fillStyle = '#3a3a50';
      ctx.fillRect(frameX + 7, frameY + faceHeadY + 2, 2, 1);
    } else if (dir === 'left') {
      ctx.fillRect(frameX + 4, frameY + faceHeadY + 2, 3, 2);
      ctx.fillStyle = '#cbe7f5';
      ctx.fillRect(frameX + 4, frameY + faceHeadY + 2, 1, 1);
    } else if (dir === 'right') {
      ctx.fillRect(frameX + 9, frameY + faceHeadY + 2, 3, 2);
      ctx.fillStyle = '#cbe7f5';
      ctx.fillRect(frameX + 11, frameY + faceHeadY + 2, 1, 1);
    }
  } else if (config.accessory === 'ribbon') {
    ctx.fillStyle = '#b04868';
    ctx.fillRect(frameX + 9, frameY + 10, 4, 2);
    ctx.fillStyle = '#ffa8c4';
    ctx.fillRect(frameX + 10, frameY + 10, 2, 2);
  }

  // Subtle V0.1 outfit style accent on torso front/cardigan/overall straps
  if (dir === 'down') {
    const torsoY = frameY + 21;
    if (config.outfitStyle === 'overall') {
      ctx.fillStyle = '#f5ead8';
      ctx.fillRect(frameX + 6, torsoY, 4, 2);
    } else if (config.outfitStyle === 'cardigan') {
      ctx.fillStyle = '#fff3e2';
      ctx.fillRect(frameX + 7, torsoY, 2, 4);
    }
  }
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
