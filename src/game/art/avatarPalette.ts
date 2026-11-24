import type { AvatarConfig } from '../../shared/types';

export type RigId = 'adam' | 'alex' | 'amelia';

export interface RgbTriplet {
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

export function buildRampLookup(
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
export const RIG_RAMPS: Record<
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

export function selectRigForHairStyle(hairStyle: AvatarConfig['hairStyle']): RigId {
  if (hairStyle === 'short') return 'adam';
  if (hairStyle === 'bob') return 'alex';
  return 'amelia';
}

export function drawFrameAccessories(
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
