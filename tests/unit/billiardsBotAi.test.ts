import { describe, expect, it } from 'vitest';
import {
  chooseBotBallInHand2D,
  chooseBotBallInHand3D,
  computeBotShot2D,
  computeBotShot3D,
} from '../../src/shared/billiards/botAi';
import {
  BALL_R_3D,
  HALF_H_3D,
  HALF_W_3D,
  applyShotImpulse3D,
  isPositionValidForCue3D,
  makeBall3D,
  stepBilliards3DFixedTick,
} from '../../src/shared/billiards/physics3dEngine';
import {
  PLAY_L,
  PLAY_R,
  PLAY_T,
  POCKETS,
  TABLE_H,
  applyShotImpulse2D,
  isPositionValidForCue,
  makeBall,
  stepBilliardsFixedTick,
} from '../../src/shared/billiards/physicsEngine';

describe('Billiards Bot AI (2D & 3D)', () => {
  it('2D bot aims at legal target ball toward pocket and avoids illegal 8-ball obstacle', () => {
    const corner = POCKETS[2]!; // top-right
    const legal = makeBall(2, corner.x - 120, corner.y + 70);
    const blocker8 = makeBall(8, 250, TABLE_H / 2);
    const cue = makeBall(0, 140, TABLE_H / 2);
    // Add one stripe ball so table has both groups
    const stripe = makeBall(11, 450, 380);
    const balls = [cue, legal, blocker8, stripe];

    const plan = computeBotShot2D({
      balls,
      rule: '8ball',
      botSlot: 1,
      groups: ['stripe', 'solid'],
      isBreakShot: false,
      canMoveCueBall: false,
      difficulty: 'hard',
      rng: () => 0.5,
    });

    expect(plan.power).toBeGreaterThanOrEqual(0.24);
    expect(plan.power).toBeLessThanOrEqual(0.95);

    const sim = balls.map((b) => ({ ...b, q: { ...b.q } }));
    applyShotImpulse2D(sim, { ...plan, spinX: plan.spinX, spinY: plan.spinY });
    let firstHit: number | null = null;
    const pocketed: number[] = [];
    let guard = 0;
    while (
      guard++ < 1200 &&
      stepBilliardsFixedTick(sim, {
        onFirstHit: (id) => {
          if (firstHit === null) firstHit = id;
        },
        onPocket: (b) => pocketed.push(b.id),
        onBallHit: () => {},
        onCushion: () => {},
      })
    ) {
      // simulate
    }

    expect(firstHit).toBe(2);
    expect(pocketed).not.toContain(0);
    expect(pocketed).not.toContain(8);
  });

  it('2D bot places valid ball-in-hand behind legal target aligned with pocket', () => {
    const balls = [
      makeBall(0, PLAY_L + 100, TABLE_H / 2),
      makeBall(1, PLAY_R - 140, PLAY_T + 90),
      makeBall(9, 450, 320),
    ];
    const spot = chooseBotBallInHand2D(balls, '9ball', null, false);
    expect(isPositionValidForCue(balls, spot.x, spot.y)).toBe(true);
  });

  it('3D bot selects legal target, avoids scratching/early-8, and handles ball-in-hand', () => {
    const cue = makeBall3D(0, -0.5, 0);
    const legal = makeBall3D(3, HALF_W_3D - 0.35, -HALF_H_3D + 0.2);
    const eight = makeBall3D(8, 0.0, 0.05);
    const stripe = makeBall3D(12, 0.2, 0.3);
    const balls = [cue, legal, eight, stripe];

    const spot = chooseBotBallInHand3D(balls, '8ball', 'solid', false);
    expect(isPositionValidForCue3D(balls, spot.x, spot.z)).toBe(true);

    const plan = computeBotShot3D({
      balls,
      rule: '8ball',
      botSlot: 1,
      groups: ['stripe', 'solid'],
      isBreakShot: false,
      canMoveCueBall: true,
      difficulty: 'hard',
      rng: () => 0.5,
    });

    expect(plan.cueTarget).toBeDefined();
    expect(isPositionValidForCue3D(balls, plan.cueTarget!.x, plan.cueTarget!.y)).toBe(true);

    const sim = balls.map((b) => ({ ...b, q: { ...b.q } }));
    applyShotImpulse3D(sim, {
      angle: plan.angle,
      power: plan.power,
      spinX: plan.spinX,
      spinY: plan.spinY,
      elevationDeg: plan.elevationDeg,
      cueX: plan.cueTarget!.x,
      cueZ: plan.cueTarget!.y,
    });
    let firstHit: number | null = null;
    const pocketed: number[] = [];
    let guard = 0;
    while (
      guard++ < 1500 &&
      stepBilliards3DFixedTick(
        sim,
        {
          onFirstHit: (id) => {
            if (firstHit === null) firstHit = id;
          },
          onPocket: (b) => pocketed.push(b.id),
          onBallHit: () => {},
          onCushion: () => {},
        },
        { animatePocketFall: false },
      )
    ) {
      // simulate
    }
    expect(firstHit).toBe(3);
    expect(pocketed).not.toContain(0);
    expect(pocketed).not.toContain(8);
    expect(BALL_R_3D).toBeGreaterThan(0);
  });

  it('easy difficulty injects wider variance than hard difficulty with fixed rng', () => {
    const balls = [makeBall(0, 200, TABLE_H / 2), makeBall(1, 500, TABLE_H / 2), makeBall(9, 750, TABLE_H / 2)];
    const easy = computeBotShot2D({
      balls,
      rule: '9ball',
      botSlot: 1,
      groups: [null, null],
      isBreakShot: false,
      canMoveCueBall: false,
      difficulty: 'easy',
      rng: () => 0.99,
    });
    const hard = computeBotShot2D({
      balls,
      rule: '9ball',
      botSlot: 1,
      groups: [null, null],
      isBreakShot: false,
      canMoveCueBall: false,
      difficulty: 'hard',
      rng: () => 0.99,
    });
    expect(Math.abs(easy.angle)).toBeGreaterThan(Math.abs(hard.angle));
  });
});
