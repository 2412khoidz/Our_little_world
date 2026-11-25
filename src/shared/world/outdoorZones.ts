import { buildExpansionLandmarks } from '../worldContent/extendedWorldLandmarks';

/** Main-game outdoor world (Plan B): 64×64 tiles, 10 landmark zones. */
export const OUTDOOR_WORLD_SIZE_TILES = 64;

export interface OutdoorTileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const OUTDOOR_LANDMARKS = buildExpansionLandmarks(64);

/** Zone rects from DeepSeek integration plan §4.2 (half-open [x, x+w) × [y, y+h)). */
export const OUTDOOR_ZONES: readonly { id: string; rect: OutdoorTileRect }[] = [
  { id: 'cottage', rect: { x: 8, y: 6, w: 12, h: 14 } },
  { id: 'farm', rect: { x: 21, y: 8, w: 14, h: 14 } },
  { id: 'orchard', rect: { x: 36, y: 8, w: 14, h: 14 } },
  { id: 'pond', rect: { x: 18, y: 22, w: 16, h: 14 } },
  { id: 'picnic', rect: { x: 4, y: 20, w: 13, h: 13 } },
  { id: 'pine_trail', rect: { x: 38, y: 24, w: 14, h: 13 } },
  { id: 'square', rect: { x: 6, y: 37, w: 14, h: 13 } },
  { id: 'beach', rect: { x: 22, y: 44, w: 15, h: 13 } },
  { id: 'sunset_cliff', rect: { x: 40, y: 42, w: 13, h: 14 } },
  { id: 'secret_nook', rect: { x: 51, y: 3, w: 11, h: 12 } },
];

export const OUTDOOR_DEFAULT_SPAWN = { tileX: 16, tileY: 21 };

export function zoneAtTile(tileX: number, tileY: number): string | null {
  for (const z of OUTDOOR_ZONES) {
    const r = z.rect;
    if (tileX >= r.x && tileX < r.x + r.w && tileY >= r.y && tileY < r.y + r.h) {
      return z.id;
    }
  }
  return null;
}