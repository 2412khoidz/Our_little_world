import { describe, expect, it } from 'vitest';
import {
  FIXED_STEP_DT,
  MAX_SPEED,
  MIN_SPEED_SHOT,
  PLAY_L,
  PLAY_R,
  TABLE_H,
  cloneBalls,
  createInitialRack,
  evaluateShotRules,
  stepBilliardsFixedTick,
} from '../../src/shared/billiards/physicsEngine';
import type { BallState } from '../../src/shared/billiards/types';

function simulateShotWithVariableFps(
  initialBalls: BallState[],
  angle: number,
  power: number,
  spinX: number,
  spinY: number,
  frameDt: number,
  timeScale = 1,
): { balls: BallState[]; firstHit: number | null; pocketed: number[]; scratched: boolean } {
  const balls = cloneBalls(initialBalls);
  const cue = balls.find((b) => b.id === 0)!;
  const speed = MIN_SPEED_SHOT + Math.pow(power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  cue.vx = dx * speed;
  cue.vy = dy * speed;
  if (spinY > 0.02) {
    const f = 1 + spinY * 1.4;
    cue.rollVx = dx * speed * f;
    cue.rollVy = dy * speed * f;
  } else if (spinY < -0.02) {
    const f = spinY * 2.2;
    cue.rollVx = dx * speed * f;
    cue.rollVy = dy * speed * f;
  } else {
    cue.rollVx = dx * speed * 0.14;
    cue.rollVy = dy * speed * 0.14;
  }
  cue.spinZ = spinX * speed * 1.1;

  let firstHit: number | null = null;
  const pocketed: number[] = [];
  let scratched = false;
  let accumulator = 0;
  let stillMoving = true;
  let guard = 0;

  while (stillMoving && guard < 15_000) {
    guard++;
    accumulator += frameDt * timeScale;
    let steps = 0;
    while (accumulator >= FIXED_STEP_DT && steps < 12) {
      stillMoving = stepBilliardsFixedTick(balls, {
        onFirstHit: (id) => {
          if (firstHit === null) firstHit = id;
        },
        onPocket: (b) => {
          if (b.id === 0) scratched = true;
          else pocketed.push(b.id);
        },
        onBallHit: () => {},
        onCushion: () => {},
      });
      accumulator -= FIXED_STEP_DT;
      steps++;
      if (!stillMoving) {
        accumulator = 0;
        break;
      }
    }
  }

  return { balls, firstHit, pocketed, scratched };
}

describe('Billiards V2 fixed-timestep physics determinism & rules', () => {
  it('produces 0 px divergence across 30/60/120 FPS and 0.5x slow-mo replay', () => {
    const rack8 = createInitialRack('8ball', 20261126);
    const baseline = simulateShotWithVariableFps(rack8, 0.03, 0.92, 0.25, -0.3, 1 / 120, 1);
    const fps60 = simulateShotWithVariableFps(rack8, 0.03, 0.92, 0.25, -0.3, 1 / 60, 1);
    const fps30 = simulateShotWithVariableFps(rack8, 0.03, 0.92, 0.25, -0.3, 1 / 30, 1);
    const slowMo = simulateShotWithVariableFps(rack8, 0.03, 0.92, 0.25, -0.3, 1 / 60, 0.5);

    for (const variant of [fps60, fps30, slowMo]) {
      expect(variant.firstHit).toBe(baseline.firstHit);
      expect(variant.pocketed).toEqual(baseline.pocketed);
      expect(variant.scratched).toBe(baseline.scratched);
      let maxDiff = 0;
      for (let i = 0; i < baseline.balls.length; i++) {
        const a = baseline.balls[i]!;
        const b = variant.balls[i]!;
        expect(b.pocketed).toBe(a.pocketed);
        maxDiff = Math.max(maxDiff, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      }
      expect(maxDiff).toBe(0);
    }
  });

  it('evaluates 8-ball and 9-ball outcomes accurately (assign groups, early 8 loss, legal 8/9 win, 9 respot)', () => {
    const rack8 = createInitialRack('8ball', 42);
    const openBreak = evaluateShotRules({
      rule: '8ball',
      balls: rack8,
      currentPlayer: 0,
      groups: [null, null],
      isBreakShot: true,
      wasOnEightBeforeShot: false,
      firstHit: 1,
      pocketed: [2],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(openBreak.groups).toEqual(['solid', 'stripe']);
    expect(openBreak.nextPlayer).toBe(0);
    expect(openBreak.winner).toBeUndefined();

    const earlyEightLoss = evaluateShotRules({
      rule: '8ball',
      balls: rack8,
      currentPlayer: 0,
      groups: ['solid', 'stripe'],
      isBreakShot: false,
      wasOnEightBeforeShot: false,
      firstHit: 2,
      pocketed: [8],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(earlyEightLoss.winner?.slot).toBe(1);

    const legalEightWin = evaluateShotRules({
      rule: '8ball',
      balls: rack8,
      currentPlayer: 0,
      groups: ['solid', 'stripe'],
      isBreakShot: false,
      wasOnEightBeforeShot: true,
      firstHit: 8,
      pocketed: [8],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(legalEightWin.winner?.slot).toBe(0);

    const rack9 = createInitialRack('9ball', 77);
    const foulWithNine = evaluateShotRules({
      rule: '9ball',
      balls: rack9,
      currentPlayer: 1,
      groups: [null, null],
      isBreakShot: false,
      wasOnEightBeforeShot: false,
      firstHit: 2,
      pocketed: [9],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(foulWithNine.ballInHand).toBe(true);
    expect(foulWithNine.nextPlayer).toBe(0);
    expect(foulWithNine.respotNine).toBe(true);
    expect(foulWithNine.winner).toBeUndefined();

    const legalNineWin = evaluateShotRules({
      rule: '9ball',
      balls: rack9,
      currentPlayer: 1,
      groups: [null, null],
      isBreakShot: false,
      wasOnEightBeforeShot: false,
      firstHit: 1,
      pocketed: [9],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(legalNineWin.winner?.slot).toBe(1);
    expect(PLAY_R - PLAY_L).toBeGreaterThan(0);
    expect(TABLE_H).toBe(540);
  });
});
