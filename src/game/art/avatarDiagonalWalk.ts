import type Phaser from 'phaser';
import {
  DIAGONAL_FACINGS,
  type DiagonalFacing,
  diagonalPrimaryCardinal,
  diagonalSecondaryCardinal,
} from '../../shared/movement/facing8';
import {
  AVATAR_DIRECTIONS,
  AVATAR_FRAME_COUNT,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
} from './worldAvatarCanvas';
const PROCEDURAL_ROW_HEIGHT = 24;
const PROCEDURAL_FRAME_WIDTH = 16;
const PROCEDURAL_FRAME_COUNT = 3;

export function avatarWalkAnimKey(textureKey: string, facing: string): string {
  return `${textureKey}:walk-${facing}`;
}

function compositeDiagonalAtlasRow(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  diag: DiagonalFacing,
  destRow: number,
): void {
  const primary = diagonalPrimaryCardinal(diag);
  const secondary = diagonalSecondaryCardinal(diag);
  const primaryIndex = AVATAR_DIRECTIONS.indexOf(primary);
  const secondaryIndex = AVATAR_DIRECTIONS.indexOf(secondary);
  if (primaryIndex < 0 || secondaryIndex < 0) return;

  const destY = destRow * AVATAR_FRAME_HEIGHT;
  const stepW = AVATAR_FRAME_COUNT * AVATAR_FRAME_WIDTH;

  const scratch = document.createElement('canvas');
  scratch.width = AVATAR_FRAME_WIDTH;
  scratch.height = AVATAR_FRAME_HEIGHT;
  const scratchCtx = scratch.getContext('2d');
  if (!scratchCtx) return;

  for (let frame = 0; frame < AVATAR_FRAME_COUNT; frame += 1) {
    const sxPrimary = primaryIndex * stepW + frame * AVATAR_FRAME_WIDTH;
    const sxSecondary = secondaryIndex * stepW + frame * AVATAR_FRAME_WIDTH;
    const syWalk = AVATAR_FRAME_HEIGHT;
    const destX = frame * AVATAR_FRAME_WIDTH;

    scratchCtx.clearRect(0, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    scratchCtx.drawImage(sheet, sxPrimary, syWalk, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, 0, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    scratchCtx.globalAlpha = 0.42;
    scratchCtx.drawImage(sheet, sxSecondary, syWalk, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT, 0, 0, AVATAR_FRAME_WIDTH, AVATAR_FRAME_HEIGHT);
    scratchCtx.globalAlpha = 1;
    ctx.drawImage(scratch, destX, destY);
  }
}

/** Append four diagonal walk rows under the 3-row avatar atlas strip. */
export function expandAtlasCanvasWithDiagonalWalkRows(sheet: HTMLCanvasElement): void {
  const baseHeight = sheet.height;
  const nextHeight = baseHeight + DIAGONAL_FACINGS.length * AVATAR_FRAME_HEIGHT;

  const expanded = document.createElement('canvas');
  expanded.width = sheet.width;
  expanded.height = nextHeight;
  const ctx = expanded.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, 0);

  const firstDiagRow = Math.floor(baseHeight / AVATAR_FRAME_HEIGHT);
  DIAGONAL_FACINGS.forEach((diag, index) => {
    compositeDiagonalAtlasRow(ctx, sheet, diag, firstDiagRow + index);
  });

  sheet.width = expanded.width;
  sheet.height = expanded.height;
  const dst = sheet.getContext('2d');
  if (!dst) return;
  dst.imageSmoothingEnabled = false;
  dst.clearRect(0, 0, sheet.width, sheet.height);
  dst.drawImage(expanded, 0, 0);
}

export function registerDiagonalWalkClips(
  scene: Phaser.Scene,
  textureKey: string,
  tex: Phaser.Textures.CanvasTexture,
  usingAtlasLayout: boolean,
  sourceHeightBeforeDiag: number,
): void {
  const frameH = usingAtlasLayout ? AVATAR_FRAME_HEIGHT : PROCEDURAL_ROW_HEIGHT;
  const frameW = usingAtlasLayout ? AVATAR_FRAME_WIDTH : PROCEDURAL_FRAME_WIDTH;
  const frameCount = usingAtlasLayout ? AVATAR_FRAME_COUNT : PROCEDURAL_FRAME_COUNT;
  const firstDiagRow = Math.floor(sourceHeightBeforeDiag / frameH);

  for (let d = 0; d < DIAGONAL_FACINGS.length; d += 1) {
    const diag = DIAGONAL_FACINGS[d]!;
    const row = firstDiagRow + d;

    const frames: string[] = [];
    for (let i = 0; i < frameCount; i += 1) {
      const frameName = `${diag}-walk-${i}`;
      tex.add(frameName, 0, i * frameW, row * frameH, frameW, frameH);
      frames.push(frameName);
    }

    const animKey = avatarWalkAnimKey(textureKey, diag);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: usingAtlasLayout ? 10 : 8,
        repeat: -1,
      });
    }
  }

}