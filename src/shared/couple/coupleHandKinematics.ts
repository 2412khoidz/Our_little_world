import type { Direction } from '../types';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TwoBoneArmPose {
  shoulder: Vec2;
  elbow: Vec2;
  wrist: Vec2;
}

export interface SharedHandContactPose {
  anchorX: number;
  anchorY: number;
  leftArm: TwoBoneArmPose;
  rightArm: TwoBoneArmPose;
  contactAlpha: number;
  distPx: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function moveTowardLen(from: Vec2, to: Vec2, length: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-4) {
    return { x: from.x, y: from.y + length };
  }
  const s = length / d;
  return { x: from.x + dx * s, y: from.y + dy * s };
}

/**
 * Ported from `jordgubben/promenad/src/kinematics.c` (`reposition_bones_with_fabrik`, lines 239-349).
 * Solves a 2-segment (shoulder -> elbow -> wrist) arm chain using 3 FABRIK forward+inverse passes
 * with natural downward gravity bias at the elbow so arms bend anatomically instead of locking straight.
 */
export function solveTwoBoneArmFabrik(
  shoulder: Vec2,
  target: Vec2,
  upperLen: number,
  lowerLen: number,
  bendSign: -1 | 1,
  passes = 3,
): TwoBoneArmPose {
  const totalReach = upperLen + lowerLen;
  const toTargetDist = dist(shoulder, target);
  const clampedTarget =
    toTargetDist > totalReach
      ? moveTowardLen(shoulder, target, totalReach)
      : { x: target.x, y: target.y };

  let elbow: Vec2 = {
    x: lerp(shoulder.x, clampedTarget.x, 0.5) + bendSign * 0.4,
    y: lerp(shoulder.y, clampedTarget.y, 0.5) + Math.max(upperLen, lowerLen) * 0.45,
  };
  let wrist: Vec2 = { ...clampedTarget };

  const iter = Math.max(1, passes);
  for (let i = 0; i < iter; i += 1) {
    // Forward pass (end effector -> root)
    wrist = { ...clampedTarget };
    elbow = moveTowardLen(wrist, elbow, lowerLen);
    // Gentle downward gravity pull on elbow joint
    elbow.y += 0.35;

    // Inverse pass (root -> end effector)
    elbow = moveTowardLen(shoulder, elbow, upperLen);
    wrist = moveTowardLen(elbow, wrist, lowerLen);
  }

  return {
    shoulder: { ...shoulder },
    elbow,
    wrist,
  };
}

/**
 * Computes shoulder world anchor and natural resting hand offset based on measured
 * `16x32` avatar geometry (origin 0.5, 0.88 -> torso spans ~y-11..y-4 from feet).
 */
export function getAvatarShoulderAnchor(
  x: number,
  y: number,
  facing: Direction,
  reachSide: 'left' | 'right',
  scale: number,
): { shoulder: Vec2; restingHand: Vec2; behindBody: boolean } {
  const s = Math.max(1, scale);
  const sxOffset =
    facing === 'left' || facing === 'right'
      ? reachSide === 'right'
        ? 2.0 * s
        : -2.0 * s
      : reachSide === 'right'
        ? 4.2 * s
        : -4.2 * s;
  const shoulder: Vec2 = {
    x: x + sxOffset,
    y: y - 4.6 * s,
  };
  const handOffsetX = reachSide === 'right' ? 5.2 * s : -5.2 * s;
  const restingHand: Vec2 = {
    x: x + handOffsetX,
    y: y - 2.2 * s,
  };
  return {
    shoulder,
    restingHand,
    behindBody: facing === 'up',
  };
}

/**
 * Ported & adapted from `jordgubben/promenad/src/kinematics.c` (`move_limb_tips_to_their_linked_partners`, lines 205-215).
 * Links partner hand tips toward their shared midpoint anchor (`lerp(0.5, tipA, tipB)`) weighted by `reachAlpha` (0..1),
 * adding natural synchronous arm swing when walking side by side.
 */
export function computeSharedHandAnchor(params: {
  ax: number;
  ay: number;
  aFacing: Direction;
  bx: number;
  by: number;
  bFacing: Direction;
  reachAlpha: number;
  walkPhaseRad: number;
  moving: boolean;
  scale: number;
}): SharedHandContactPose {
  const s = Math.max(1, params.scale);
  const alpha = clamp(params.reachAlpha, 0, 1);

  const aIsLeft = params.ax <= params.bx;
  const lx = aIsLeft ? params.ax : params.bx;
  const ly = aIsLeft ? params.ay : params.by;
  const lFacing = aIsLeft ? params.aFacing : params.bFacing;
  const rx = aIsLeft ? params.bx : params.ax;
  const ry = aIsLeft ? params.by : params.ay;
  const rFacing = aIsLeft ? params.bFacing : params.aFacing;

  const leftGeo = getAvatarShoulderAnchor(lx, ly, lFacing, 'right', s);
  const rightGeo = getAvatarShoulderAnchor(rx, ry, rFacing, 'left', s);

  // Midpoint hand clasp anchor (`lerp(0.5, tipA, tipB)` from promenad)
  const rawMidX = (leftGeo.shoulder.x + rightGeo.shoulder.x) * 0.5;
  const swingY = Math.sin(params.walkPhaseRad) * (params.moving ? 1.15 * s : 0.3 * s);
  const swingX = Math.cos(params.walkPhaseRad) * (params.moving ? 0.55 * s : 0);
  const claspX = rawMidX + swingX;
  const claspY = (leftGeo.shoulder.y + rightGeo.shoulder.y) * 0.5 + 2.4 * s + swingY;

  const targetLeft: Vec2 = {
    x: lerp(leftGeo.restingHand.x, claspX, alpha),
    y: lerp(leftGeo.restingHand.y, claspY, alpha),
  };
  const targetRight: Vec2 = {
    x: lerp(rightGeo.restingHand.x, claspX, alpha),
    y: lerp(rightGeo.restingHand.y, claspY, alpha),
  };

  const needL = dist(leftGeo.shoulder, targetLeft);
  const needR = dist(rightGeo.shoulder, targetRight);
  const baseSeg = 3.6 * s;
  const maxSeg = 8.5 * s;
  const segL = Math.max(baseSeg, Math.min(maxSeg, needL * 0.54));
  const segR = Math.max(baseSeg, Math.min(maxSeg, needR * 0.54));
  const leftArm = solveTwoBoneArmFabrik(leftGeo.shoulder, targetLeft, segL, segL, -1, 3);
  const rightArm = solveTwoBoneArmFabrik(rightGeo.shoulder, targetRight, segR, segR, 1, 3);

  return {
    anchorX: (leftArm.wrist.x + rightArm.wrist.x) * 0.5,
    anchorY: (leftArm.wrist.y + rightArm.wrist.y) * 0.5,
    leftArm,
    rightArm,
    contactAlpha: alpha,
    distPx: dist(leftArm.wrist, rightArm.wrist),
  };
}
