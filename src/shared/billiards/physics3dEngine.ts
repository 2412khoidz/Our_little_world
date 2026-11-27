import {
  ballType,
  canShootEight,
  createSeededRng,
  evaluateShotRules,
  quatMultiply,
  type StepCallbacks,
} from './physicsEngine';
import type { BallGroup, BallState, BilliardsRule, PlayerSlot, Quat } from './types';

// ===================== REAL-SCALE 9FT TABLE CONSTANTS (METERS) =====================
// Transplanted directly from our_little_billiards_3d_8_ball_pool_edition(1).html
export const HALF_W_3D = 1.27;
export const HALF_H_3D = 0.635;
export const BALL_R_3D = 0.028575;
export const CORNER_GAP_3D = 0.072;
export const SIDE_GAP_3D = 0.062;
export const JAW_R_3D = 0.015;
export const DROP_R_CORNER_3D = 0.056;
export const DROP_R_SIDE_3D = 0.052;

export const G_3D = 9.81;
export const MU_SLIDE_3D = 0.21;
export const MU_ROLL_3D = 0.0155;
export const MU_SPIN_Z_3D = 0.044;
export const BALL_RESTITUTION_3D = 0.95;
export const CUSHION_RESTITUTION_3D = 0.80;
export const JAW_RESTITUTION_3D = 0.72;
export const MAX_SHOT_SPEED_3D = 4.6;
export const MIN_SHOT_SPEED_3D = 0.32;
export const STOP_EPS_3D = 0.012;

/**
 * STRICT FIXED-TIMESTEP CONSTANTS FOR 3D ENGINE:
 * 1/120s tick with 6 substeps (1/720s) prevents tunneling at 4.6 m/s
 * while guaranteeing 0.000000 m divergence across 30/60/120Hz and 0.5x Slow-Mo.
 */
export const FIXED_STEP_DT_3D = 1 / 120;
export const FIXED_SUBSTEPS_3D = 6;
const MICRO_DT_3D = FIXED_STEP_DT_3D / FIXED_SUBSTEPS_3D;

export const POCKETS_3D = [
  { x: -HALF_W_3D - 0.008, z: -HALF_H_3D - 0.008, r: DROP_R_CORNER_3D, corner: true },
  { x: 0, z: -HALF_H_3D - 0.024, r: DROP_R_SIDE_3D, corner: false },
  { x: HALF_W_3D + 0.008, z: -HALF_H_3D - 0.008, r: DROP_R_CORNER_3D, corner: true },
  { x: -HALF_W_3D - 0.008, z: HALF_H_3D + 0.008, r: DROP_R_CORNER_3D, corner: true },
  { x: 0, z: HALF_H_3D + 0.024, r: DROP_R_SIDE_3D, corner: false },
  { x: HALF_W_3D + 0.008, z: HALF_H_3D + 0.008, r: DROP_R_CORNER_3D, corner: true },
] as const;

export const RAIL_SEGMENTS_3D = [
  { type: 'h' as const, z: -HALF_H_3D, x1: -HALF_W_3D + CORNER_GAP_3D, x2: -SIDE_GAP_3D, nz: 1 },
  { type: 'h' as const, z: -HALF_H_3D, x1: SIDE_GAP_3D, x2: HALF_W_3D - CORNER_GAP_3D, nz: 1 },
  { type: 'h' as const, z: HALF_H_3D, x1: -HALF_W_3D + CORNER_GAP_3D, x2: -SIDE_GAP_3D, nz: -1 },
  { type: 'h' as const, z: HALF_H_3D, x1: SIDE_GAP_3D, x2: HALF_W_3D - CORNER_GAP_3D, nz: -1 },
  { type: 'v' as const, x: -HALF_W_3D, z1: -HALF_H_3D + CORNER_GAP_3D, z2: HALF_H_3D - CORNER_GAP_3D, nx: 1 },
  { type: 'v' as const, x: HALF_W_3D, z1: -HALF_H_3D + CORNER_GAP_3D, z2: HALF_H_3D - CORNER_GAP_3D, nx: -1 },
] as const;

