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

/** Donor-framed posture & tool rows — no idle/slash aliases on the gameplay path. */
export const COZY_PUNY_ACTION_ROWS = {
  sit: PUNY_SHEET.rows.hurt,
  lie: PUNY_SHEET.rows.death,
  hoe: PUNY_SHEET.rows.stave,
  water: PUNY_SHEET.rows.bow,
  harvest: PUNY_SHEET.rows.throw,
  fish: PUNY_SHEET.rows.throw,
  hold: PUNY_SHEET.rows.idle,
  affection: PUNY_SHEET.rows.bow,
  run: PUNY_SHEET.rows.walk,
} as const;

export type CozyPunyDonorAction = keyof typeof COZY_PUNY_ACTION_ROWS;

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
  return import.meta.env.VITE_OLW_PRIVATE_ART === true && usePrivateUnified
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
  cozyActionRows: COZY_PUNY_ACTION_ROWS,
  /** Combat slash row is not registered for cozy farming gameplay. */
  gameplayExcludedRows: ['slash'] as const,
} as const;

export const COZY_PUNY_TEXTURE_FILES = {
  base: 'character-base.png',
  mageCyan: 'mage-cyan.png',
  mageRed: 'mage-red.png',
} as const;