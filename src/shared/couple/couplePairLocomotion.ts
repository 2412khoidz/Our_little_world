import type { Direction } from '../types';

export interface CompanionTargetResult {
  x: number;
  y: number;
  formation: 'side_by_side' | 'staggered_trail' | 'fallback';
}

/**
 * Selects a collision-safe hand-holding formation next to the leader without dragging
 * the partner through walls, water, furniture, or discrete elevation cliffs.
 */
export function computeHoldHandsCompanionTarget(params: {
  leaderX: number;
  leaderY: number;
  leaderFacing: Direction;
  followerX: number;
  followerY: number;
  preferLeft: boolean;
  scale: number;
  canStand: (x: number, y: number) => boolean;
}): CompanionTargetResult {
  const s = Math.max(1, params.scale);
  const sideDx = 15.2 * s;
  const trailPx = 13 * s;
  const primarySide = params.preferLeft ? -sideDx : sideDx;
  const oppositeSide = -primarySide;

  const candidates: Array<{ x: number; y: number; formation: CompanionTargetResult['formation'] }> =
    params.leaderFacing === 'up' || params.leaderFacing === 'down'
      ? [
          { x: params.leaderX + primarySide, y: params.leaderY, formation: 'side_by_side' },
          { x: params.leaderX + oppositeSide, y: params.leaderY, formation: 'side_by_side' },
          {
            x: params.leaderX + primarySide * 0.5,
            y: params.leaderY + (params.leaderFacing === 'down' ? -trailPx : trailPx),
            formation: 'staggered_trail',
          },
          {
            x: params.leaderX,
            y: params.leaderY + (params.leaderFacing === 'down' ? -trailPx : trailPx),
            formation: 'staggered_trail',
          },
        ]
      : [
          {
            x: params.leaderX + (params.leaderFacing === 'right' ? -7.5 * s : 7.5 * s),
            y: params.leaderY + (params.preferLeft ? -7.5 * s : 7.5 * s),
            formation: 'side_by_side',
          },
          {
            x: params.leaderX + (params.leaderFacing === 'right' ? -7.5 * s : 7.5 * s),
            y: params.leaderY + (params.preferLeft ? 7.5 * s : -7.5 * s),
            formation: 'side_by_side',
          },
          {
            x: params.leaderX + (params.leaderFacing === 'right' ? -trailPx : trailPx),
            y: params.leaderY + (params.preferLeft ? -3.5 * s : 3.5 * s),
            formation: 'staggered_trail',
          },
          {
            x: params.leaderX + (params.leaderFacing === 'right' ? -trailPx : trailPx),
            y: params.leaderY,
            formation: 'staggered_trail',
          },
        ];

  for (const cand of candidates) {
    if (params.canStand(cand.x, cand.y)) {
      return cand;
    }
  }

  return {
    x: params.followerX,
    y: params.followerY,
    formation: 'fallback',
  };
}

/**
 * Checks whether the leader is stretching too far ahead of a navigating companion
 * so hand-holding never visually tears apart or snaps through obstacles.
 */
export function evaluateHoldHandsTether(params: {
  nextLeaderX: number;
  nextLeaderY: number;
  curLeaderX: number;
  curLeaderY: number;
  followerX: number;
  followerY: number;
  scale: number;
}): { allowLeaderStep: boolean; shouldBreakHold: boolean; distPx: number } {
  const s = Math.max(1, params.scale);
  const curDist = Math.hypot(params.curLeaderX - params.followerX, params.curLeaderY - params.followerY);
  const nextDist = Math.hypot(params.nextLeaderX - params.followerX, params.nextLeaderY - params.followerY);
  // Keep partners snugly within arm's reach while preserving LAN propagation headroom
  const softMax = 24 * s;
  const breakMax = 72 * s;

  if (curDist > breakMax) {
    return { allowLeaderStep: true, shouldBreakHold: true, distPx: curDist };
  }
  // Never trap the leader if moving back closer toward the partner
  if (nextDist <= curDist || nextDist <= softMax) {
    return { allowLeaderStep: true, shouldBreakHold: false, distPx: nextDist };
  }
  return { allowLeaderStep: false, shouldBreakHold: false, distPx: nextDist };
}
