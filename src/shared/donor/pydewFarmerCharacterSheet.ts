import type { Direction } from '../types';
import type { Facing8 } from '../movement/facing8';
import { cardinalFromFacing8 } from '../movement/facing8';

/**
 * PyDew Valley farmer — CC0 @ artemn0va/pydew-valley (packed by OLW).
 * 4-way donor art; Facing8 diagonals use cardinal clips (no composite).
 */
export const PYDEW_FARMER_SHEET = {
  frameWidth: 64,
  frameHeight: 64,
  dirs: 4,
  framesPerDir: 4,
  cols: 16,
  rows: {
    idle: 0,
    walk: 1,
    hoe: 2,
    water: 3,
    harvest: 4,
  },
} as const;

export type PydewFarmerAction = 'idle' | 'walk' | 'hoe' | 'water' | 'harvest' | 'hold' | 'fish' | 'sit' | 'lie' | 'affection' | 'run';

export const PYDEW_FARMER_ACTION_ROWS: Record<PydewFarmerAction, number> = {
  idle: PYDEW_FARMER_SHEET.rows.idle,
  walk: PYDEW_FARMER_SHEET.rows.walk,
  hoe: PYDEW_FARMER_SHEET.rows.hoe,
  water: PYDEW_FARMER_SHEET.rows.water,
  harvest: PYDEW_FARMER_SHEET.rows.harvest,
  fish: PYDEW_FARMER_SHEET.rows.harvest,
  hold: PYDEW_FARMER_SHEET.rows.idle,
  sit: PYDEW_FARMER_SHEET.rows.idle,
  lie: PYDEW_FARMER_SHEET.rows.idle,
  affection: PYDEW_FARMER_SHEET.rows.water,
  run: PYDEW_FARMER_SHEET.rows.walk,
};

export const PYDEW_CARDINAL_DIR: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

export const PYDEW_FARMER_ATLAS_FILES = {
  may: 'farmer-may-atlas.png',
  nang: 'farmer-nang-atlas.png',
  rose: 'farmer-rose-atlas.png',
} as const;

export function pydewFrameIndex(row: number, dir: number, frame: number): number {
  return row * PYDEW_FARMER_SHEET.cols + dir * PYDEW_FARMER_SHEET.framesPerDir + frame;
}

export function pydewDirForFacing8(facing: Facing8 | Direction): number {
  const cardinal = (facing as Facing8).includes('-')
    ? cardinalFromFacing8(facing as Facing8)
    : (facing as Direction);
  return PYDEW_CARDINAL_DIR[cardinal] ?? 0;
}

export function pydewDonorAssetBasePath(usePrivateUnified: boolean): string {
  return usePrivateUnified
    ? '/assets/private-unified/donor-pydew-characters'
    : '/assets/donor/pydew-characters';
}

export const PYDEW_FARMER_GAMEPLAY_MANIFEST = {
  provider: 'artemn0va-pydew-valley-cc0',
  upstreamSha: '5b33bfda76d54866c648e7e54eff4e4e8a1eec8a',
  frameWidth: PYDEW_FARMER_SHEET.frameWidth,
  frameHeight: PYDEW_FARMER_SHEET.frameHeight,
  colsPerRow: PYDEW_FARMER_SHEET.cols,
  framesPerDirection: PYDEW_FARMER_SHEET.framesPerDir,
  rows: PYDEW_FARMER_SHEET.rows,
  actionRows: PYDEW_FARMER_ACTION_ROWS,
  facing8Policy: 'cardinal-from-facing8',
} as const;