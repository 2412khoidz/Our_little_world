import { describe, expect, it } from 'vitest';
import {
  createJoystickState,
  joystickCancelAll,
  joystickPointerDown,
  joystickPointerMove,
  joystickPointerRelease,
} from '../../src/shared/input/virtualJoystickController';

describe('virtualJoystickController — multi-touch isolation, deadzone & zero-stuck cleanup', () => {
  const cfg = { maxRadiusPx: 40, deadzoneRatio: 0.15 };

  it('ignores movements inside deadzone and clamps normalized vectors to unit circle', () => {
    const s0 = createJoystickState();
    const s1 = joystickPointerDown(s0, 1, 100, 100, 103, 100, cfg); // 3 / 40 = 0.075 < 0.15
    expect(s1.active).toBe(true);
    expect(s1.vx).toBe(0);
    expect(s1.vy).toBe(0);

    // Drag past maxRadiusPx
    const s2 = joystickPointerMove(s1, 1, 200, 100, cfg);
    expect(s2.knobX).toBeCloseTo(40, 5);
    expect(s2.knobY).toBeCloseTo(0, 5);
    expect(s2.vx).toBeCloseTo(1, 5);
    expect(s2.vy).toBeCloseTo(0, 5);

    // Diagonal drag magnitude remains <= 1
    const s3 = joystickPointerMove(s2, 1, 160, 160, cfg);
    expect(Math.hypot(s3.vx, s3.vy)).toBeLessThanOrEqual(1.0001);
    expect(s3.vx).toBeGreaterThan(0.6);
    expect(s3.vy).toBeGreaterThan(0.6);
  });

  it('isolates independent touch pointerIds so a second thumb action cannot hijack or drop the stick', () => {
    const s0 = createJoystickState();
    const s1 = joystickPointerDown(s0, 11, 50, 50, 90, 50, cfg);
    expect(s1.vx).toBeCloseTo(1, 4);

    // Second finger (pointerId 22) tries to press/move/release -> ignored!
    const s2 = joystickPointerDown(s1, 22, 300, 300, 300, 340, cfg);
    expect(s2.activePointerId).toBe(11);
    expect(s2.vx).toBeCloseTo(1, 4);

    const s3 = joystickPointerMove(s2, 22, 200, 200, cfg);
    expect(s3.vx).toBeCloseTo(1, 4);

    const s4 = joystickPointerRelease(s3, 22);
    expect(s4.active).toBe(true);
    expect(s4.vx).toBeCloseTo(1, 4);

    // Releasing owner pointerId 11 resets cleanly to zero
    const s5 = joystickPointerRelease(s4, 11);
    expect(s5.active).toBe(false);
    expect(s5.activePointerId).toBeNull();
    expect(s5.vx).toBe(0);
    expect(s5.vy).toBe(0);
  });

  it('resets unconditionally on cancel/blur/visibility/modal', () => {
    const s1 = joystickPointerDown(createJoystickState(), 7, 100, 100, 100, 60, cfg);
    expect(s1.vy).toBeCloseTo(-1, 4);
    const s2 = joystickCancelAll(s1);
    expect(s2.active).toBe(false);
    expect(s2.vx).toBe(0);
    expect(s2.vy).toBe(0);
  });
});
