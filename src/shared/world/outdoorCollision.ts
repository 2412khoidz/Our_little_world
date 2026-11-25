import type { OutdoorTileRect } from './outdoorZones';
import { OUTDOOR_WORLD_SIZE_TILES } from './outdoorZones';

function inRect(tx: number, ty: number, r: OutdoorTileRect): boolean {
  return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
}

/** Tiles that must stay walkable (bridges, porch, main artery, portals). */
const WALKABLE_OVERRIDES = new Set<string>([
  '16,20',
  '16,21',
  '9,12',
  // Garden gate approach in outdoor (porch portal)
  '15,21',
  '17,21',
  // Fishing pond bridge (horizontal)
  '25,29',
  '26,29',
  '27,29',
  // Beach pier approach
  '30,50',
  '30,51',
  '30,52',
  '31,50',
  '31,51',
  '31,52',
  // Spine north–south
  ...rangeTiles(16, 10, 16, 55),
  // Spine east from cottage
  ...rangeTiles(10, 21, 48, 21),
  // East–west through pond row
  ...rangeTiles(10, 29, 50, 29),
  // South to market
  ...rangeTiles(16, 29, 16, 44),
  // Market row
  ...rangeTiles(8, 42, 22, 42),
  // Beach path
  ...rangeTiles(30, 42, 30, 54),
  // East to farm, orchard, secret
  ...rangeTiles(17, 14, 46, 14),
  ...rangeTiles(28, 14, 28, 21),
  ...rangeTiles(42, 14, 55, 12),
  ...rangeTiles(48, 24, 52, 35),
  ...rangeTiles(44, 35, 50, 52),
  // Cliff approach (rim carved)
  '48,46',
  '49,46',
  '50,46',
  '48,47',
  '49,47',
  '50,47',
  // Farm gate (south center)
  '27,21',
  '28,21',
]);

function rangeTiles(x0: number, y0: number, x1: number, y1: number): string[] {
  const keys: string[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      keys.push(`${tx},${ty}`);
    }
  }
  return keys;
}

/** Water / solid regions — bridges carved via WALKABLE_OVERRIDES. */
const BLOCKED_RECTS: readonly OutdoorTileRect[] = [
  { x: 0, y: 56, w: OUTDOOR_WORLD_SIZE_TILES, h: 8 },
  // Pond basin (landmark ~26,29)
  { x: 22, y: 26, w: 10, h: 7 },
  // Picnic grove trees (north edge — trunk strip only visual blockers at sides)
  { x: 4, y: 20, w: 2, h: 10 },
  { x: 14, y: 22, w: 2, h: 8 },
  // Farm crop beds only (paths + gate stay walkable)
  { x: 24, y: 11, w: 8, h: 6 },
  // Orchard dense trunks (scattered)
  { x: 42, y: 10, w: 6, h: 8 },
  { x: 38, y: 12, w: 3, h: 5 },
  // Pine trail north screen
  { x: 38, y: 24, w: 14, h: 4 },
  // Cliff rim
  { x: 40, y: 42, w: 13, h: 3 },
  { x: 48, y: 45, w: 5, h: 8 },
  // Secret nook blossom ring (partial)
  { x: 51, y: 3, w: 9, h: 4 },
  // Market stalls (blocking counter tiles only)
  { x: 10, y: 39, w: 6, h: 2 },
  { x: 16, y: 39, w: 4, h: 2 },
];

/** 1×1 tree trunks — collision on trunk, not full canopy. */
const TREE_TRUNK_TILES = new Set<string>([
  '12,24',
  '44,11',
  '47,13',
  '41,15',
  '52,8',
  '54,10',
  '6,28',
  '50,48',
  '52,50',
  '43,46',
]);

/** Cottage porch walls — small footprint with door gap south. */
const COTTAGE_WALL_RECTS: readonly OutdoorTileRect[] = [
  { x: 13, y: 10, w: 6, h: 5 },
];

/** Farm fence ring with south gate at x=27-28, y=21. */
function isFarmFenceBlocked(tx: number, ty: number): boolean {
  const fx = 21;
  const fy = 8;
  const fw = 14;
  const fh = 14;
  if (tx < fx || ty < fy || tx >= fx + fw || ty >= fy + fh) return false;
  const onNorth = ty === fy;
  const onSouth = ty === fy + fh - 1;
  const onWest = tx === fx;
  const onEast = tx === fx + fw - 1;
  if (!onNorth && !onSouth && !onWest && !onEast) return false;
  if (onSouth && tx >= 27 && tx <= 28) return false;
  return true;
}

function buildBlockedGrid(): boolean[][] {
  const size = OUTDOOR_WORLD_SIZE_TILES;
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      grid[y]![x] = false;
    }
  }

  const block = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= size || ty >= size) return;
    grid[ty]![tx] = true;
  };

  // World border ring
  for (let i = 0; i < size; i += 1) {
    block(i, 0);
    block(i, size - 1);
    block(0, i);
    block(size - 1, i);
  }

  for (const r of BLOCKED_RECTS) {
    for (let ty = r.y; ty < r.y + r.h; ty += 1) {
      for (let tx = r.x; tx < r.x + r.w; tx += 1) {
        block(tx, ty);
      }
    }
  }

  for (const r of COTTAGE_WALL_RECTS) {
    for (let ty = r.y; ty < r.y + r.h; ty += 1) {
      for (let tx = r.x; tx < r.x + r.w; tx += 1) {
        block(tx, ty);
      }
    }
  }

  for (let ty = 8; ty < 22; ty += 1) {
    for (let tx = 21; tx < 35; tx += 1) {
      if (isFarmFenceBlocked(tx, ty)) block(tx, ty);
    }
  }

  for (const key of TREE_TRUNK_TILES) {
    const [sx, sy] = key.split(',').map(Number);
    if (sx !== undefined && sy !== undefined) block(sx, sy);
  }

  for (const key of WALKABLE_OVERRIDES) {
    const [sx, sy] = key.split(',').map(Number);
    if (sx !== undefined && sy !== undefined && sx >= 0 && sy >= 0 && sx < size && sy < size) {
      grid[sy]![sx] = false;
    }
  }

  return grid;
}

export const OUTDOOR_STATIC_BLOCKED_GRID = buildBlockedGrid();

export function isOutdoorBlocked(tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= OUTDOOR_WORLD_SIZE_TILES || tileY >= OUTDOOR_WORLD_SIZE_TILES) {
    return true;
  }
  return OUTDOOR_STATIC_BLOCKED_GRID[tileY]![tileX] ?? true;
}

export function isOutdoorNoPlace(tileX: number, tileY: number): boolean {
  if (isOutdoorBlocked(tileX, tileY)) return true;
  if ((tileY === 20 || tileY === 21) && tileX >= 15 && tileX <= 17) return true;
  if (inRect(tileX, tileY, { x: 22, y: 26, w: 10, h: 7 })) return true;
  if (inRect(tileX, tileY, { x: 0, y: 55, w: OUTDOOR_WORLD_SIZE_TILES, h: 9 })) return true;
  return false;
}

export function outdoorWalkableTileCount(): number {
  let n = 0;
  for (let y = 0; y < OUTDOOR_WORLD_SIZE_TILES; y += 1) {
    for (let x = 0; x < OUTDOOR_WORLD_SIZE_TILES; x += 1) {
      if (!isOutdoorBlocked(x, y)) n += 1;
    }
  }
  return n;
}