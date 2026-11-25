import { describe, expect, it } from 'vitest';
import { carePortraitFrameIndex, getCarePortraitAnimList } from '../../src/game/pet/care/petCarePortraitPainter';

describe('petCarePortraitPainter', () => {
  it('maps care anim states to stable frame indices', () => {
    const idx = carePortraitFrameIndex('sit_south', 0);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(getCarePortraitAnimList()).toContain('sit_south');
    expect(getCarePortraitAnimList()).not.toContain('walk_south');
  });
});