export const JAWS_3D = [
  { x: -HALF_W_3D + CORNER_GAP_3D, z: -HALF_H_3D - JAW_R_3D, r: JAW_R_3D },
  { x: -SIDE_GAP_3D, z: -HALF_H_3D - JAW_R_3D, r: JAW_R_3D },
  { x: SIDE_GAP_3D, z: -HALF_H_3D - JAW_R_3D, r: JAW_R_3D },
  { x: HALF_W_3D - CORNER_GAP_3D, z: -HALF_H_3D - JAW_R_3D, r: JAW_R_3D },
  { x: -HALF_W_3D + CORNER_GAP_3D, z: HALF_H_3D + JAW_R_3D, r: JAW_R_3D },
  { x: -SIDE_GAP_3D, z: HALF_H_3D + JAW_R_3D, r: JAW_R_3D },
  { x: SIDE_GAP_3D, z: HALF_H_3D + JAW_R_3D, r: JAW_R_3D },
  { x: HALF_W_3D - CORNER_GAP_3D, z: HALF_H_3D + JAW_R_3D, r: JAW_R_3D },
  { x: -HALF_W_3D - JAW_R_3D, z: -HALF_H_3D + CORNER_GAP_3D, r: JAW_R_3D },
  { x: -HALF_W_3D - JAW_R_3D, z: HALF_H_3D - CORNER_GAP_3D, r: JAW_R_3D },
  { x: HALF_W_3D + JAW_R_3D, z: -HALF_H_3D + CORNER_GAP_3D, r: JAW_R_3D },
  { x: HALF_W_3D + JAW_R_3D, z: HALF_H_3D - CORNER_GAP_3D, r: JAW_R_3D },
] as const;

export interface Ball3DState {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  rollVx: number;
  rollVz: number;
  spinY: number;
  pocketed: boolean;
  falling: boolean;
  fallTarget: { x: number; z: number } | null;
  q: Quat;
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function makeBall3D(id: number, x: number, z: number): Ball3DState {
  return {
    id,
    x,
    y: BALL_R_3D,
    z,
    vx: 0,
    vz: 0,
    rollVx: 0,
    rollVz: 0,
    spinY: 0,
    pocketed: false,
    falling: false,
    fallTarget: null,
    q: { w: 1, x: 0, y: 0, z: 0 },
  };
}

export function cloneBalls3D(balls: readonly Ball3DState[]): Ball3DState[] {
  return balls.map((b) => ({
    ...b,
    fallTarget: b.fallTarget ? { ...b.fallTarget } : null,
    q: { ...b.q },
  }));
}

export function balls3DToWire(balls: readonly Ball3DState[]): BallState[] {
  return balls.map((b) => ({
    id: b.id,
    x: b.x,
    y: b.z,
    vx: b.vx,
    vy: b.vz,
    rollVx: b.rollVx,
    rollVy: b.rollVz,
    spinZ: b.spinY,
    pocketed: b.pocketed,
    q: { ...b.q },
  }));
}

export function wireToBalls3D(wire: readonly BallState[]): Ball3DState[] {
  return wire.map((b) => ({
    id: b.id,
    x: b.x,
    y: b.pocketed ? -0.1 : BALL_R_3D,
    z: b.y,
    vx: b.vx,
    vz: b.vy,
    rollVx: b.rollVx,
    rollVz: b.rollVy,
    spinY: b.spinZ,
    pocketed: b.pocketed,
    falling: false,
    fallTarget: null,
    q: { ...b.q },
  }));
}

export function hasMovingBalls3D(balls: readonly Ball3DState[]): boolean {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    if (b.falling) return true;
    if (b.pocketed) continue;
    if (
      Math.abs(b.vx) > 1e-6 ||
      Math.abs(b.vz) > 1e-6 ||
      Math.abs(b.rollVx) > 1e-6 ||
      Math.abs(b.rollVz) > 1e-6 ||
      Math.abs(b.spinY) > 1e-6
    ) {
      return true;
    }
  }
  return false;
}

