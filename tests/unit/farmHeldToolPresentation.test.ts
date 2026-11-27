import { describe, expect, it } from 'vitest';
import {
  cabacosHeldToolTextureKey,
  heldSeedCropSprite,
} from '../../src/shared/donor/cabacos-79e423d/farmHeldToolPresentation';

describe('farmHeldToolPresentation', () => {
  it('maps farming tools to Cabacos textures', () => {
    expect(cabacosHeldToolTextureKey('tool_hoe')).toBe('donor-cabacos-hoe');
    expect(cabacosHeldToolTextureKey('tool_watering_can')).toBe('donor-cabacos-watering-can');
  });

  it('maps Hollowmere-adjacent rod SKU to Cabacos rod art', () => {
    expect(cabacosHeldToolTextureKey('rod_basic')).toBe('donor-cabacos-rod');
  });

  it('held seeds use crop growth frame 0, not UI icons', () => {
    expect(heldSeedCropSprite('seed_wheat')).toEqual({
      kind: 'spritesheet',
      textureKey: 'donor-cabacos-wheat',
      frame: 0,
    });
    expect(heldSeedCropSprite('seed_tomato')).toEqual({
      kind: 'image',
      textureKey: 'donor-pydew-tomato-0',
    });
  });
});