import { describe, expect, it } from 'vitest';
import { cabacosCropVisual, CABACOS_CROP_VISUALS } from '../../src/shared/donor/cabacos-79e423d/cropVisualRegistry';

describe('cabacosCropVisual', () => {
  it('maps starter OLW crops to vendored spritesheets', () => {
    expect(cabacosCropVisual('wheat')?.textureKey).toBe('donor-cabacos-wheat');
    expect(cabacosCropVisual('carrot')?.textureKey).toBe('donor-cabacos-carrot');
    expect(cabacosCropVisual('sunflower')?.textureKey).toBe('donor-cabacos-sunflower');
    expect(cabacosCropVisual('tomato')?.textureKey).toBe('donor-cabacos-cabbage');
    expect(Object.keys(CABACOS_CROP_VISUALS).length).toBeGreaterThanOrEqual(5);
  });
});