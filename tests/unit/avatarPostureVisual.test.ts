import { describe, expect, it } from 'vitest';
import { getIdleFrameIndex } from '../../src/game/art/avatarSpriteBuilder';

describe('avatarPostureVisual', () => {
  it('idle frame indices remain stable for 4-way facing', () => {
    expect(getIdleFrameIndex('down')).toBe(0);
    expect(getIdleFrameIndex('up')).toBe(3);
    expect(getIdleFrameIndex('left')).toBe(6);
    expect(getIdleFrameIndex('right')).toBe(9);
  });
});