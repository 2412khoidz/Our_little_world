import { describe, expect, it } from 'vitest';
import { isDonorCabacosMap, tiledMapPropertyValue } from '../../src/game/world/renderDonorCabacosMap';

describe('donor Cabacos map detection', () => {
  it('reads olwDonor from Tiled property array on tilemap.properties', () => {
    const tilemap = {
      properties: [
        { name: 'mapId', type: 'string', value: 'village' },
        { name: 'olwDonor', type: 'string', value: 'cabacos' },
      ],
      tilesets: [],
    } as unknown as Phaser.Tilemaps.Tilemap;

    expect(tiledMapPropertyValue(tilemap, 'olwDonor')).toBe('cabacos');
    expect(isDonorCabacosMap(tilemap)).toBe(true);
  });

  it('does not treat missing olwDonor as Cabacos donor', () => {
    const tilemap = {
      properties: [{ name: 'mapId', type: 'string', value: 'village' }],
      tilesets: [],
    } as unknown as Phaser.Tilemaps.Tilemap;
    expect(isDonorCabacosMap(tilemap)).toBe(false);
  });
});