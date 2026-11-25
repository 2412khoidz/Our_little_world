import { DIAGONAL_FACINGS, type DiagonalFacing } from '../../shared/movement/facing8';
import type { Direction } from '../../shared/types';

/** Baked atlas rows (idle / walk / sit / 4× diagonal walk / lie). */
export const AVATAR_ATLAS_ROW_IDLE = 0;
export const AVATAR_ATLAS_ROW_WALK = 1;
export const AVATAR_ATLAS_ROW_SIT = 2;
export const AVATAR_ATLAS_ROW_DIAGONAL_START = 3;
export const AVATAR_ATLAS_ROW_LIE = 7;
export const AVATAR_ATLAS_ROW_COUNT = 8;

const DIAGONAL_BY_ROW: DiagonalFacing[] = [...DIAGONAL_FACINGS];

export function avatarWalkAnimKey(textureKey: string, facing: string): string {
  return `${textureKey}:walk-${facing}`;
}

export function avatarAtlasRowY(row: number, frameHeight: number): number {
  return row * frameHeight;
}

export function diagonalFacingForAtlasRow(row: number): DiagonalFacing | null {
  const index = row - AVATAR_ATLAS_ROW_DIAGONAL_START;
  return index >= 0 && index < DIAGONAL_BY_ROW.length ? DIAGONAL_BY_ROW[index]! : null;
}

export function atlasRowForDiagonalFacing(diag: DiagonalFacing): number {
  const index = DIAGONAL_FACINGS.indexOf(diag);
  return AVATAR_ATLAS_ROW_DIAGONAL_START + index;
}

export function directionColumnIndex(direction: Direction, directions: readonly Direction[]): number {
  return directions.indexOf(direction);
}