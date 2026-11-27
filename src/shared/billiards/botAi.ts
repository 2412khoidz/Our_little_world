import {
  BALL_R_3D,
  HALF_H_3D,
  HALF_W_3D,
  POCKETS_3D,
  applyShotImpulse3D,
  cloneBalls3D,
  findOpenCueSpot3D,
  isLegalTargetBall3D,
  isPositionValidForCue3D,
  stepBilliards3DFixedTick,
  type Ball3DState,
} from './physics3dEngine';
import {
  BALL_R,
  PLAY_B,
  PLAY_L,
  PLAY_R,
  PLAY_T,
  POCKETS,
  applyShotImpulse2D,
  ballType,
  cloneBalls,
  evaluateShotRules,
  findOpenCueSpot,
  isLegalTargetBall,
  isPositionValidForCue,
  stepBilliardsFixedTick,
} from './physicsEngine';
import type { BallGroup, BallState, BilliardsRule, BotDifficulty, PlayerSlot } from './types';

export interface BotShotPlan {
  angle: number;
  power: number;
  spinX: number;
  spinY: number;
  elevationDeg: number;
  cueTarget?: { x: number; y: number };
}

const JITTER_BY_DIFFICULTY: Record<BotDifficulty, { angle: number; power: number }> = {
  easy: { angle: 0.055, power: 0.12 },
  medium: { angle: 0.018, power: 0.05 },
  hard: { angle: 0.004, power: 0.02 },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isSegmentClear2D(
  balls: readonly BallState[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ignoreId: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return true;
  const clearDist = BALL_R * 2.04;
  for (const b of balls) {
    if (b.pocketed || b.id === 0 || b.id === ignoreId) continue;
    const t = clamp(((b.x - x1) * dx + (b.y - y1) * dy) / lenSq, 0, 1);
    if (Math.hypot(b.x - (x1 + t * dx), b.y - (y1 + t * dy)) < clearDist) {
      return false;
    }
  }
  return true;
}

function firstBlockingBall2D(
  balls: readonly BallState[],
  x1: number,
  y1: number,
  angle: number,
): number | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let minT = Infinity;
  let hitId: number | null = null;
  const rSumSq = BALL_R * BALL_R * 4;
  for (const b of balls) {
    if (b.pocketed || b.id === 0) continue;
    const ocx = b.x - x1;
    const ocy = b.y - y1;
    const proj = ocx * dx + ocy * dy;
    if (proj <= 0) continue;
    const perpSq = ocx * ocx + ocy * ocy - proj * proj;
    if (perpSq < rSumSq) {
      const t = proj - Math.sqrt(rSumSq - perpSq);
      if (t > 0 && t < minT) {
        minT = t;
        hitId = b.id;
      }
    }
  }
  return hitId;
}

function getLegalTargets2D(
  balls: BallState[],
  rule: BilliardsRule,
  group: BallGroup,
  isBreakShot: boolean,
): BallState[] {
  return balls.filter(
    (b) => !b.pocketed && isLegalTargetBall(balls, rule, group, isBreakShot, b.id),
  );
}

export function chooseBotBallInHand2D(
  balls: readonly BallState[],
  rule: BilliardsRule,
  group: BallGroup,
  isBreakShot: boolean,
): { x: number; y: number } {
  const mutable = cloneBalls(balls);
  const targets = getLegalTargets2D(mutable, rule, group, isBreakShot);
  for (const t of targets) {
    for (const p of POCKETS) {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      for (const dist of [BALL_R * 4.8, BALL_R * 7.2, BALL_R * 3.0]) {
        const sx = clamp(t.x + (dx / len) * dist, PLAY_L + BALL_R + 4, PLAY_R - BALL_R - 4);
        const sy = clamp(t.y + (dy / len) * dist, PLAY_T + BALL_R + 4, PLAY_B - BALL_R - 4);
        if (isPositionValidForCue(mutable, sx, sy) && isSegmentClear2D(mutable, sx, sy, t.x, t.y, t.id)) {
          return { x: sx, y: sy };
        }
      }
    }
  }
  return findOpenCueSpot(mutable);
}

function simulateCandidate2D(
  balls: readonly BallState[],
  rule: BilliardsRule,
  botSlot: PlayerSlot,
  groups: [BallGroup, BallGroup],
  isBreakShot: boolean,
  angle: number,
  power: number,
  spinY = 0,
  cuePos?: { x: number; y: number },
): number {
  const sim = cloneBalls(balls);
  applyShotImpulse2D(sim, {
    angle,
    power,
    spinX: 0,
    spinY,
    cueX: cuePos?.x,
    cueY: cuePos?.y,
  });

  let firstHit: number | null = null;
  const pocketed: number[] = [];
  let scratched = false;
  let ticks = 0;
  while (
    ticks < 1400 &&
    stepBilliardsFixedTick(sim, {
      onFirstHit: (id) => {
        if (firstHit === null) firstHit = id;
      },
      onPocket: (b) => {
        if (b.id === 0) scratched = true;
        else pocketed.push(b.id);
      },
      onBallHit: () => {},
      onCushion: () => {},
    })
  ) {
    ticks++;
  }

  const wasOnEight =
    rule === '8ball' &&
    groups[botSlot] !== null &&
    !balls.some((b) => !b.pocketed && ballType(b.id) === groups[botSlot]);

  const outcome = evaluateShotRules({
    rule,
    balls: sim,
    currentPlayer: botSlot,
    groups,
    isBreakShot,
    wasOnEightBeforeShot: wasOnEight,
    firstHit,
    pocketed,
    scratched,
    playerNames: ['P1', 'Bot'],
  });

  if (outcome.winner) {
    return outcome.winner.slot === botSlot ? 10_000 : -10_000;
  }
  if (outcome.foulMessage || scratched) {
    return -2_000;
  }
  let score = 0;
  if (firstHit !== null && isLegalTargetBall(sim, rule, groups[botSlot], isBreakShot, firstHit)) {
    score += 120;
  }
  if (outcome.nextPlayer === botSlot) {
    score += 450 + pocketed.length * 160;
  }
  return score;
}

export function computeBotShot2D(params: {
  balls: readonly BallState[];
  rule: BilliardsRule;
  botSlot: PlayerSlot;
  groups: [BallGroup, BallGroup];
  isBreakShot: boolean;
  canMoveCueBall: boolean;
  difficulty: BotDifficulty;
  rng?: () => number;
}): BotShotPlan {
  const rng = params.rng ?? Math.random;
  const cueSpot = params.canMoveCueBall
    ? chooseBotBallInHand2D(params.balls, params.rule, params.groups[params.botSlot], params.isBreakShot)
    : undefined;

  const workingBalls = cloneBalls(params.balls);
  const cue = workingBalls.find((b) => b.id === 0);
  if (!cue) {
    return { angle: 0, power: 0.5, spinX: 0, spinY: 0, elevationDeg: 0, cueTarget: cueSpot };
  }
  if (cueSpot) {
    cue.x = cueSpot.x;
    cue.y = cueSpot.y;
  }

  if (params.isBreakShot) {
    const jitter = params.difficulty === 'easy' ? 0.04 : params.difficulty === 'medium' ? 0.02 : 0.008;
    return {
      angle: (rng() - 0.5) * jitter,
      power: clamp(0.92 + (rng() - 0.5) * 0.04, 0.85, 0.96),
      spinX: 0,
      spinY: 0.15,
      elevationDeg: 0,
      cueTarget: cueSpot,
    };
  }

  const myGroup = params.groups[params.botSlot];
  const targets = getLegalTargets2D(workingBalls, params.rule, myGroup, params.isBreakShot);
  interface Candidate {
    angle: number;
    power: number;
    spinY?: number;
    geomScore: number;
  }
  const candidates: Candidate[] = [];

  for (const t of targets) {
    for (const p of POCKETS) {
      const tx = p.x - t.x;
      const ty = p.y - t.y;
      const pDist = Math.hypot(tx, ty) || 1;
      const pnx = tx / pDist;
      const pny = ty / pDist;
      const gx = t.x - pnx * (BALL_R * 2);
      const gy = t.y - pny * (BALL_R * 2);
      const cx = gx - cue.x;
      const cy = gy - cue.y;
      const cDist = Math.hypot(cx, cy) || 1;
      const align = (cx / cDist) * pnx + (cy / cDist) * pny;
      if (align < 0.22) continue;

      const angle = Math.atan2(cy, cx);
      const c1 = isSegmentClear2D(workingBalls, cue.x, cue.y, gx, gy, t.id);
      const c2 = isSegmentClear2D(workingBalls, t.x, t.y, p.x, p.y, t.id);
      const firstHit = firstBlockingBall2D(workingBalls, cue.x, cue.y, angle);
      const hitsIllegalFirst = firstHit !== null && !isLegalTargetBall(workingBalls, params.rule, myGroup, false, firstHit);
      if (hitsIllegalFirst) continue;

      const power = clamp(((cDist + pDist) / 960) / Math.max(0.45, align), 0.3, 0.88);
      const geomScore =
        align * 140 - (cDist + pDist) * 0.08 + (c1 ? 110 : -40) + (c2 ? 110 : -30);
      candidates.push({ angle, power, geomScore });
    }

    // Direct legal contact safety/nudge fallback
    const directAngle = Math.atan2(t.y - cue.y, t.x - cue.x);
    const directClear = isSegmentClear2D(workingBalls, cue.x, cue.y, t.x, t.y, t.id);
    const firstDirect = firstBlockingBall2D(workingBalls, cue.x, cue.y, directAngle);
    if (directClear && (firstDirect === null || firstDirect === t.id)) {
      candidates.push({
        angle: directAngle,
        power: 0.48,
        geomScore: 15 - Math.hypot(t.x - cue.x, t.y - cue.y) * 0.02,
      });
    }
  }

  // 1-rail kick fallback if all direct shots are snookered
  if (candidates.length === 0 && targets.length > 0) {
    const t = targets[0]!;
    const mirrors = [
      { x: t.x, y: 2 * (PLAY_T + BALL_R) - t.y },
      { x: t.x, y: 2 * (PLAY_B - BALL_R) - t.y },
      { x: 2 * (PLAY_L + BALL_R) - t.x, y: t.y },
      { x: 2 * (PLAY_R - BALL_R) - t.x, y: t.y },
    ];
    for (const m of mirrors) {
      const angle = Math.atan2(m.y - cue.y, m.x - cue.x);
      const firstHit = firstBlockingBall2D(workingBalls, cue.x, cue.y, angle);
      if (firstHit === null || isLegalTargetBall(workingBalls, params.rule, myGroup, false, firstHit)) {
        candidates.push({ angle, power: 0.68, geomScore: -20 });
      }
    }
  }

  candidates.sort((a, b) => b.geomScore - a.geomScore);
  let chosen = candidates[0] ?? {
    angle: targets[0] ? Math.atan2(targets[0].y - cue.y, targets[0].x - cue.x) : 0,
    power: 0.55,
    geomScore: -100,
  };

  if (params.difficulty !== 'easy' && candidates.length > 0) {
    const top = candidates.slice(0, params.difficulty === 'hard' ? 8 : 4);
    let bestCombined = -Infinity;
    for (const cand of top) {
      const variants: Candidate[] = [
        { ...cand, spinY: 0 },
        { ...cand, spinY: -0.45 },
        { ...cand, power: clamp(cand.power * 0.72, 0.28, 0.85), spinY: -0.3 },
      ];
      for (const variant of variants) {
        const simScore = simulateCandidate2D(
          workingBalls,
          params.rule,
          params.botSlot,
          params.groups,
          params.isBreakShot,
          variant.angle,
          variant.power,
          variant.spinY ?? 0,
        );
        const total = simScore + variant.geomScore * 0.25;
        if (total > bestCombined) {
          bestCombined = total;
          chosen = variant;
        }
      }
    }
  }

  const jit = JITTER_BY_DIFFICULTY[params.difficulty];
  return {
    angle: chosen.angle + (rng() - 0.5) * 2 * jit.angle,
    power: clamp(chosen.power + (rng() - 0.5) * 2 * jit.power, 0.24, 0.94),
    spinX: 0,
    spinY: chosen.spinY ?? 0,
    elevationDeg: 0,
    cueTarget: cueSpot,
  };
}

// ===================== 3D BOT AI (REAL-SCALE METRIC TABLE) =====================

function isSegmentClear3D(
  balls: readonly Ball3DState[],
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  ignoreId: number,
): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return true;
  const clearDist = BALL_R_3D * 2.04;
  for (const b of balls) {
    if (b.pocketed || b.id === 0 || b.id === ignoreId) continue;
    const t = clamp(((b.x - x1) * dx + (b.z - z1) * dz) / lenSq, 0, 1);
    if (Math.hypot(b.x - (x1 + t * dx), b.z - (z1 + t * dz)) < clearDist) {
      return false;
    }
  }
  return true;
}