export function isCueWithinTableBounds3D(x: number, z: number): boolean {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    x >= -HALF_W_3D - 0.02 &&
    x <= HALF_W_3D + 0.02 &&
    z >= -HALF_H_3D - 0.02 &&
    z <= HALF_H_3D + 0.02
  );
}

export function isPositionValidForCue3D(
  balls: readonly Pick<Ball3DState, 'id' | 'x' | 'z' | 'pocketed'>[],
  x: number,
  z: number,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < -HALF_W_3D + BALL_R_3D + 0.005 || x > HALF_W_3D - BALL_R_3D - 0.005) return false;
  if (z < -HALF_H_3D + BALL_R_3D + 0.005 || z > HALF_H_3D - BALL_R_3D - 0.005) return false;
  for (const p of POCKETS_3D) {
    if (Math.hypot(x - p.x, z - p.z) < p.r + BALL_R_3D * 0.6) return false;
  }
  for (const b of balls) {
    if (b.id === 0 || b.pocketed) continue;
    if (Math.hypot(x - b.x, z - b.z) < BALL_R_3D * 2 + 0.004) return false;
  }
  return true;
}

export function findOpenCueSpot3D(
  balls: readonly Pick<Ball3DState, 'id' | 'x' | 'z' | 'pocketed'>[],
): { x: number; z: number } {
  const candidates = [
    { x: -HALF_W_3D * 0.5, z: 0 },
    { x: -HALF_W_3D * 0.65, z: 0 },
    { x: -HALF_W_3D * 0.5, z: -0.22 },
    { x: -HALF_W_3D * 0.5, z: 0.22 },
  ];
  for (const c of candidates) {
    if (isPositionValidForCue3D(balls, c.x, c.z)) return c;
  }
  for (let x = -HALF_W_3D + 0.2; x < HALF_W_3D - 0.2; x += 0.1) {
    for (let z = -HALF_H_3D + 0.15; z < HALF_H_3D - 0.15; z += 0.1) {
      if (isPositionValidForCue3D(balls, x, z)) return { x, z };
    }
  }
  return { x: -HALF_W_3D * 0.5, z: 0 };
}

export function createInitialRack3D(rule: BilliardsRule, seed: number): Ball3DState[] {
  const rng = createSeededRng(seed);
  const balls: Ball3DState[] = [makeBall3D(0, -HALF_W_3D * 0.5, 0)];
  const footX = HALF_W_3D * 0.5;
  const dx = BALL_R_3D * Math.sqrt(3) + 0.0005;
  const dz = BALL_R_3D * 2 + 0.0005;

  if (rule === '8ball') {
    const solids = seededShuffle([2, 3, 4, 5, 6, 7], rng);
    const stripes = seededShuffle([9, 10, 11, 12, 13, 14, 15], rng);
    const cSolid = solids.pop()!;
    const cStripe = stripes.pop()!;
    const pool = seededShuffle([...solids, ...stripes], rng);
    const order = new Array<number>(15);
    order[0] = 1;
    order[4] = 8;
    order[10] = cSolid;
    order[14] = cStripe;
    let pi = 0;
    for (let i = 0; i < 15; i++) {
      if (order[i] === undefined) order[i] = pool[pi++]!;
    }
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        balls.push(makeBall3D(order[idx++]!, footX + row * dx, (col - row / 2) * dz));
      }
    }
  } else {
    const others = seededShuffle([2, 3, 4, 5, 6, 7, 8], rng);
    const diamond = [
      { r: 0, c: 0, id: 1 },
      { r: 1, c: -0.5, id: others[0]! },
      { r: 1, c: 0.5, id: others[1]! },
      { r: 2, c: -1, id: others[2]! },
      { r: 2, c: 0, id: 9 },
      { r: 2, c: 1, id: others[3]! },
      { r: 3, c: -0.5, id: others[4]! },
      { r: 3, c: 0.5, id: others[5]! },
      { r: 4, c: 0, id: others[6]! },
    ];
    for (const slot of diamond) {
      balls.push(makeBall3D(slot.id, footX + slot.r * dx, slot.c * dz));
    }
  }
  return balls;
}

