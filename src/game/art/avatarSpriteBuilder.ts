import {
  HAIR_COLOR_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import type { AvatarConfig } from '../../shared/types';

const OUTLINE = '#3d2a24';

export function getAvatarTextureKey(config: AvatarConfig): string {
  return [
    'avatar',
    config.skinTone,
    config.hairStyle,
    config.hairColor,
    config.outfitStyle,
    config.outfitColor,
    config.accessory,
  ].join('-');
}

function getPalette(config: AvatarConfig) {
  const skin = SKIN_TONE_OPTIONS.find((s) => s.id === config.skinTone) ?? SKIN_TONE_OPTIONS[1]!;
  const hair = HAIR_COLOR_OPTIONS.find((h) => h.id === config.hairColor) ?? HAIR_COLOR_OPTIONS[0]!;
  const outfit =
    OUTFIT_COLOR_OPTIONS.find((o) => o.id === config.outfitColor) ?? OUTFIT_COLOR_OPTIONS[0]!;
  return { skin, hair, outfit };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dir: 'down' | 'up' | 'left' | 'right',
  stepPhase: 0 | 1 | 2,
  config: AvatarConfig,
) {
  const { skin, hair, outfit } = getPalette(config);
  const px = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x, oy + y, w, h);
  };

  const bobY = stepPhase === 0 ? 0 : -1;
  const leftLegOffset = stepPhase === 1 ? -1 : stepPhase === 2 ? 1 : 0;
  const rightLegOffset = stepPhase === 1 ? 1 : stepPhase === 2 ? -1 : 0;

  // Soft shadow at feet
  ctx.fillStyle = 'rgba(43, 29, 25, 0.28)';
  ctx.fillRect(ox + 4, oy + 22, 8, 2);

  // Legs & shoes
  if (dir === 'down' || dir === 'up') {
    px(5, 19 + Math.min(0, leftLegOffset), '#52434c', 2, 3);
    px(9, 19 + Math.min(0, rightLegOffset), '#52434c', 2, 3);
    px(5, 21 + Math.min(0, leftLegOffset), OUTLINE, 2, 1);
    px(9, 21 + Math.min(0, rightLegOffset), OUTLINE, 2, 1);
  } else {
    px(6 + leftLegOffset, 19, '#52434c', 2, 3);
    px(8 + rightLegOffset, 19, '#443740', 2, 3);
  }

  // Torso / outfit
  const bodyY = 12 + bobY;
  px(4, bodyY, OUTLINE, 8, 7);
  px(5, bodyY + 1, outfit.baseHex, 6, 5);
  px(5, bodyY + 5, outfit.shadeHex, 6, 1);

  if (config.outfitStyle === 'overall') {
    px(5, bodyY + 1, '#fff5e9', 6, 2);
    px(6, bodyY + 1, outfit.baseHex, 1, 3);
    px(9, bodyY + 1, outfit.baseHex, 1, 3);
    px(5, bodyY + 3, outfit.shadeHex, 6, 3);
  } else if (config.outfitStyle === 'cardigan') {
    px(7, bodyY + 1, '#fff5e9', 2, 5);
  }

  // Arms
  if (dir === 'down' || dir === 'up') {
    px(3, bodyY + 1 + (stepPhase === 1 ? 1 : 0), outfit.shadeHex, 1, 4);
    px(3, bodyY + 5 + (stepPhase === 1 ? 1 : 0), skin.baseHex, 1, 1);
    px(12, bodyY + 1 + (stepPhase === 2 ? 1 : 0), outfit.shadeHex, 1, 4);
    px(12, bodyY + 5 + (stepPhase === 2 ? 1 : 0), skin.baseHex, 1, 1);
  } else if (dir === 'left') {
    px(7 + leftLegOffset, bodyY + 2, outfit.shadeHex, 2, 3);
    px(7 + leftLegOffset, bodyY + 5, skin.baseHex, 2, 1);
  } else {
    px(7 + rightLegOffset, bodyY + 2, outfit.shadeHex, 2, 3);
    px(7 + rightLegOffset, bodyY + 5, skin.baseHex, 2, 1);
  }

  // Head outline + face
  const headY = 3 + bobY;
  px(3, headY, OUTLINE, 10, 9);
  px(4, headY + 1, skin.baseHex, 8, 7);
  px(4, headY + 7, skin.shadeHex, 8, 1);

  // Hair back / long strands
  if (config.hairStyle === 'long') {
    if (dir === 'down') {
      px(3, headY + 4, hair.shadeHex, 1, 8);
      px(12, headY + 4, hair.shadeHex, 1, 8);
    } else if (dir === 'up') {
      px(3, headY + 1, hair.baseHex, 10, 10);
      px(4, headY + 9, hair.shadeHex, 8, 3);
    }
  } else if (config.hairStyle === 'bob') {
    if (dir === 'down') {
      px(3, headY + 3, hair.shadeHex, 1, 6);
      px(12, headY + 3, hair.shadeHex, 1, 6);
    } else if (dir === 'up') {
      px(3, headY + 1, hair.baseHex, 10, 8);
    }
  }

  // Hair crown + bangs
  px(3, headY - 1, OUTLINE, 10, 2);
  px(4, headY, hair.baseHex, 8, 3);
  px(3, headY + 1, hair.baseHex, 10, 2);
  px(5, headY, hair.shadeHex, 6, 1);

  if (dir === 'up') {
    px(4, headY + 2, hair.baseHex, 8, 6);
    px(4, headY + 6, hair.shadeHex, 8, 2);
  } else if (dir === 'down') {
    // Bangs
    px(4, headY + 3, hair.baseHex, 2, 1);
    px(10, headY + 3, hair.baseHex, 2, 1);
    if (config.hairStyle !== 'short') {
      px(6, headY + 3, hair.shadeHex, 4, 1);
    }
    // Eyes & blush
    px(5, headY + 5, OUTLINE, 1, 2);
    px(10, headY + 5, OUTLINE, 1, 2);
    px(4, headY + 6, '#f49c96', 1, 1);
    px(11, headY + 6, '#f49c96', 1, 1);
  } else if (dir === 'left') {
    px(8, headY + 2, hair.baseHex, 4, 6);
    px(5, headY + 5, OUTLINE, 1, 2);
    px(4, headY + 6, '#f49c96', 1, 1);
  } else {
    px(4, headY + 2, hair.baseHex, 4, 6);
    px(10, headY + 5, OUTLINE, 1, 2);
    px(11, headY + 6, '#f49c96', 1, 1);
  }

  // Accessories
  if (config.accessory === 'glasses' && dir !== 'up') {
    if (dir === 'down') {
      px(4, headY + 4, '#5a4339', 3, 1);
      px(9, headY + 4, '#5a4339', 3, 1);
      px(7, headY + 5, '#5a4339', 2, 1);
    } else if (dir === 'left') {
      px(4, headY + 4, '#5a4339', 3, 1);
    } else {
      px(9, headY + 4, '#5a4339', 3, 1);
    }
  } else if (config.accessory === 'ribbon') {
    px(10, headY + 1, '#f07178', 3, 2);
    px(11, headY + 1, '#ffd4dc', 1, 1);
  }
}

export function buildAvatarSpritesheetCanvas(config: AvatarConfig): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48; // 3 frames x 16px
  canvas.height = 96; // 4 directions x 24px
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  const dirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
  const phases: Array<0 | 1 | 2> = [0, 1, 2];

  dirs.forEach((dir, row) => {
    phases.forEach((phase, col) => {
      drawFrame(ctx, col * 16, row * 24, dir, phase, config);
    });
  });

  return canvas;
}

export function renderAvatarPreviewCanvas(
  canvas: HTMLCanvasElement,
  config: AvatarConfig,
  scale = 4,
): void {
  const sheet = buildAvatarSpritesheetCanvas(config);
  canvas.width = 16 * scale;
  canvas.height = 24 * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sheet, 0, 0, 16, 24, 0, 0, canvas.width, canvas.height);
}

export function getIdleFrameIndex(dir: 'down' | 'up' | 'left' | 'right'): number {
  switch (dir) {
    case 'down':
      return 0;
    case 'up':
      return 3;
    case 'left':
      return 6;
    case 'right':
      return 9;
  }
}