function firstBlockingBall3D(
  balls: readonly Ball3DState[],
  x1: number,
  z1: number,
  angle: number,
): number | null {
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  let minT = Infinity;
  let hitId: number | null = null;
  const rSumSq = BALL_R_3D * BALL_R_3D * 4;
  for (const b of balls) {
    if (b.pocketed || b.id === 0) continue;
    const ocx = b.x - x1;
    const ocz = b.z - z1;
    const proj = ocx * dx + ocz * dz;
    if (proj <= 0) continue;
    const perpSq = ocx * ocx + ocz * ocz - proj * proj;
    if (perpSq < rSumSq) {
      const t = proj - Math.sqrt(rSumSq - perpSq);
      if (t > 0 && t < minT) {
        minT = t;
        hitId = b.id;
      }
    }
  }
  return hitId;
}

function getLegalTargets3D(
  balls: readonly Ball3DState[],
  rule: BilliardsRule,
  group: BallGroup,
  isBreakShot: boolean,
): Ball3DState[] {
  return balls.filter(
    (b) => !b.pocketed && isLegalTargetBall3D(balls, rule, group, isBreakShot, b.id),
  );
}

export function chooseBotBallInHand3D(
  balls: readonly Ball3DState[],
  rule: BilliardsRule,
  group: BallGroup,
  isBreakShot: boolean,
): { x: number; z: number } {
  const targets = getLegalTargets3D(balls, rule, group, isBreakShot);
  for (const t of targets) {
    for (const p of POCKETS_3D) {
      const dx = t.x - p.x;
      const dz = t.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      for (const dist of [0.28, 0.42, 0.18]) {
        const sx = clamp(t.x + (dx / len) * dist, -HALF_W_3D + BALL_R_3D + 0.01, HALF_W_3D - BALL_R_3D - 0.01);
        const sz = clamp(t.z + (dz / len) * dist, -HALF_H_3D + BALL_R_3D + 0.01, HALF_H_3D - BALL_R_3D - 0.01);
        if (isPositionValidForCue3D(balls, sx, sz) && isSegmentClear3D(balls, sx, sz, t.x, t.z, t.id)) {
          return { x: sx, z: sz };
        }
      }
    }
  }
  return findOpenCueSpot3D(balls);
}