export function applyShotImpulse3D(
  balls: Ball3DState[],
  shot: {
    angle: number;
    power: number;
    spinX: number;
    spinY: number;
    elevationDeg?: number;
    cueX?: number;
    cueZ?: number;
  },
): boolean {
  const cue = balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) return false;
  if (shot.cueX !== undefined) cue.x = shot.cueX;
  if (shot.cueZ !== undefined) cue.z = shot.cueZ;
  cue.y = BALL_R_3D;
  cue.falling = false;
  cue.fallTarget = null;

  const elevDeg = Math.max(0, Math.min(45, shot.elevationDeg ?? 0));
  const elevRad = (elevDeg * Math.PI) / 180;
  const speed =
    (MIN_SHOT_SPEED_3D + Math.pow(shot.power, 1.32) * (MAX_SHOT_SPEED_3D - MIN_SHOT_SPEED_3D)) *
    Math.cos(elevRad * 0.45);
  const dx = Math.cos(shot.angle);
  const dz = Math.sin(shot.angle);

  cue.vx = dx * speed;
  cue.vz = dz * speed;
  if (shot.spinY > 0.02) {
    const f = 1.0 + shot.spinY * 1.4;
    cue.rollVx = dx * speed * f;
    cue.rollVz = dz * speed * f;
  } else if (shot.spinY < -0.02) {
    const f = shot.spinY * 2.25;
    cue.rollVx = dx * speed * f;
    cue.rollVz = dz * speed * f;
  } else {
    cue.rollVx = dx * speed * 0.14;
    cue.rollVz = dz * speed * 0.14;
  }

  if (elevDeg > 4 && Math.abs(shot.spinX) > 0.05) {
    const m = Math.sin(elevRad) * shot.spinX * speed * 2.4;
    cue.rollVx += -dz * m;
    cue.rollVz += dx * m;
  }
  cue.spinY = shot.spinX * speed * 1.15;
  return true;
}

function rotateBall3DQuat(b: Ball3DState, dt: number): void {
  const wx = b.rollVz / BALL_R_3D;
  const wy = b.spinY / BALL_R_3D;
  const wz = -b.rollVx / BALL_R_3D;
  const wMag = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (wMag <= 1e-4) return;
  const half = 0.5 * wMag * dt;
  const s = Math.sin(half) / wMag;
  const next = quatMultiply({ w: Math.cos(half), x: wx * s, y: wy * s, z: wz * s }, b.q);
  const m = Math.sqrt(next.w * next.w + next.x * next.x + next.y * next.y + next.z * next.z) || 1;
  b.q = { w: next.w / m, x: next.x / m, y: next.y / m, z: next.z / m };
}

