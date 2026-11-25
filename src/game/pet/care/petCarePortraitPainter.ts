/**
 * Dedicated 48×48 care close-up frames (CC0 procedural) — not upscaled overworld 24px.
 * Front-facing “kitty corner” poses inspired by cozy pet-care UX (not third-party assets).
 */
import {
  CAT_VARIANTS,
  type CatAccessoryId,
  type CatCoatVariantId,
  type PetAnimState,
} from '../../../shared/petLiving/petVisualTypes';

export const PET_CARE_ATLAS_FRAME = 48;
const COLS = 6;

const CARE_ANIMS: readonly PetAnimState[] = [
  'idle_south',
  'sit_south',
  'sleep',
  'sniff',
  'eat',
  'groom',
  'pet_purr',
  'happy_hop',
  'play_pounce',
  'box_peek',
  'lie_down',
];

function spec(variant: CatCoatVariantId) {
  return CAT_VARIANTS.find((v) => v.id === variant) ?? CAT_VARIANTS[0]!;
}

type Px = (x: number, y: number, c: string) => void;

function pxDrawer(ctx: CanvasRenderingContext2D, ox: number, oy: number): Px {
  return (x, y, c) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= PET_CARE_ATLAS_FRAME || py >= PET_CARE_ATLAS_FRAME) return;
    ctx.fillStyle = c;
    ctx.fillRect(ox + px, oy + py, 1, 1);
  };
}

function fillDisk(px: Px, cx: number, cy: number, r: number, c: string) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(x, y, c);
    }
  }
}

function drawFace(px: Px, p: ReturnType<typeof spec>['palette'], frame: number, mood: 'open' | 'happy' | 'sleep' | 'sniff') {
  const o = p.outline;
  const pr = p.primary;
  const sh = p.primaryShadow;
  const be = p.belly;
  fillDisk(px, 24, 30, 17, pr);
  fillDisk(px, 24, 32, 16, sh);
  fillDisk(px, 24, 38, 11, be);
  // ears
  px(14, 14, o);
  px(15, 13, pr);
  px(16, 12, pr);
  px(17, 13, p.innerEar);
  px(34, 14, o);
  px(33, 13, pr);
  px(32, 12, pr);
  px(31, 13, p.innerEar);
  if (mood === 'sleep') {
    px(19, 24, o);
    px(20, 24, o);
    px(28, 24, o);
    px(29, 24, o);
  } else {
    px(18, 22, '#fff6ea');
    px(19, 22, '#fff6ea');
    px(20, 22, '#fff6ea');
    px(21, 22, p.eye);
    px(27, 22, '#fff6ea');
    px(28, 22, '#fff6ea');
    px(29, 22, '#fff6ea');
    px(30, 22, p.eye);
    if (mood === 'happy') {
      px(22, 25, p.cheek);
      px(26, 25, p.cheek);
    }
  }
  // nose / mouth
  px(24, 27, o);
  px(23, 28, o);
  px(24, 28, p.secondary);
  px(25, 28, o);
  if (mood === 'sniff' && frame % 2 === 0) {
    px(24, 26, '#f8c4d0');
    px(24, 25, '#f8c4d0');
  }
  // whiskers
  px(10, 27, o);
  px(11, 28, o);
  px(37, 27, o);
  px(36, 28, o);
  if (frame % 3 === 0) {
    px(22, 29, o);
    px(26, 29, o);
  }
}

function drawPaws(px: Px, p: ReturnType<typeof spec>['palette'], spread: number) {
  drawPawPair(px, p, 16 - spread, 42);
  drawPawPair(px, p, 28 + spread, 42);
}

function drawPawPair(px: Px, p: ReturnType<typeof spec>['palette'], x: number, y: number) {
  px(x, y, p.outline);
  px(x + 1, y, p.belly);
  px(x, y + 1, p.outline);
  px(x + 1, y + 1, p.belly);
}

function paintFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  variant: CatCoatVariantId,
  anim: PetAnimState,
  frame: number,
): void {
  const px = pxDrawer(ctx, ox, oy);
  const pal = spec(variant).palette;
  ctx.clearRect(ox, oy, PET_CARE_ATLAS_FRAME, PET_CARE_ATLAS_FRAME);

  const breathe = Math.sin((frame / 4) * Math.PI) * 0.4;
  const mood =
    anim === 'sleep' || anim === 'lie_down'
      ? 'sleep'
      : anim === 'sniff'
        ? 'sniff'
        : anim === 'pet_purr' || anim === 'happy_hop'
          ? 'happy'
          : 'open';

  if (anim === 'box_peek') {
    for (let y = 34; y < 47; y += 1) {
      for (let x = 8; x < 40; x += 1) px(x, y, '#c9a06c');
    }
    for (let x = 8; x < 40; x += 1) {
      px(x, 33, pal.outline);
      px(x, 47, pal.outline);
    }
    drawFace(px, pal, frame, 'happy');
    px(24, 18, pal.primary);
    return;
  }

  if (anim === 'play_pounce') {
    const lean = frame % 3 === 0 ? 2 : -1;
    drawFace(px, pal, frame, 'happy');
    drawPaws(px, pal, 2 + lean);
    px(12, 36 + lean, pal.primaryShadow);
    px(36, 36 - lean, pal.primaryShadow);
    return;
  }

  if (anim === 'eat' && frame % 2 === 1) {
    drawFace(px, pal, frame, 'sniff');
    px(22, 31, '#e85c48');
    px(23, 32, '#ff8a65');
    drawPaws(px, pal, 0);
    return;
  }

  if (anim === 'groom') {
    drawFace(px, pal, frame, 'sleep');
    px(14, 40, pal.belly);
    px(15, 41, pal.belly);
    drawPaws(px, pal, frame % 2);
    return;
  }

  if (anim === 'happy_hop') {
    const hop = frame % 2 === 0 ? -2 : 0;
    drawFace(px, pal, frame, 'happy');
    drawPaws(px, pal, hop === 0 ? 1 : 0);
    return;
  }

  if (anim === 'lie_down' || anim === 'sleep') {
    fillDisk(px, 24, 30 + breathe, 18, pal.primary);
    fillDisk(px, 36, 34, 8, pal.primaryShadow);
    drawFace(px, pal, frame, 'sleep');
    return;
  }

  drawFace(px, pal, frame, mood);
  drawPaws(px, pal, anim === 'sit_south' ? -1 : Math.round(breathe));
}

export function getCarePortraitAnimList(): readonly PetAnimState[] {
  return CARE_ANIMS;
}

export function carePortraitFramesForAnim(anim: PetAnimState): number {
  switch (anim) {
    case 'play_pounce':
      return 6;
    case 'sleep':
      return 6;
    case 'idle_south':
      return 6;
    default:
      return 4;
  }
}

export function buildCarePortraitCanvas(variant: CatCoatVariantId, _accessory: CatAccessoryId): HTMLCanvasElement {
  const frameW = PET_CARE_ATLAS_FRAME;
  let frameIndex = 0;
  const frames: Array<{ anim: PetAnimState; fi: number }> = [];
  for (const anim of CARE_ANIMS) {
    const count = carePortraitFramesForAnim(anim);
    for (let fi = 0; fi < count; fi += 1) {
      frames.push({ anim, fi });
      frameIndex += 1;
    }
  }
  const rows = Math.ceil(frames.length / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = COLS * frameW;
  canvas.height = rows * frameW;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  frames.forEach((f, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    paintFrame(ctx, col * frameW, row * frameW, variant, f.anim, f.fi);
  });

  return canvas;
}

export function carePortraitFrameIndex(anim: PetAnimState, subFrame: number): number {
  let base = 0;
  for (const a of CARE_ANIMS) {
    const count = carePortraitFramesForAnim(a);
    if (a === anim) return base + (subFrame % count);
    base += count;
  }
  return 0;
}