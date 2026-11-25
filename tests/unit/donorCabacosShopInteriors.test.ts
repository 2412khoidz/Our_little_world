import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

const INTERIOR_MAPS = ['shop_seed', 'shop_tool', 'shop_crop_market', 'shop_town_hall'] as const;

describe('donor Cabacos shop interior maps', () => {
  it.each(INTERIOR_MAPS)('%s parses collision and village exit portal', (mapId) => {
    const parsed = getParsedTiledWorld(mapId);
    expect(parsed).toBeTruthy();
    expect(parsed!.widthTiles).toBe(24);
    expect(parsed!.heightTiles).toBe(18);
    expect(parsed!.blockedTiles.size).toBeGreaterThan(50);
    expect(parsed!.portals.some((p) => p.targetMapId === 'village')).toBe(true);
  });

  it('village wires four Cabacos shop portals', () => {
    const village = getParsedTiledWorld('village')!;
    const ids = ['village-to-shop-seed', 'village-to-shop-tool', 'village-to-shop-crop-market', 'village-to-shop-town-hall'];
    for (const id of ids) {
      expect(village.portals.some((p) => p.id === id)).toBe(true);
    }
  });

  it('vendored donor TMJ + PNG exist', () => {
    const root = path.join(process.cwd(), 'public/maps/donor/cabacos');
    for (const file of ['Seed_shop.tmj', 'tool_shop.tmj', 'Crop_market.tmj', 'Town_hall.tmj', 'Cabacos_map.tmj']) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, 'seed_shop_sunnyside_style_384x288.png'))).toBe(true);
  });
});