import type { BallGroup, BallState, BilliardsRule, PlayerSlot, Quat } from './types';

export const TABLE_W = 1000;
export const TABLE_H = 540;
export const RAIL = 48;
export const PLAY_L = RAIL;
export const PLAY_R = TABLE_W - RAIL;
export const PLAY_T = RAIL;
export const PLAY_B = TABLE_H - RAIL;
export const BALL_R = 13.5;

/**
 * STRICT FIXED-TIMESTEP CONSTANTS:
 * Every simulation tick advances by FIXED_STEP_DT = 1/120s with FIXED_SUBSTEPS = 4
 * (micro-step = 1/480s). Guarantees 0.000000 px divergence across 30, 60, 120, 144 FPS
 * and during 0.5x Slow-Mo Replay!
 */
export const FIXED_STEP_DT = 1 / 120;
export const FIXED_SUBSTEPS = 4;
const MICRO_DT = FIXED_STEP_DT / FIXED_SUBSTEPS;

export const MAX_SPEED = 1540;
export const MIN_SPEED_SHOT = 105;
export const MU_SLIDE = 570;
export const MU_ROLL = 128;
export const MU_SPIN_Z = 310;
export const STOP_EPS = 4.2;
export const BALL_RESTITUTION = 0.955;
export const CUSHION_RESTITUTION = 0.8;
export const JAW_RESTITUTION = 0.72;

export const CORNER_GAP = 34;
export const SIDE_GAP = 28;
export const JAW_R = 6.5;

export const POCKETS = [
  { x: PLAY_L + 3, y: PLAY_T + 3, r: 24.5, corner: true },
  { x: TABLE_W / 2, y: PLAY_T - 7, r: 23.0, corner: false },
  { x: PLAY_R - 3, y: PLAY_T + 3, r: 24.5, corner: true },
  { x: PLAY_L + 3, y: PLAY_B - 3, r: 24.5, corner: true },
  { x: TABLE_W / 2, y: PLAY_B + 7, r: 23.0, corner: false },
  { x: PLAY_R - 3, y: PLAY_B - 3, r: 24.5, corner: true },
] as const;

export const RAIL_SEGMENTS = [
  { type: 'h' as const, y: PLAY_T, x1: PLAY_L + CORNER_GAP, x2: TABLE_W / 2 - SIDE_GAP, ny: 1 },
  { type: 'h' as const, y: PLAY_T, x1: TABLE_W / 2 + SIDE_GAP, x2: PLAY_R - CORNER_GAP, ny: 1 },
  { type: 'h' as const, y: PLAY_B, x1: PLAY_L + CORNER_GAP, x2: TABLE_W / 2 - SIDE_GAP, ny: -1 },
  { type: 'h' as const, y: PLAY_B, x1: TABLE_W / 2 + SIDE_GAP, x2: PLAY_R - CORNER_GAP, ny: -1 },
  { type: 'v' as const, x: PLAY_L, y1: PLAY_T + CORNER_GAP, y2: PLAY_B - CORNER_GAP, nx: 1 },
  { type: 'v' as const, x: PLAY_R, y1: PLAY_T + CORNER_GAP, y2: PLAY_B - CORNER_GAP, nx: -1 },
] as const;

export const JAWS = [
  { x: PLAY_L + CORNER_GAP, y: PLAY_T - JAW_R, r: JAW_R },
  { x: TABLE_W / 2 - SIDE_GAP, y: PLAY_T - JAW_R, r: JAW_R },
  { x: TABLE_W / 2 + SIDE_GAP, y: PLAY_T - JAW_R, r: JAW_R },
  { x: PLAY_R - CORNER_GAP, y: PLAY_T - JAW_R, r: JAW_R },
  { x: PLAY_L + CORNER_GAP, y: PLAY_B + JAW_R, r: JAW_R },
  { x: TABLE_W / 2 - SIDE_GAP, y: PLAY_B + JAW_R, r: JAW_R },
  { x: TABLE_W / 2 + SIDE_GAP, y: PLAY_B + JAW_R, r: JAW_R },
  { x: PLAY_R - CORNER_GAP, y: PLAY_B + JAW_R, r: JAW_R },
  { x: PLAY_L - JAW_R, y: PLAY_T + CORNER_GAP, r: JAW_R },
  { x: PLAY_L - JAW_R, y: PLAY_B - CORNER_GAP, r: JAW_R },
  { x: PLAY_R + JAW_R, y: PLAY_T + CORNER_GAP, r: JAW_R },
  { x: PLAY_R + JAW_R, y: PLAY_B - CORNER_GAP, r: JAW_R },
] as const;