function resolveRails3D(b: Ball3DState, onCushion: (speed: number) => void): void {
  for (let i = 0; i < RAIL_SEGMENTS_3D.length; i++) {
    const seg = RAIL_SEGMENTS_3D[i]!;
    if (seg.type === 'h') {
      if (b.x >= seg.x1 && b.x <= seg.x2) {
        if (seg.nz > 0 && b.z - BALL_R_3D < seg.z) {
          const spd = -b.vz;
          b.z = seg.z + BALL_R_3D;
          if (spd > 0) {
            b.vz = spd * CUSHION_RESTITUTION_3D;
            b.rollVz *= -0.35;
            if (Math.abs(b.spinY) > 0.02) {
              b.vx += b.spinY * 0.28;
              b.spinY *= 0.6;
            }
            onCushion(spd);
          }
        } else if (seg.nz < 0 && b.z + BALL_R_3D > seg.z) {
          const spd = b.vz;
          b.z = seg.z - BALL_R_3D;
          if (spd > 0) {
            b.vz = -spd * CUSHION_RESTITUTION_3D;
            b.rollVz *= -0.35;
            if (Math.abs(b.spinY) > 0.02) {
              b.vx -= b.spinY * 0.28;
              b.spinY *= 0.6;
            }
            onCushion(spd);
          }
        }
      }
    } else if (b.z >= seg.z1 && b.z <= seg.z2) {
      if (seg.nx > 0 && b.x - BALL_R_3D < seg.x) {
        const spd = -b.vx;
        b.x = seg.x + BALL_R_3D;
        if (spd > 0) {
          b.vx = spd * CUSHION_RESTITUTION_3D;
          b.rollVx *= -0.35;
          if (Math.abs(b.spinY) > 0.02) {
            b.vz -= b.spinY * 0.28;
            b.spinY *= 0.6;
          }
          onCushion(spd);
        }
      } else if (seg.nx < 0 && b.x + BALL_R_3D > seg.x) {
        const spd = b.vx;
        b.x = seg.x - BALL_R_3D;
        if (spd > 0) {
          b.vx = -spd * CUSHION_RESTITUTION_3D;
          b.rollVx *= -0.35;
          if (Math.abs(b.spinY) > 0.02) {
            b.vz += b.spinY * 0.28;
            b.spinY *= 0.6;
          }
          onCushion(spd);
        }
      }
    }
  }

  const jawMin = BALL_R_3D + JAW_R_3D;
  const jawMinSq = jawMin * jawMin;
  for (let i = 0; i < JAWS_3D.length; i++) {
    const j = JAWS_3D[i]!;
    const dx = b.x - j.x;
    const dz = b.z - j.z;
    if (dx > jawMin || dx < -jawMin || dz > jawMin || dz < -jawMin) continue;
    const dSq = dx * dx + dz * dz;
    if (dSq < jawMinSq && dSq > 1e-8) {
      const d = Math.sqrt(dSq);
      const nx = dx / d;
      const nz = dz / d;
      b.x = j.x + nx * jawMin;
      b.z = j.z + nz * jawMin;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) {
        b.vx -= (1 + JAW_RESTITUTION_3D) * vn * nx;
        b.vz -= (1 + JAW_RESTITUTION_3D) * vn * nz;
        onCushion(-vn);
      }
    }
  }

  const pad = 0.04;
  if (b.x < -HALF_W_3D - pad) {
    b.x = -HALF_W_3D - pad;
    b.vx = Math.abs(b.vx) * 0.25;
  }
  if (b.x > HALF_W_3D + pad) {
    b.x = HALF_W_3D + pad;
    b.vx = -Math.abs(b.vx) * 0.25;
  }
  if (b.z < -HALF_H_3D - pad) {
    b.z = -HALF_H_3D - pad;
    b.vz = Math.abs(b.vz) * 0.25;
  }
  if (b.z > HALF_H_3D + pad) {
    b.z = HALF_H_3D + pad;
    b.vz = -Math.abs(b.vz) * 0.25;
  }
}

export interface Step3DCallbacks {
  onFirstHit: (ballId: number) => void;
  onPocket: (ball: Ball3DState, pocketX: number, pocketZ: number) => void;
  onBallHit: (impactSpeed: number) => void;
  onCushion: (impactSpeed: number) => void;
}

/**
 * Advances 3D metric physics by ONE fixed step (`FIXED_STEP_DT_3D = 1/120s`, 6 substeps).
 * Deterministic across all refresh rates and 0.5x slow-mo replay.
 */
