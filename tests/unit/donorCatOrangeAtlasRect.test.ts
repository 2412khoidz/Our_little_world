import { describe, expect, it } from 'vitest';
import { donorCatOrangeFramePixels } from '../../src/shared/petLiving/donor/donorCatOrangeAtlasRect';

describe('donorCatOrangeAtlasRect', () => {
  it('maps Idle_South frame 48 into world-props atlas coordinates', () => {
    expect(donorCatOrangeFramePixels(48)).toEqual({ srcX: 0, srcY: 256, frameW: 16, frameH: 16 });
  });
});