export const BALL_COLORS: Record<number, string> = {
  0: '#f8fafc',
  1: '#facc15', 2: '#2563eb', 3: '#dc2626', 4: '#7c3aed',
  5: '#f97316', 6: '#16a34a', 7: '#881337', 8: '#0f172a',
  9: '#facc15', 10: '#2563eb', 11: '#dc2626', 12: '#7c3aed',
  13: '#f97316', 14: '#16a34a', 15: '#881337',
};

export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

export function ballType(id: number): 'cue' | 'eight' | 'solid' | 'stripe' {
  if (id === 0) return 'cue';
  if (id === 8) return 'eight';
  return id <= 7 ? 'solid' : 'stripe';
}

export function makeBall(id: number, x: number, y: number): BallState {
  return {
    id, x, y, vx: 0, vy: 0, rollVx: 0, rollVy: 0, spinZ: 0,
    pocketed: false, q: { w: 1, x: 0, y: 0, z: 0 },
  };
}

export function cloneBalls(balls: readonly BallState[]): BallState[] {
  return balls.map((b) => ({ ...b, q: { ...b.q } }));
}

export function hasMovingBalls(balls: readonly BallState[]): boolean {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    if (b.pocketed) continue;
    if (
      Math.abs(b.vx) > 1e-6 ||
      Math.abs(b.vy) > 1e-6 ||
      Math.abs(b.rollVx) > 1e-6 ||
      Math.abs(b.rollVy) > 1e-6 ||
      Math.abs(b.spinZ) > 1e-6
    ) {
      return true;
    }
  }
  return false;
}

export function areBallsValidForRule(balls: readonly BallState[], rule: BilliardsRule): boolean {
  const expectedCount = rule === '8ball' ? 16 : 10;
  if (balls.length !== expectedCount) return false;
  const seen = new Set<number>();
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    if (!Number.isInteger(b.id) || b.id < 0 || b.id >= expectedCount) return false;
    if (seen.has(b.id)) return false;
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return false;
    seen.add(b.id);
  }
  return seen.size === expectedCount;
}

export function createInitialRack(rule: BilliardsRule, seed: number): BallState[] {
  const rng = createSeededRng(seed);
  const balls: BallState[] = [makeBall(0, PLAY_L + (PLAY_R - PLAY_L) * 0.25, TABLE_H / 2)];
  const footX = PLAY_L + (PLAY_R - PLAY_L) * 0.73;
  const footY = TABLE_H / 2;
  const dx = BALL_R * Math.sqrt(3) + 0.15;
  const dy = BALL_R * 2 + 0.15;

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
    for (let i = 0; i < 15; i++) if (order[i] === undefined) order[i] = pool[pi++]!;

    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        balls.push(makeBall(order[idx++]!, footX + row * dx, footY + (col - row / 2) * dy));
      }
    }
  } else {
    const others = seededShuffle([2, 3, 4, 5, 6, 7, 8], rng);
    const diamond = [
      { r: 0, c: 0, id: 1 },
      { r: 1, c: -0.5, id: others[0]! }, { r: 1, c: 0.5, id: others[1]! },
      { r: 2, c: -1, id: others[2]! }, { r: 2, c: 0, id: 9 }, { r: 2, c: 1, id: others[3]! },
      { r: 3, c: -0.5, id: others[4]! }, { r: 3, c: 0.5, id: others[5]! },
      { r: 4, c: 0, id: others[6]! },
    ];
    for (const slot of diamond) {
      balls.push(makeBall(slot.id, footX + slot.r * dx, footY + slot.c * dy));
    }
  }
  return balls;
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function quatRotateVec(q: Quat, vx: number, vy: number, vz: number) {
  const tx = 2 * (q.y * vz - q.z * vy);
  const ty = 2 * (q.z * vx - q.x * vz);
  const tz = 2 * (q.x * vy - q.y * vx);
  return {
    x: vx + q.w * tx + (q.y * tz - q.z * ty),
    y: vy + q.w * ty + (q.z * tx - q.x * tz),
    z: vz + q.w * tz + (q.x * ty - q.y * tx),
  };
}

