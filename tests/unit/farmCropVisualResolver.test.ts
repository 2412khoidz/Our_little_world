import { describe, expect, it } from 'vitest';
import { resolveFarmCropVisual } from '../../src/shared/donor/farmCropVisualResolver';

describe('resolveFarmCropVisual', () => {
  it('uses PyDew per-frame art for tomato (not Cabacos placeholder)', () => {
    const v = resolveFarmCropVisual('tomato', 1, false);
    expect(v?.mode).toBe('pydew_image');
    expect(v?.textureKey).toBe('donor-pydew-tomato-1');
  });

  it('uses Cabacos spritesheet for wheat on farm tiles', () => {
    const v = resolveFarmCropVisual('wheat', 2, false);
    expect(v?.mode).toBe('cabacos_spritesheet');
    expect(v?.textureKey).toBe('donor-cabacos-wheat');
    expect(v?.frame).toBe(2);
  });
});