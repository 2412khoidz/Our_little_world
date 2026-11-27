import { describe, expect, it } from 'vitest';
import { FARMING_CROPS_ATLAS_KEY } from '../../src/shared/art/farmingSpriteAtlas';
import { resolveFarmCropVisual } from '../../src/shared/donor/farmCropVisualResolver';

describe('resolveFarmCropVisual', () => {
  it('uses packed donor farming atlas for tomato with bounded 16px canonical scale', () => {
    const v = resolveFarmCropVisual('tomato', 1, false);
    expect(v?.mode).toBe('farming_atlas');
    expect(v?.textureKey).toBe(FARMING_CROPS_ATLAS_KEY);
    expect(v?.frameKey).toBeTruthy();
    expect(v?.displayScale).toBeGreaterThan(0);
    expect(v?.displayScale).toBeLessThanOrEqual(1.2);
  });

  it('uses packed donor farming atlas for wheat on 16px canonical farm tiles', () => {
    const v = resolveFarmCropVisual('wheat', 2, false);
    expect(v?.mode).toBe('farming_atlas');
    expect(v?.textureKey).toBe(FARMING_CROPS_ATLAS_KEY);
    expect(v?.frameKey).toBeTruthy();
    expect(v?.displayScale).toBeGreaterThan(0);
    expect(v?.displayScale).toBeLessThanOrEqual(1.2);
  });
});