function simulateCandidate3D(
  balls: readonly Ball3DState[],
  rule: BilliardsRule,
  botSlot: PlayerSlot,
  groups: [BallGroup, BallGroup],
  isBreakShot: boolean,
  angle: number,
  power: number,
  spinY = 0,
): number {
  const sim = cloneBalls3D(balls);
  applyShotImpulse3D(sim, { angle, power, spinX: 0, spinY, elevationDeg: 0 });

  let firstHit: number | null = null;
  const pocketed: number[] = [];
  let scratched = false;
  let ticks = 0;
  while (
    ticks < 1400 &&
    stepBilliards3DFixedTick(
      sim,
      {
        onFirstHit: (id) => {
          if (firstHit === null) firstHit = id;
        },
        onPocket: (b) => {
          if (b.id === 0) scratched = true;
          else pocketed.push(b.id);
        },
        onBallHit: () => {},
        onCushion: () => {},
      },
      { animatePocketFall: false },
    )
  ) {
    ticks++;
  }

  const wasOnEight =
    rule === '8ball' &&
    groups[botSlot] !== null &&
    !balls.some((b) => !b.pocketed && ballType(b.id) === groups[botSlot]);

  const outcome = evaluateShotRules({
    rule,
    balls: sim.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.z,
      vx: b.vx,
      vy: b.vz,
      rollVx: b.rollVx,
      rollVy: b.rollVz,
      spinZ: b.spinY,
      pocketed: b.pocketed,
      q: b.q,
    })),
    currentPlayer: botSlot,
    groups,
    isBreakShot,
    wasOnEightBeforeShot: wasOnEight,
    firstHit,
    pocketed,
    scratched,
    playerNames: ['P1', 'Bot'],
  });

  if (outcome.winner) {
    return outcome.winner.slot === botSlot ? 10_000 : -10_000;
  }
  if (outcome.foulMessage || scratched) {
    return -2_000;
  }
  let score = 0;
  if (firstHit !== null && isLegalTargetBall3D(balls, rule, groups[botSlot], isBreakShot, firstHit)) {
    score += 120;
  }
  if (outcome.nextPlayer === botSlot) {
    score += 450 + pocketed.length * 160;
  }
  return score;
}