export function rotateBallQuat(b: BallState, dt: number): void {
  const wx = -b.rollVy / BALL_R;
  const wy = b.rollVx / BALL_R;
  const wz = b.spinZ / BALL_R;
  const mag = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (mag < 1e-4) return;
  const half = 0.5 * mag * dt;
  const s = Math.sin(half) / mag;
  const next = quatMultiply({ w: Math.cos(half), x: wx * s, y: wy * s, z: wz * s }, b.q);
  const m = Math.sqrt(next.w * next.w + next.x * next.x + next.y * next.y + next.z * next.z) || 1;
  b.q = { w: next.w / m, x: next.x / m, y: next.y / m, z: next.z / m };
}

export function isPositionValidForCue(balls: BallState[], x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < PLAY_L + BALL_R + 2 || x > PLAY_R - BALL_R - 2) return false;
  if (y < PLAY_T + BALL_R + 2 || y > PLAY_B - BALL_R - 2) return false;
  for (const p of POCKETS) {
    if (Math.hypot(x - p.x, y - p.y) < p.r + BALL_R * 0.55) return false;
  }
  for (const b of balls) {
    if (b.id === 0 || b.pocketed) continue;
    if (Math.hypot(x - b.x, y - b.y) < BALL_R * 2 + 2) return false;
  }
  return true;
}

export function findOpenCueSpot(balls: BallState[]): { x: number; y: number } {
  const candidates = [
    { x: PLAY_L + 225, y: TABLE_H / 2 },
    { x: PLAY_L + 160, y: TABLE_H / 2 },
    { x: PLAY_L + 225, y: TABLE_H / 2 - 70 },
    { x: PLAY_L + 225, y: TABLE_H / 2 + 70 },
  ];
  for (const c of candidates) if (isPositionValidForCue(balls, c.x, c.y)) return c;
  for (let x = PLAY_L + 80; x < PLAY_R - 80; x += 32) {
    for (let y = PLAY_T + 60; y < PLAY_B - 60; y += 32) {
      if (isPositionValidForCue(balls, x, y)) return { x, y };
    }
  }
  return { x: PLAY_L + 225, y: TABLE_H / 2 };
}

export function remainingOfGroup(balls: BallState[], group: Exclude<BallGroup, null>): BallState[] {
  return balls.filter((b) => !b.pocketed && ballType(b.id) === group);
}

export function canShootEight(balls: BallState[], group: BallGroup): boolean {
  return group !== null && remainingOfGroup(balls, group).length === 0;
}

export function lowestRemainingBall(balls: BallState[]): BallState | null {
  let low: BallState | null = null;
  for (const b of balls) {
    if (b.pocketed || b.id === 0) continue;
    if (!low || b.id < low.id) low = b;
  }
  return low;
}

export function isLegalTargetBall(
  balls: BallState[],
  rule: BilliardsRule,
  myGroup: BallGroup,
  isBreakShot: boolean,
  ballId: number,
): boolean {
  if (ballId === 0) return false;
  if (rule === '9ball') {
    const low = lowestRemainingBall(balls);
    return low !== null && ballId === low.id;
  }
  if (myGroup === null) return isBreakShot ? true : ballId !== 8;
  if (canShootEight(balls, myGroup)) return ballId === 8;
  return ballType(ballId) === myGroup;
}

