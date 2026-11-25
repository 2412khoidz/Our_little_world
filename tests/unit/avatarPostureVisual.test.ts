import { describe, expect, it } from 'vitest';
import { getIdleFrameIndex } from '../../src/game/art/avatarSpriteBuilder';
import { expectedPostureAnimKey } from '../../src/game/avatar/avatarPostureVisual';

describe('avatarPostureVisual', () => {
  it('idle frame indices remain stable for 4-way facing', () => {
    expect(getIdleFrameIndex('down')).toBe(0);
    expect(getIdleFrameIndex('up')).toBe(3);
    expect(getIdleFrameIndex('left')).toBe(6);
    expect(getIdleFrameIndex('right')).toBe(9);
  });

  it('expected posture anim keys match atlas sit/lie naming', () => {
    const key = 'avatar:test';
    expect(expectedPostureAnimKey(key, 'sit_sofa', 'down')).toBe(`${key}:sit-down`);
    expect(expectedPostureAnimKey(key, 'sit_study', 'left')).toBe(`${key}:sit-up`);
    expect(expectedPostureAnimKey(key, 'lie_bed', 'right')).toBe(`${key}:lie-right`);
  });
});