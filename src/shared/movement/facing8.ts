import type { Direction } from '../types';

/** 8-way facing for movement; avatar clips still map to nearest cardinal row. */
export type Facing8 =
  | Direction
  | 'down-right'
  | 'down-left'
  | 'up-right'
  | 'up-left';

const DIAGONALS: ReadonlySet<Facing8> = new Set(['down-right', 'down-left', 'up-right', 'up-left']);

export function isDiagonalFacing(facing: Facing8): boolean {
  return DIAGONALS.has(facing);
}

/** Snap diagonal facing to cardinal for legacy `Direction` wire format + 4-way clips. */
export function cardinalFromFacing8(facing: Facing8): Direction {
  if (facing === 'down-right' || facing === 'down-left') return 'down';
  if (facing === 'up-right' || facing === 'up-left') return 'up';
  return facing;
}

export function resolveFacing8(dx: number, dy: number, fallback: Facing8 = 'down'): Facing8 {
  const mag = Math.hypot(dx, dy);
  if (mag < 0.08) return fallback;
  const nx = dx / mag;
  const ny = dy / mag;
  const diagonalThreshold = 0.38;
  if (Math.abs(nx) > diagonalThreshold && Math.abs(ny) > diagonalThreshold) {
    if (ny > 0) return nx > 0 ? 'down-right' : 'down-left';
    return nx > 0 ? 'up-right' : 'up-left';
  }
  if (Math.abs(nx) > Math.abs(ny)) return nx >= 0 ? 'right' : 'left';
  return ny >= 0 ? 'down' : 'up';
}