import type { Direction } from '../types';
import type { Facing8 } from '../movement/facing8';

/** Shade — Puny Characters (OpenGameArt CC0). 8 directions × 3 frames × 24 cols / row @ 32×32. */
export const PUNY_SHEET = {
  frameWidth: 32,
  frameHeight: 32,
  cols: 24,
  framesPerDir: 3,
  rows: {
    idle: 0,
    walk: 1,
    slash: 2,
    bow: 3,
    stave: 4,
    throw: 5,
    hurt: 6,
    death: 7,
  },
} as const;

/** South-first isometric order matching Puny walk strips. */
export const PUNY_FACING8_ORDER = [
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
  'right',
  'down-right',
] as const satisfies readonly Facing8[];

export const PUNY_CARDINAL_DIR: Record<Direction, number> = {
  down: 0,
  left: 2,
  up: 4,
  right: 6,
};

export function punyFrameIndex(row: number, dir: number, frame: number): number {
  return row * PUNY_SHEET.cols + dir * PUNY_SHEET.framesPerDir + frame;
}

export function punyDirForFacing8(facing: Facing8 | Direction): number {
  const i = PUNY_FACING8_ORDER.indexOf(facing as Facing8);
  if (i >= 0) return i;
  return PUNY_CARDINAL_DIR[facing as Direction] ?? 0;
}

/** Gameplay donor PNGs: vendored into private-unified when `build-private-atlas.py` runs. */
export function punyDonorAssetBasePath(usePrivateUnified: boolean): string {
  return usePrivateUnified
    ? '/assets/private-unified/donor-cc0-puny-8d'
    : '/assets/donor/cc0-puny-8d';
}

export const PUNY_DONOR_GAMEPLAY_MANIFEST = {
  provider: 'shade-puny-characters-cc0',
  frameWidth: PUNY_SHEET.frameWidth,
  frameHeight: PUNY_SHEET.frameHeight,
  colsPerRow: PUNY_SHEET.cols,
  framesPerDirection: PUNY_SHEET.framesPerDir,
  rows: PUNY_SHEET.rows,
  facing8Order: PUNY_FACING8_ORDER,
  postureSameRig: { sit: 'idle', lie: 'idle', tool: 'slash' },
} as const;