export function stepBilliards3DFixedTick(
  balls: Ball3DState[],
  cb: Step3DCallbacks,
  opts?: { animatePocketFall?: boolean },
): boolean {
  const animateFall = opts?.animatePocketFall ?? true;
  const nBalls = balls.length;
  const minDist = BALL_R_3D * 2;
  const minDistSq = minDist * minDist;
  const slideAccel = MU_SLIDE_3D * G_3D;
  const rollAccel = MU_ROLL_3D * G_3D;
  const spinZAccel = MU_SPIN_Z_3D * G_3D * 6;

  for (let step = 0; step < FIXED_SUBSTEPS_3D; step++) {
    for (let i = 0; i < nBalls; i++) {
      const b = balls[i]!;
      if (b.pocketed) continue;
      if (b.vx === 0 && b.vz === 0 && b.rollVx === 0 && b.rollVz === 0 && b.spinY === 0) continue;

      b.x += b.vx * MICRO_DT_3D;
      b.z += b.vz * MICRO_DT_3D;

      let dropped = false;
      for (let pi = 0; pi < POCKETS_3D.length; pi++) {
        const p = POCKETS_3D[pi]!;
        const dx = p.x - b.x;
        const dz = p.z - b.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < p.r * p.r) {
          b.pocketed = true;
          b.falling = animateFall;
          b.fallTarget = animateFall ? { x: p.x, z: p.z } : null;
          if (!animateFall) b.y = -0.1;
          b.vx = 0;
          b.vz = 0;
          b.rollVx = 0;
          b.rollVz = 0;
          b.spinY = 0;
          cb.onPocket(b, p.x, p.z);
          dropped = true;
          break;
        } else {
          const lip = p.r + 0.014;
          if (dSq < lip * lip && dSq > 1e-6) {
            const pull = (1.15 * MICRO_DT_3D) / Math.sqrt(dSq);
            b.vx += dx * pull;
            b.vz += dz * pull;
          }
        }
      }
      if (dropped) continue;

      const sx = b.vx - b.rollVx;
      const sz = b.vz - b.rollVz;
      const slipSq = sx * sx + sz * sz;
      if (slipSq > 1e-4) {
        const slipMag = Math.sqrt(slipSq);
        const dv = slideAccel * MICRO_DT_3D;
        const dRoll = 2.5 * dv;
        const total = dv + dRoll;
        if (slipMag <= total) {
          const frac = dv / total;
          b.vx -= sx * frac;
          b.vz -= sz * frac;
          b.rollVx = b.vx;
          b.rollVz = b.vz;
        } else {
          const invS = 1 / slipMag;
          b.vx -= sx * invS * dv;
          b.vz -= sz * invS * dv;
          b.rollVx += sx * invS * dRoll;
          b.rollVz += sz * invS * dRoll;
        }
      } else {
        b.rollVx = b.vx;
        b.rollVz = b.vz;
        const spdSq = b.vx * b.vx + b.vz * b.vz;
        if (spdSq > 0) {
          const spd = Math.sqrt(spdSq);
          const drop = rollAccel * MICRO_DT_3D;
          if (spd <= drop) {
            b.vx = 0;
            b.vz = 0;
            b.rollVx = 0;
            b.rollVz = 0;
          } else {
            const sc = (spd - drop) / spd;
            b.vx *= sc;
            b.vz *= sc;
            b.rollVx = b.vx;
            b.rollVz = b.vz;
          }
        }
      }

      if (b.spinY !== 0) {
        const ds = spinZAccel * MICRO_DT_3D;
        b.spinY = Math.abs(b.spinY) <= ds ? 0 : b.spinY - Math.sign(b.spinY) * ds;
      }

      if (
        b.x < -HALF_W_3D + BALL_R_3D + 0.04 ||
        b.x > HALF_W_3D - BALL_R_3D - 0.04 ||
        b.z < -HALF_H_3D + BALL_R_3D + 0.04 ||
        b.z > HALF_H_3D - BALL_R_3D - 0.04
      ) {
        resolveRails3D(b, cb.onCushion);
      }
    }

    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < nBalls; i++) {
        const a = balls[i]!;
        if (a.pocketed) continue;
        const aStatic = a.vx === 0 && a.vz === 0;
        for (let j = i + 1; j < nBalls; j++) {
          const b = balls[j]!;
          if (b.pocketed || (aStatic && b.vx === 0 && b.vz === 0)) continue;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          if (dx > minDist || dx < -minDist || dz > minDist || dz < -minDist) continue;
          const distSq = dx * dx + dz * dz;
          if (distSq < minDistSq && distSq > 1e-9) {
            const dist = Math.sqrt(distSq);
            const invD = 1 / dist;
            const nx = dx * invD;
            const nz = dz * invD;
            const overlap = (minDist - dist) * 0.501;
            a.x -= nx * overlap;
            a.z -= nz * overlap;
            b.x += nx * overlap;
            b.z += nz * overlap;

            const rvx = a.vx - b.vx;
            const rvz = a.vz - b.vz;
            const vn = rvx * nx + rvz * nz;
            if (vn > 0) {
              if (a.id === 0) cb.onFirstHit(b.id);
              else if (b.id === 0) cb.onFirstHit(a.id);

              const imp = vn * (1 + BALL_RESTITUTION_3D) * 0.5;
              a.vx -= imp * nx;
              a.vz -= imp * nz;
              b.vx += imp * nx;
              b.vz += imp * nz;

              const tx = -nz;
              const tz = nx;
              const tImp = (rvx * tx + rvz * tz) * 0.022;
              a.vx -= tImp * tx;
              a.vz -= tImp * tz;
              b.vx += tImp * tx;
              b.vz += tImp * tz;

              if (iter === 0) cb.onBallHit(vn);
            }
          }
        }
      }
    }
  }

  let anyMoving = false;
  const stopEpsSq = STOP_EPS_3D * STOP_EPS_3D;
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i]!;
    if (b.falling) {
      b.y -= 1.4 * FIXED_STEP_DT_3D;
      if (b.fallTarget) {
        const pull = Math.min(1, FIXED_STEP_DT_3D * 12);
        b.x += (b.fallTarget.x - b.x) * pull;
        b.z += (b.fallTarget.z - b.z) * pull;
      }
      if (b.y < -0.1) {
        b.falling = false;
        b.fallTarget = null;
      } else {
        anyMoving = true;
      }
      continue;
    }
    if (b.pocketed) continue;
    const spdSq = b.vx * b.vx + b.vz * b.vz;
    const sx = b.vx - b.rollVx;
    const sz = b.vz - b.rollVz;
    if (spdSq < stopEpsSq && sx * sx + sz * sz < stopEpsSq) {
      b.vx = 0;
      b.vz = 0;
      b.rollVx = 0;
      b.rollVz = 0;
      b.spinY = 0;
    } else {
      rotateBall3DQuat(b, FIXED_STEP_DT_3D);
      anyMoving = true;
    }
  }
  return anyMoving;
}