export function applyShotImpulse2D(
  balls: BallState[],
  shot: {
    angle: number;
    power: number;
    spinX: number;
    spinY: number;
    cueX?: number;
    cueY?: number;
  },
): boolean {
  const cue = balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) return false;
  if (shot.cueX !== undefined) cue.x = shot.cueX;
  if (shot.cueY !== undefined) cue.y = shot.cueY;

  const speed = MIN_SPEED_SHOT + Math.pow(shot.power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
  const dx = Math.cos(shot.angle);
  const dy = Math.sin(shot.angle);
  cue.vx = dx * speed;
  cue.vy = dy * speed;
  if (shot.spinY > 0.02) {
    const f = 1.0 + shot.spinY * 1.4;
    cue.rollVx = dx * speed * f;
    cue.rollVy = dy * speed * f;
  } else if (shot.spinY < -0.02) {
    const f = shot.spinY * 2.2;
    cue.rollVx = dx * speed * f;
    cue.rollVy = dy * speed * f;
  } else {
    cue.rollVx = dx * speed * 0.14;
    cue.rollVy = dy * speed * 0.14;
  }
  cue.spinZ = shot.spinX * speed * 1.1;
  return true;
}

export interface StepCallbacks {
  onFirstHit: (ballId: number) => void;
  onPocket: (ball: BallState, pocketX: number, pocketY: number) => void;
  onBallHit: (impactSpeed: number) => void;
  onCushion: (impactSpeed: number) => void;
}

/**
 * Advances physics by EXACTLY ONE fixed step (`FIXED_STEP_DT = 1/120s`, 4 substeps = 1/480s).
 * Independent of browser refresh rate (30Hz, 60Hz, 120Hz, 144Hz) -> 0.000000 px divergence!
 * Returns true if any ball is still moving.
 */
