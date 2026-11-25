import type { PetAnimState } from '../petVisualTypes';

const CAT_SHEET_ID = 'sheet.cat_orange';
const CAT_SHADOW_SHEET_ID = 'sheet.cat_orange_shadow';

export const PET_CARE_LICENSED_IDLE_SOUTH_FRAME = `${CAT_SHEET_ID}:48`;

export function mapCareStateToOlwCatAnim(state: PetAnimState): string {
  switch (state) {
    case 'sleep':
    case 'lie_down':
      return 'olw-cat-Sleep_South';
    case 'happy_hop':
    case 'play_pounce':
    case 'eat':
    case 'pet_purr':
    case 'box_peek':
      return 'olw-cat-Happy_South';
    case 'walk_south':
    case 'run_south':
      return 'olw-cat-Walk_South';
    case 'groom':
    case 'sniff':
    case 'sit_south':
    case 'idle_south':
    default:
      return 'olw-cat-Idle_South';
  }
}

export function mapCareStateToOlwCatShadowAnim(state: PetAnimState): string {
  return mapCareStateToOlwCatAnim(state).replace('olw-cat-', 'olw-cat-shadow-');
}

export function licensedCareCatShadowFrame(): string {
  return `${CAT_SHADOW_SHEET_ID}:48`;
}

/** World-props atlas linear indices (12 cols) — see `worldAtlas` catTagSpecs. */
export const LICENSED_CAT_IDLE_SOUTH_INDICES = [48, 49, 50, 51, 52, 53, 54, 55] as const;
export const LICENSED_CAT_HAPPY_SOUTH_INDICES = [0, 1, 2, 3, 4, 5] as const;
export const LICENSED_CAT_SLEEP_SOUTH_INDICES = [96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107] as const;
export const LICENSED_CAT_WALK_SOUTH_INDICES = [144, 145, 146, 147, 148, 149] as const;

export function licensedCatFrameId(sheetId: string, index: number): string {
  return `${sheetId}:${index}`;
}

export function licensedCatFrameSeriesForState(state: PetAnimState): readonly number[] {
  switch (state) {
    case 'sleep':
    case 'lie_down':
      return LICENSED_CAT_SLEEP_SOUTH_INDICES;
    case 'happy_hop':
    case 'play_pounce':
    case 'eat':
    case 'pet_purr':
    case 'box_peek':
      return LICENSED_CAT_HAPPY_SOUTH_INDICES;
    case 'walk_south':
    case 'run_south':
      return LICENSED_CAT_WALK_SOUTH_INDICES;
    default:
      return LICENSED_CAT_IDLE_SOUTH_INDICES;
  }
}