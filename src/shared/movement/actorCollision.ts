export type ActorColliderKind = 'player' | 'npc' | 'pet';

export interface ActorCollider {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
  readonly kind: ActorColliderKind;
}

export const PLAYER_ACTOR_RADIUS_PX = 5.5;
export const NPC_ACTOR_RADIUS_PX = 5.5;
export const PET_ACTOR_RADIUS_PX = 4.0;

/**
 * Checks whether moving from `(curX, curY)` to `(nextX, nextY)` encroaches on any
 * solid actor collider. Uses an anti-trap directional rule: movement is blocked only
 * when it penetrates within `minDist` AND decreases separation distance (`newDist < curDist - 0.05`),
 * so overlapping spawns or narrow doorways can always separate cleanly without getting stuck.
 */
export function isBlockedByActorColliders(
  nextX: number,
  nextY: number,
  curX: number,
  curY: number,
  selfRadiusPx: number,
  actors: readonly ActorCollider[],
): boolean {
  for (const actor of actors) {
    if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) continue;
    const minDist = selfRadiusPx + actor.radiusPx;
    const newDist = Math.hypot(nextX - actor.x, nextY - actor.y);
    if (newDist >= minDist) continue;
    const curDist = Math.hypot(curX - actor.x, curY - actor.y);
    if (newDist < curDist - 0.05) {
      return true;
    }
  }
  return false;
}

/**
 * Computes a gentle radial separation vector away from overlapping actors
 * so pets/companions yield smoothly when the owner steps up closely.
 */
export function computeActorSeparationPush(
  x: number,
  y: number,
  selfRadiusPx: number,
  actors: readonly ActorCollider[],
): { dx: number; dy: number } | null {
  let pushX = 0;
  let pushY = 0;
  let count = 0;
  for (const actor of actors) {
    if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) continue;
    const minDist = selfRadiusPx + actor.radiusPx;
    const ox = x - actor.x;
    const oy = y - actor.y;
    const dist = Math.hypot(ox, oy);
    if (dist < minDist) {
      const overlap = minDist - dist + 0.5;
      if (dist > 0.01) {
        pushX += (ox / dist) * overlap;
        pushY += (oy / dist) * overlap;
      } else {
        pushY += overlap;
      }
      count += 1;
    }
  }
  if (count === 0) return null;
  return { dx: pushX, dy: pushY };
}
