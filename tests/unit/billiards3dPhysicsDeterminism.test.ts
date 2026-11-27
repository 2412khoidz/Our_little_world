import { describe, expect, it } from 'vitest';
import {
  BALL_R_3D,
  FIXED_STEP_DT_3D,
  HALF_H_3D,
  HALF_W_3D,
  applyShotImpulse3D,
  balls3DToWire,
  cloneBalls3D,
  createInitialRack3D,
  evaluateShotRules3D,
  findOpenCueSpot3D,
  isPositionValidForCue3D,
  makeBall3D,
  stepBilliards3DFixedTick,
  wireToBalls3D,
} from '../../src/shared/billiards/physics3dEngine';

function simulate3DWithVariableFps(
  initialBalls: ReturnType<typeof createInitialRack3D>,
  angle: number,
  power: number,
  spinX: number,
  spinY: number,
  elevationDeg: number,
  frameDt: number,
  timeScale = 1,
) {
  const balls = cloneBalls3D(initialBalls);
  applyShotImpulse3D(balls, { angle, power, spinX, spinY, elevationDeg });
  let firstHit: number | null = null;
  const pocketed: number[] = [];
  let scratched = false;
  let acc = 0;
  let moving = true;
  let guard = 0;

  while (moving && guard < 15_000) {
    guard++;
    acc += frameDt * timeScale;
    let steps = 0;
    while (acc >= FIXED_STEP_DT_3D && steps < 12) {
      moving = stepBilliards3DFixedTick(
        balls,
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
      );
      acc -= FIXED_STEP_DT_3D;
      steps++;
      if (!moving) {
        acc = 0;
        break;
      }
    }
  }
  return { balls, firstHit, pocketed, scratched };
}

describe('Billiards 3D metric physics determinism, massé & rules', () => {
  it('produces 0 m divergence across 30/60/120 FPS and 0.5x slow-mo replay', () => {
    const rack = createInitialRack3D('8ball', 20261126);
    const baseline = simulate3DWithVariableFps(rack, 0.025, 0.92, 0.25, -0.3, 15, 1 / 120, 1);
    const fps60 = simulate3DWithVariableFps(rack, 0.025, 0.92, 0.25, -0.3, 15, 1 / 60, 1);
    const fps30 = simulate3DWithVariableFps(rack, 0.025, 0.92, 0.25, -0.3, 15, 1 / 30, 1);
    const slowMo = simulate3DWithVariableFps(rack, 0.025, 0.92, 0.25, -0.3, 15, 1 / 60, 0.5);

    for (const variant of [fps60, fps30, slowMo]) {
      expect(variant.firstHit).toBe(baseline.firstHit);
      expect(variant.pocketed).toEqual(baseline.pocketed);
      expect(variant.scratched).toBe(baseline.scratched);
      let maxDiff = 0;
      for (let i = 0; i < baseline.balls.length; i++) {
        const a = baseline.balls[i]!;
        const b = variant.balls[i]!;
        expect(b.pocketed).toBe(a.pocketed);
        maxDiff = Math.max(maxDiff, Math.abs(b.x - a.x), Math.abs(b.z - a.z));
      }
      expect(maxDiff).toBe(0);
    }
  });

  it('curves cue ball laterally when massé elevation and side spin are applied', () => {
    const straight = simulate3DWithVariableFps(
      [makeBall3D(0, -0.6, 0), makeBall3D(1, 0.9, 0.4)],
      0,
      0.55,
      0,
      0,
      0,
      1 / 120,
      1,
    );
    const masse = simulate3DWithVariableFps(
      [makeBall3D(0, -0.6, 0), makeBall3D(1, 0.9, 0.4)],
      0,
      0.55,
      0.7,
      0,
      38,
      1 / 120,
      1,
    );
    expect(Math.abs(straight.balls[0]!.z)).toBeLessThan(0.005);
    expect(Math.abs(masse.balls[0]!.z)).toBeGreaterThan(0.05);
  });

  it('round-trips 3D state cleanly through wire format and validates cue bounds', () => {
    const rack = createInitialRack3D('9ball', 77);
    expect(rack).toHaveLength(10);
    const wire = balls3DToWire(rack);
    const restored = wireToBalls3D(wire);
    expect(restored[0]!.x).toBeCloseTo(rack[0]!.x, 6);
    expect(restored[0]!.z).toBeCloseTo(rack[0]!.z, 6);

    const spot = findOpenCueSpot3D(rack);
    expect(isPositionValidForCue3D(rack, spot.x, spot.z)).toBe(true);
    expect(isPositionValidForCue3D(rack, HALF_W_3D + 0.01, 0)).toBe(false);
    expect(isPositionValidForCue3D(rack, 0, HALF_H_3D + 0.01)).toBe(false);
    expect(isPositionValidForCue3D(rack, rack[1]!.x, rack[1]!.z)).toBe(false);
    expect(BALL_R_3D).toBeGreaterThan(0.02);

    const openBreak = evaluateShotRules3D({
      rule: '8ball',
      balls: createInitialRack3D('8ball', 99),
      currentPlayer: 0,
      groups: [null, null],
      isBreakShot: true,
      wasOnEightBeforeShot: false,
      firstHit: 1,
      pocketed: [10],
      scratched: false,
      playerNames: ['Mây', 'Nắng'],
    });
    expect(openBreak.groups).toEqual(['stripe', 'solid']);
    expect(openBreak.nextPlayer).toBe(0);
  });
});