/**
 * Convenience adapter: advances one fixed step directly on wire-format `BallState[]`
 * (where `y` stores 3D `z` and `spinZ` stores 3D `spinY`), used by protocol/replay/AI.
 */
export function stepBilliards3DWireFixedTick(balls: BallState[], cb: StepCallbacks): boolean {
  const temp = wireToBalls3D(balls);
  const stillMoving = stepBilliards3DFixedTick(
    temp,
    {
      onFirstHit: cb.onFirstHit,
      onPocket: (b, px, pz) => {
        const wireB = balls.find((item) => item.id === b.id);
        if (wireB) {
          wireB.pocketed = true;
          wireB.vx = 0;
          wireB.vy = 0;
          wireB.rollVx = 0;
          wireB.rollVy = 0;
          wireB.spinZ = 0;
          cb.onPocket(wireB, px, pz);
        }
      },
      onBallHit: cb.onBallHit,
      onCushion: cb.onCushion,
    },
    { animatePocketFall: false },
  );
  for (let i = 0; i < balls.length; i++) {
    const src = temp[i]!;
    const dst = balls[i]!;
    dst.x = src.x;
    dst.y = src.z;
    dst.vx = src.vx;
    dst.vy = src.vz;
    dst.rollVx = src.rollVx;
    dst.rollVy = src.rollVz;
    dst.spinZ = src.spinY;
    dst.pocketed = src.pocketed;
    dst.q = src.q;
  }
  return stillMoving;
}

