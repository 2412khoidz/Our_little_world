import { OUTDOOR_LANDMARKS } from '../world/outdoorZones';
import type { WorldLandmark } from './extendedWorldLandmarks';

/** Main-game outdoor — 64×64 unified world (replaces 22×18 meadow slice). */
export const OUTDOOR_MAIN_GAME_LANDMARKS: readonly WorldLandmark[] = OUTDOOR_LANDMARKS;

export const OUTDOOR_MAP_WIDTH_TILES = 64;
export const OUTDOOR_MAP_HEIGHT_TILES = 64;