export function stepBilliardsFixedTick(balls: BallState[], cb: StepCallbacks): boolean {
  const nBalls = balls.length;
  const minDist = BALL_R * 2;
  const minDistSq = minDist * minDist;

  for (let step = 0; step < FIXED_SUBSTEPS; step++) {
    for (let i = 0; i < nBalls; i++) {
      const b = balls[i]!;
      if (b.pocketed) continue;
      if (b.vx === 0 && b.vy === 0 && b.rollVx === 0 && b.rollVy === 0 && b.spinZ === 0) continue;

      b.x += b.vx * MICRO_DT;
      b.y += b.vy * MICRO_DT;

      let dropped = false;
      for (let pi = 0; pi < POCKETS.length; pi++) {
        const p = POCKETS[pi]!;
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < p.r * p.r) {
          b.pocketed = true;
          b.vx = 0; b.vy = 0; b.rollVx = 0; b.rollVy = 0; b.spinZ = 0;
          cb.onPocket(b, p.x, p.y);
          dropped = true;
          break;
        } else {
          const lip = p.r + 6;
          if (dSq < lip * lip && dSq > 1e-4) {
            const pull = (360 * MICRO_DT) / Math.sqrt(dSq);
            b.vx += dx * pull;
            b.vy += dy * pull;
          }
        }
      }
      if (dropped) continue;

      // 2-phase Coulomb sliding/rolling friction
      const sx = b.vx - b.rollVx;
      const sy = b.vy - b.rollVy;
      const slipSq = sx * sx + sy * sy;
      if (slipSq > 9.0) {
        const slipMag = Math.sqrt(slipSq);
        const dv = MU_SLIDE * MICRO_DT;
        const dRoll = 2.5 * dv;
        const total = dv + dRoll;
        if (slipMag <= total) {
          const frac = dv / total;
          b.vx -= sx * frac;
          b.vy -= sy * frac;
          b.rollVx = b.vx;
          b.rollVy = b.vy;
        } else {
          const invS = 1 / slipMag;
          b.vx -= sx * invS * dv;
          b.vy -= sy * invS * dv;
          b.rollVx += sx * invS * dRoll;
          b.rollVy += sy * invS * dRoll;
        }
      } else {
        b.rollVx = b.vx;
        b.rollVy = b.vy;
        const spdSq = b.vx * b.vx + b.vy * b.vy;
        if (spdSq > 0) {
          const spd = Math.sqrt(spdSq);
          const drop = MU_ROLL * MICRO_DT;
          if (spd <= drop) {
            b.vx = 0; b.vy = 0; b.rollVx = 0; b.rollVy = 0;
          } else {
            const sc = (spd - drop) / spd;
            b.vx *= sc; b.vy *= sc; b.rollVx = b.vx; b.rollVy = b.vy;
          }
        }
      }

      if (b.spinZ !== 0) {
        const ds = MU_SPIN_Z * MICRO_DT;
        const absS = Math.abs(b.spinZ);
        b.spinZ = absS <= ds ? 0 : b.spinZ - Math.sign(b.spinZ) * ds;
      }

      if (b.x < PLAY_L + BALL_R + 12 || b.x > PLAY_R - BALL_R - 12 || b.y < PLAY_T + BALL_R + 12 || b.y > PLAY_B - BALL_R - 12) {
        resolveRailAndJaws(b, cb.onCushion);
      }
    }

    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < nBalls; i++) {
        const a = balls[i]!;
        if (a.pocketed) continue;
        const aStatic = a.vx === 0 && a.vy === 0;
        for (let j = i + 1; j < nBalls; j++) {
          const b = balls[j]!;
          if (b.pocketed || (aStatic && b.vx === 0 && b.vy === 0)) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx > minDist || dx < -minDist || dy > minDist || dy < -minDist) continue;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq && distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const invD = 1 / dist;
            const nx = dx * invD;
            const ny = dy * invD;
            const overlap = (minDist - dist) * 0.501;
            a.x -= nx * overlap; a.y -= ny * overlap;
            b.x += nx * overlap; b.y += ny * overlap;

            const rvx = a.vx - b.vx;
            const rvy = a.vy - b.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn > 0) {
              if (a.id === 0) cb.onFirstHit(b.id);
              else if (b.id === 0) cb.onFirstHit(a.id);

              const imp = vn * (1 + BALL_RESTITUTION) * 0.5;
              a.vx -= imp * nx; a.vy -= imp * ny;
              b.vx += imp * nx; b.vy += imp * ny;

              const tx = -ny;
              const ty = nx;
              const tImp = (rvx * tx + rvy * ty) * 0.022;
              a.vx -= tImp * tx; a.vy -= tImp * ty;
              b.vx += tImp * tx; b.vy += tImp * ty;

              if (iter === 0) cb.onBallHit(vn);
            }
          }
        }
      }
    }
  }

  let anyMoving = false;
  const stopEpsSq = STOP_EPS * STOP_EPS;
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i]!;
    if (b.pocketed) continue;
    const spdSq = b.vx * b.vx + b.vy * b.vy;
    const sx = b.vx - b.rollVx;
    const sy = b.vy - b.rollVy;
    if (spdSq < stopEpsSq && sx * sx + sy * sy < stopEpsSq) {
      b.vx = 0; b.vy = 0; b.rollVx = 0; b.rollVy = 0; b.spinZ = 0;
    } else {
      rotateBallQuat(b, FIXED_STEP_DT);
      anyMoving = true;
    }
  }
  return anyMoving;
}