export function computeBotShot3D(params: {
  balls: readonly Ball3DState[];
  rule: BilliardsRule;
  botSlot: PlayerSlot;
  groups: [BallGroup, BallGroup];
  isBreakShot: boolean;
  canMoveCueBall: boolean;
  difficulty: BotDifficulty;
  rng?: () => number;
}): BotShotPlan {
  const rng = params.rng ?? Math.random;
  const cueSpot3D = params.canMoveCueBall
    ? chooseBotBallInHand3D(params.balls, params.rule, params.groups[params.botSlot], params.isBreakShot)
    : undefined;
  const cueTarget = cueSpot3D ? { x: cueSpot3D.x, y: cueSpot3D.z } : undefined;

  const workingBalls = cloneBalls3D(params.balls);
  const cue = workingBalls.find((b) => b.id === 0);
  if (!cue) {
    return { angle: 0, power: 0.5, spinX: 0, spinY: 0, elevationDeg: 0, cueTarget };
  }
  if (cueSpot3D) {
    cue.x = cueSpot3D.x;
    cue.z = cueSpot3D.z;
  }

  if (params.isBreakShot) {
    const jitter = params.difficulty === 'easy' ? 0.04 : params.difficulty === 'medium' ? 0.02 : 0.008;
    return {
      angle: (rng() - 0.5) * jitter,
      power: clamp(0.93 + (rng() - 0.5) * 0.04, 0.85, 0.96),
      spinX: 0,
      spinY: 0.15,
      elevationDeg: 0,
      cueTarget,
    };
  }

  const myGroup = params.groups[params.botSlot];
  const targets = getLegalTargets3D(workingBalls, params.rule, myGroup, params.isBreakShot);
  interface Candidate {
    angle: number;
    power: number;
    spinY?: number;
    geomScore: number;
  }
  const candidates: Candidate[] = [];

  for (const t of targets) {
    for (const p of POCKETS_3D) {
      const tx = p.x - t.x;
      const tz = p.z - t.z;
      const pDist = Math.hypot(tx, tz) || 1;
      const pnx = tx / pDist;
      const pnz = tz / pDist;
      const gx = t.x - pnx * (BALL_R_3D * 2);
      const gz = t.z - pnz * (BALL_R_3D * 2);
      const cx = gx - cue.x;
      const cz = gz - cue.z;
      const cDist = Math.hypot(cx, cz) || 1;
      const align = (cx / cDist) * pnx + (cz / cDist) * pnz;
      if (align < 0.22) continue;

      const angle = Math.atan2(cz, cx);
      const c1 = isSegmentClear3D(workingBalls, cue.x, cue.z, gx, gz, t.id);
      const c2 = isSegmentClear3D(workingBalls, t.x, t.z, p.x, p.z, t.id);
      const firstHit = firstBlockingBall3D(workingBalls, cue.x, cue.z, angle);
      if (firstHit !== null && !isLegalTargetBall3D(workingBalls, params.rule, myGroup, false, firstHit)) {
        continue;
      }

      const power = clamp(((cDist + pDist) / 2.6) / Math.max(0.45, align), 0.28, 0.86);
      const geomScore =
        align * 140 - (cDist + pDist) * 28 + (c1 ? 105 : -35) + (c2 ? 105 : -25);
      candidates.push({ angle, power, geomScore });
    }

    const directAngle = Math.atan2(t.z - cue.z, t.x - cue.x);
    const directClear = isSegmentClear3D(workingBalls, cue.x, cue.z, t.x, t.z, t.id);
    const firstDirect = firstBlockingBall3D(workingBalls, cue.x, cue.z, directAngle);
    if (directClear && (firstDirect === null || firstDirect === t.id)) {
      candidates.push({
        angle: directAngle,
        power: 0.48,
        geomScore: 15 - Math.hypot(t.x - cue.x, t.z - cue.z) * 10,
      });
    }
  }

  if (candidates.length === 0 && targets.length > 0) {
    const t = targets[0]!;
    const mirrors = [
      { x: t.x, z: 2 * (-HALF_H_3D + BALL_R_3D) - t.z },
      { x: t.x, z: 2 * (HALF_H_3D - BALL_R_3D) - t.z },
      { x: 2 * (-HALF_W_3D + BALL_R_3D) - t.x, z: t.z },
      { x: 2 * (HALF_W_3D - BALL_R_3D) - t.x, z: t.z },
    ];
    for (const m of mirrors) {
      const angle = Math.atan2(m.z - cue.z, m.x - cue.x);
      const firstHit = firstBlockingBall3D(workingBalls, cue.x, cue.z, angle);
      if (firstHit === null || isLegalTargetBall3D(workingBalls, params.rule, myGroup, false, firstHit)) {
        candidates.push({ angle, power: 0.68, geomScore: -20 });
      }
    }
  }

  candidates.sort((a, b) => b.geomScore - a.geomScore);
  let chosen = candidates[0] ?? {
    angle: targets[0] ? Math.atan2(targets[0].z - cue.z, targets[0].x - cue.x) : 0,
    power: 0.55,
    geomScore: -100,
  };

  if (params.difficulty !== 'easy' && candidates.length > 0) {
    const top = candidates.slice(0, params.difficulty === 'hard' ? 8 : 4);
    let bestCombined = -Infinity;
    for (const cand of top) {
      const variants: Candidate[] = [
        { ...cand, spinY: 0 },
        { ...cand, spinY: -0.45 },
        { ...cand, power: clamp(cand.power * 0.72, 0.28, 0.85), spinY: -0.3 },
      ];
      for (const variant of variants) {
        const simScore = simulateCandidate3D(
          workingBalls,
          params.rule,
          params.botSlot,
          params.groups,
          params.isBreakShot,
          variant.angle,
          variant.power,
          variant.spinY ?? 0,
        );
        const total = simScore + variant.geomScore * 0.25;
        if (total > bestCombined) {
          bestCombined = total;
          chosen = variant;
        }
      }
    }
  }

  const jit = JITTER_BY_DIFFICULTY[params.difficulty];
  return {
    angle: chosen.angle + (rng() - 0.5) * 2 * jit.angle,
    power: clamp(chosen.power + (rng() - 0.5) * 2 * jit.power, 0.24, 0.94),
    spinX: 0,
    spinY: chosen.spinY ?? 0,
    elevationDeg: 0,
    cueTarget,
  };
}