export function computeAimRay3D(
  balls: readonly Ball3DState[],
  cue: Pick<Ball3DState, 'x' | 'z'>,
  angle: number,
): {
  gx: number;
  gz: number;
  hitBall: Ball3DState | null;
  hitRail: 'h' | 'v' | null;
  dx: number;
  dz: number;
} {
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  let minT = Infinity;
  let hitBall: Ball3DState | null = null;
  let hitRail: 'h' | 'v' | null = null;

  if (dx > 1e-6) {
    const t = (HALF_W_3D - BALL_R_3D - cue.x) / dx;
    if (t < minT) {
      minT = t;
      hitRail = 'v';
    }
  } else if (dx < -1e-6) {
    const t = (-HALF_W_3D + BALL_R_3D - cue.x) / dx;
    if (t < minT) {
      minT = t;
      hitRail = 'v';
    }
  }

  if (dz > 1e-6) {
    const t = (HALF_H_3D - BALL_R_3D - cue.z) / dz;
    if (t < minT) {
      minT = t;
      hitRail = 'h';
    }
  } else if (dz < -1e-6) {
    const t = (-HALF_H_3D + BALL_R_3D - cue.z) / dz;
    if (t < minT) {
      minT = t;
      hitRail = 'h';
    }
  }

  const rSum = BALL_R_3D * 2;
  for (const b of balls) {
    if (b.pocketed || b.id === 0) continue;
    const ocx = b.x - cue.x;
    const ocz = b.z - cue.z;
    const proj = ocx * dx + ocz * dz;
    if (proj <= 0) continue;
    const perpSq = ocx * ocx + ocz * ocz - proj * proj;
    if (perpSq < rSum * rSum) {
      const t = proj - Math.sqrt(rSum * rSum - perpSq);
      if (t > 0 && t < minT) {
        minT = t;
        hitBall = b;
        hitRail = null;
      }
    }
  }

  return { gx: cue.x + dx * minT, gz: cue.z + dz * minT, hitBall, hitRail, dx, dz };
}

export function isLegalTargetBall3D(
  balls: readonly Pick<Ball3DState, 'id' | 'pocketed'>[],
  rule: BilliardsRule,
  myGroup: BallGroup,
  isBreakShot: boolean,
  ballId: number,
): boolean {
  if (ballId === 0) return false;
  if (rule === '9ball') {
    let lowId: number | null = null;
    for (const b of balls) {
      if (b.pocketed || b.id === 0) continue;
      if (lowId === null || b.id < lowId) lowId = b.id;
    }
    return lowId !== null && ballId === lowId;
  }
  if (myGroup === null) return isBreakShot ? true : ballId !== 8;
  const hasRemaining = balls.some((b) => !b.pocketed && ballType(b.id) === myGroup);
  if (!hasRemaining) return ballId === 8;
  return ballType(ballId) === myGroup;
}

export function canShootEight3D(
  balls: readonly Pick<Ball3DState, 'id' | 'pocketed'>[],
  group: BallGroup,
): boolean {
  if (group === null) return false;
  return !balls.some((b) => !b.pocketed && ballType(b.id) === group);
}

export function evaluateShotRules3D(params: {
  rule: BilliardsRule;
  balls: Ball3DState[];
  currentPlayer: PlayerSlot;
  groups: [BallGroup, BallGroup];
  isBreakShot: boolean;
  wasOnEightBeforeShot: boolean;
  firstHit: number | null;
  pocketed: number[];
  scratched: boolean;
  playerNames: [string, string];
}) {
  return evaluateShotRules({
    ...params,
    balls: balls3DToWire(params.balls),
  });
}

export function wireBallsHaveMoving3D(balls: readonly BallState[]): boolean {
  return balls.some(
    (b) =>
      !b.pocketed &&
      (Math.abs(b.vx) > 1e-6 ||
        Math.abs(b.vy) > 1e-6 ||
        Math.abs(b.rollVx) > 1e-6 ||
        Math.abs(b.rollVy) > 1e-6 ||
        Math.abs(b.spinZ) > 1e-6),
  );
}

export function isWirePositionValidForCue3D(balls: readonly BallState[], x: number, z: number): boolean {
  return isPositionValidForCue3D(
    balls.map((b) => ({ id: b.id, x: b.x, z: b.y, pocketed: b.pocketed })),
    x,
    z,
  );
}

export { canShootEight };