function resolveRailAndJaws(b: BallState, onCushion: (speed: number) => void): void {
  for (const seg of RAIL_SEGMENTS) {
    if (seg.type === 'h') {
      if (b.x >= seg.x1 && b.x <= seg.x2) {
        if (seg.ny > 0 && b.y - BALL_R < seg.y) {
          const spd = -b.vy; b.y = seg.y + BALL_R;
          if (spd > 0) {
            b.vy = spd * CUSHION_RESTITUTION; b.rollVy *= -0.35;
            if (Math.abs(b.spinZ) > 1) { b.vx += b.spinZ * 0.34; b.spinZ *= 0.66; }
            onCushion(spd);
          }
        } else if (seg.ny < 0 && b.y + BALL_R > seg.y) {
          const spd = b.vy; b.y = seg.y - BALL_R;
          if (spd > 0) {
            b.vy = -spd * CUSHION_RESTITUTION; b.rollVy *= -0.35;
            if (Math.abs(b.spinZ) > 1) { b.vx -= b.spinZ * 0.34; b.spinZ *= 0.66; }
            onCushion(spd);
          }
        }
      }
    } else if (b.y >= seg.y1 && b.y <= seg.y2) {
      if (seg.nx > 0 && b.x - BALL_R < seg.x) {
        const spd = -b.vx; b.x = seg.x + BALL_R;
        if (spd > 0) {
          b.vx = spd * CUSHION_RESTITUTION; b.rollVx *= -0.35;
          if (Math.abs(b.spinZ) > 1) { b.vy -= b.spinZ * 0.34; b.spinZ *= 0.66; }
          onCushion(spd);
        }
      } else if (seg.nx < 0 && b.x + BALL_R > seg.x) {
        const spd = b.vx; b.x = seg.x - BALL_R;
        if (spd > 0) {
          b.vx = -spd * CUSHION_RESTITUTION; b.rollVx *= -0.35;
          if (Math.abs(b.spinZ) > 1) { b.vy += b.spinZ * 0.34; b.spinZ *= 0.66; }
          onCushion(spd);
        }
      }
    }
  }

  const jawMin = BALL_R + JAW_R;
  const jawMinSq = jawMin * jawMin;
  for (const j of JAWS) {
    const dx = b.x - j.x;
    const dy = b.y - j.y;
    if (dx > jawMin || dx < -jawMin || dy > jawMin || dy < -jawMin) continue;
    const dSq = dx * dx + dy * dy;
    if (dSq < jawMinSq && dSq > 1e-8) {
      const d = Math.sqrt(dSq);
      const nx = dx / d;
      const ny = dy / d;
      b.x = j.x + nx * jawMin;
      b.y = j.y + ny * jawMin;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + JAW_RESTITUTION) * vn * nx;
        b.vy -= (1 + JAW_RESTITUTION) * vn * ny;
        onCushion(-vn);
      }
    }
  }
}

export interface TurnOutcome {
  nextPlayer: PlayerSlot;
  groups: [BallGroup, BallGroup];
  ballInHand: boolean;
  foulMessage?: string;
  bannerTitle?: string;
  bannerSub?: string;
  winner?: { slot: PlayerSlot; reason: string };
  respotNine?: boolean;
}

