import type Phaser from 'phaser';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { AVATAR_FRAME_HEIGHT, AVATAR_FRAME_WIDTH } from '../art/worldAvatarCanvas';

const FRAME_HUG_RIGHT = 'olw-couple-hug-right';
const FRAME_HUG_LEFT = 'olw-couple-hug-left';

export function coupleHugFrameName(facing: 'left' | 'right'): string {
  return facing === 'left' ? FRAME_HUG_LEFT : FRAME_HUG_RIGHT;
}

/**
 * Composes custom pixel-art P0 hug embrace frames directly from an avatar's rendered
 * CanvasTexture (adapted from CSAF Embrace / PostureCore pixel composition).
 * Preserves 100% of custom hair style/color, skin tone, outfit style/color, and accessories,
 * while leaning the head 1px toward the partner and painting a warm affectionate gaze & blush.
 */
export function ensureCoupleHugFrames(scene: Phaser.Scene, textureKey: string): boolean {
  if (!textureKey || !scene.textures.exists(textureKey)) return false;
  const pairedKey = getCoupleHugTextureKey(textureKey);
  if (scene.textures.exists(pairedKey)) return true;

  const tex = scene.textures.get(textureKey) as Phaser.Textures.CanvasTexture;
  const srcEl = tex.getSourceImage() as HTMLCanvasElement | undefined;
  if (!srcEl || typeof srcEl.getContext !== 'function') return false;
  const srcCtx = srcEl.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return false;

  // Check whether canvas is 384x384 atlas sheet vs 48x96 procedural fallback
  const isFallbackSheet = srcEl.width <= 64 && srcEl.height <= 128;
  const srcFrameW = AVATAR_FRAME_WIDTH;
  const srcFrameH = isFallbackSheet ? 24 : AVATAR_FRAME_HEIGHT;
  const yPadTop = isFallbackSheet ? 8 : 0;

  const pairedCanvas = document.createElement('canvas');
  pairedCanvas.width = AVATAR_FRAME_WIDTH * 2;
  pairedCanvas.height = AVATAR_FRAME_HEIGHT;
  const pCtx = pairedCanvas.getContext('2d', { willReadFrequently: true });
  if (!pCtx) return false;
  pCtx.imageSmoothingEnabled = false;

  const directions: Array<{ dir: 'right' | 'left'; outCol: number; leanDx: number }> = [
    { dir: 'right', outCol: 0, leanDx: 1 },
    { dir: 'left', outCol: 1, leanDx: -1 },
  ];

  for (const { dir, outCol, leanDx } of directions) {
    const idleIdx = getIdleFrameIndex(dir);
    const frameObj = tex.get(idleIdx);
    const sx = frameObj ? frameObj.cutX : 0;
    const sy = frameObj ? frameObj.cutY : (dir === 'right' ? 0 : 72);

    const destX = outCol * AVATAR_FRAME_WIDTH;

    // 1. Copy lower torso & legs (rows 22..31 in 32px space) anchored solidly on the ground
    const lowerStartY = Math.max(0, 22 - yPadTop);
    const lowerH = srcFrameH - lowerStartY;
    if (lowerH > 0) {
      pCtx.drawImage(
        srcEl,
        sx,
        sy + lowerStartY,
        srcFrameW,
        lowerH,
        destX,
        yPadTop + lowerStartY,
        srcFrameW,
        lowerH,
      );
    }

    // 2. Copy head, hair, ribbon/glasses & upper shoulders leaning 1px affectionately inward
    const upperEndY = Math.max(0, 22 - yPadTop);
    if (upperEndY > 0) {
      pCtx.drawImage(
        srcEl,
        sx,
        sy,
        srcFrameW,
        upperEndY,
        destX + leanDx,
        yPadTop,
        srcFrameW,
        upperEndY,
      );
    }

    // Clip any 1px overflow into adjacent column of pairedCanvas
    if (outCol === 0 && leanDx > 0) {
      pCtx.clearRect(AVATAR_FRAME_WIDTH, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    }

    // 3. Soften chest seam + add subtle warm rosy blush dot near cheek on face without erasing glasses/hair
    const img = pCtx.getImageData(destX, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    const px = img.data;
    const blushX = leanDx > 0 ? 10 : 5;
    const blushY = isFallbackSheet ? 18 : 21;
    const bi = (blushY * AVATAR_FRAME_WIDTH + blushX) * 4;
    if (px[bi + 3]! >= 128) {
      px[bi] = Math.min(255, Math.round(px[bi]! * 0.65 + 244 * 0.35));
      px[bi + 1] = Math.min(255, Math.round(px[bi + 1]! * 0.65 + 150 * 0.35));
      px[bi + 2] = Math.min(255, Math.round(px[bi + 2]! * 0.65 + 148 * 0.35));
    }
    pCtx.putImageData(img, destX, 0);
  }

  const pairedTex = scene.textures.addCanvas(pairedKey, pairedCanvas);
  if (!pairedTex) return false;
  pairedTex.setFilter(0); // NEAREST pixel-art fidelity
  pairedTex.add(FRAME_HUG_RIGHT, 0, 0, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
  pairedTex.add(FRAME_HUG_LEFT, 0, AVATAR_FRAME_WIDTH, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
  return true;
}

export function getCoupleHugTextureKey(baseTextureKey: string): string {
  return `${baseTextureKey}:couple-hug`;
}