export function evaluateShotRules(params: {
  rule: BilliardsRule;
  balls: BallState[];
  currentPlayer: PlayerSlot;
  groups: [BallGroup, BallGroup];
  isBreakShot: boolean;
  wasOnEightBeforeShot: boolean;
  firstHit: number | null;
  pocketed: number[];
  scratched: boolean;
  playerNames: [string, string];
}): TurnOutcome {
  const {
    rule, balls, currentPlayer: p, isBreakShot, wasOnEightBeforeShot,
    firstHit, pocketed, scratched, playerNames,
  } = params;
  const opp: PlayerSlot = p === 0 ? 1 : 0;
  const groups: [BallGroup, BallGroup] = [params.groups[0], params.groups[1]];

  if (rule === '9ball') {
    const remIds = balls
      .filter((b) => b.id !== 0 && (!b.pocketed || pocketed.includes(b.id)))
      .map((b) => b.id);
    const lowBefore = remIds.length > 0 ? Math.min(...remIds) : 9;
    let foul = false;
    let foulMessage = '';
    if (scratched) { foul = true; foulMessage = 'Lỗi! Bi cái rơi lỗ.'; }
    else if (firstHit === null) { foul = true; foulMessage = 'Lỗi! Không chạm bi nào.'; }
    else if (firstHit !== lowBefore) { foul = true; foulMessage = `Lỗi! Phải chạm bi ${lowBefore} trước.`; }

    if (pocketed.includes(9) && !foul) {
      return {
        nextPlayer: p, groups, ballInHand: false,
        winner: { slot: p, reason: `${playerNames[p]} ăn bi số 9 hợp lệ!` },
      };
    }
    if (foul) {
      return {
        nextPlayer: opp, groups, ballInHand: true, foulMessage,
        bannerTitle: 'Đặt bi tự do!',
        bannerSub: `${foulMessage} Lượt ${playerNames[opp]}`,
        respotNine: pocketed.includes(9),
      };
    }
    if (pocketed.length > 0) {
      return { nextPlayer: p, groups, ballInHand: false, bannerTitle: 'Đánh tiếp!', bannerSub: `${playerNames[p]} ăn bi chuẩn` };
    }
    return { nextPlayer: opp, groups, ballInHand: false, bannerTitle: `Lượt ${playerNames[opp]}` };
  }

  const myGroup = groups[p];
  const eightPocketed = pocketed.includes(8);
  let foul = false;
  let foulMessage = '';

  if (scratched) { foul = true; foulMessage = 'Lỗi! Bi cái rơi xuống lỗ.'; }
  else if (firstHit === null) { foul = true; foulMessage = 'Lỗi! Không chạm bi nào.'; }
  else if (myGroup !== null) {
    const ht = ballType(firstHit);
    if (wasOnEightBeforeShot && ht !== 'eight') {
      foul = true; foulMessage = 'Lỗi! Phải chạm bi số 8 trước.';
    } else if (!wasOnEightBeforeShot && ht !== myGroup) {
      foul = true; foulMessage = `Lỗi! Phải chạm ${myGroup === 'solid' ? 'Bi Trơn' : 'Bi Sọc'} trước.`;
    }
  } else if (firstHit === 8 && !isBreakShot) {
    foul = true; foulMessage = 'Lỗi! Không được chạm bi số 8 trước.';
  }

  if (eightPocketed) {
    if (wasOnEightBeforeShot && !foul) {
      return {
        nextPlayer: p, groups, ballInHand: false,
        winner: { slot: p, reason: `${playerNames[p]} đưa bi số 8 vào lỗ chuẩn xác!` },
      };
    }
    return {
      nextPlayer: opp, groups, ballInHand: false,
      winner: {
        slot: opp,
        reason: !wasOnEightBeforeShot
          ? `${playerNames[p]} ăn bi số 8 quá sớm!`
          : `${playerNames[p]} phạm lỗi khi ăn bi số 8!`,
      },
    };
  }

  let scoredOwn = false;
  let bannerTitle: string | undefined;
  let bannerSub: string | undefined;

  if (!foul && pocketed.length > 0) {
    if (myGroup === null) {
      const firstObj = pocketed.find((id) => id !== 8);
      if (firstObj !== undefined) {
        const g = ballType(firstObj) as 'solid' | 'stripe';
        groups[p] = g;
        groups[opp] = g === 'solid' ? 'stripe' : 'solid';
        scoredOwn = true;
        bannerTitle = g === 'solid' ? `${playerNames[p]} là Bi Trơn!` : `${playerNames[p]} là Bi Sọc!`;
        bannerSub = 'Tiếp tục lượt đánh!';
      }
    } else {
      scoredOwn = pocketed.some((id) => ballType(id) === myGroup);
    }
  }

  if (foul) {
    return {
      nextPlayer: opp, groups, ballInHand: true, foulMessage,
      bannerTitle: 'Đặt bi tự do!',
      bannerSub: `${foulMessage} Lượt ${playerNames[opp]}`,
    };
  }
  if (scoredOwn) {
    return { nextPlayer: p, groups, ballInHand: false, bannerTitle, bannerSub };
  }
  return { nextPlayer: opp, groups, ballInHand: false, bannerTitle: `Lượt ${playerNames[opp]}` };
}
