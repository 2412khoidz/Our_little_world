import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import farmMapJson from '../../src/assets/maps/farm.json';
import { getFarmingCropStageFrame, getFarmingTreeFrame } from '../../src/shared/art/farmingSpriteAtlas';
import { DEEP_FIELD_CROP_SKUS } from '../../src/shared/farming/deepCropSimulation';
import { ORCHARD_TREE_DEFS } from '../../src/shared/farming/orchard';
import {
  computeFarmCropDisplayScale,
  resolveFarmCropVisual,
} from '../../src/shared/donor/farmCropVisualResolver';
import {
  computeOrchardTreeDisplayScale,
  DEFAULT_ORCHARD_SLOT_TILES,
} from '../../src/game/farming/OrchardVisualController';
import {
  computeLivestockDisplayScale,
  DEFAULT_LIVESTOCK_TILES,
} from '../../src/game/farming/LivestockVisualController';
import { TILE_SIZE } from '../../src/shared/maps';

const REPO_ROOT = path.resolve(__dirname, '../..');

function readPngSize(rel: string): { w: number; h: number } {
  const buf = fs.readFileSync(path.join(REPO_ROOT, rel));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe('Farm Visual Scale & 16px Coordinate Parity (Checkpoint 4)', () => {
  it('keeps crop sprites and harvest/water indicators strictly proportional to 16px tiles and Cozy avatar', () => {
    expect(TILE_SIZE).toBe(16);
    expect(farmMapJson.tilewidth).toBe(16);
    expect(farmMapJson.tileheight).toBe(16);

    // Cozy Human V2 avatar is 16x32 @ scale 1 on 16px tiles
    const avatarDisplayHeightPx = 32;

    for (const cropSku of DEEP_FIELD_CROP_SKUS) {
      for (let stage = 0; stage <= 3; stage += 1) {
        const resolved = resolveFarmCropVisual(cropSku, stage, stage === 3, TILE_SIZE);
        expect(resolved, `missing visual for ${cropSku}@${stage}`).not.toBeNull();
        const frame = getFarmingCropStageFrame(cropSku, stage);
        expect(frame).not.toBeNull();
        const renderedW = frame!.w * resolved!.displayScale;
        const renderedH = frame!.h * resolved!.displayScale;
        expect(renderedW, `${cropSku}@${stage} width`).toBeLessThanOrEqual(18);
        expect(renderedH, `${cropSku}@${stage} height`).toBeLessThan(avatarDisplayHeightPx);
      }
    }

    expect(computeFarmCropDisplayScale(16, 16, 16)).toBeCloseTo(1.0);
    expect(computeFarmCropDisplayScale(16, 32, 16)).toBeCloseTo(0.85);
    expect(computeFarmCropDisplayScale(32, 36, 16)).toBeCloseTo(17 / 32);

    // Ready & need-water badges must remain crisp and compact (< 10px tall on 16px tiles)
    const readySize = readPngSize('public/assets/donor/cabacos-plantation/indicators/ready_to_collect.png');
    const waterSize = readPngSize('public/assets/donor/cabacos-plantation/indicators/crop_need_water.png');
    const indicatorScale = 0.85 * (TILE_SIZE / 16);
    expect(readySize.h * indicatorScale).toBeLessThanOrEqual(9);
    expect(waterSize.h * indicatorScale).toBeLessThanOrEqual(9);
  });

  it('normalizes orchard tree heights and livestock sizes for 16px farm world scale', () => {
    for (const tree of ORCHARD_TREE_DEFS) {
      const sapling = getFarmingTreeFrame(tree.treeId, 'sapling')!;
      const fruiting = getFarmingTreeFrame(tree.treeId, 'fruiting')!;
      const saplingH = sapling.h * computeOrchardTreeDisplayScale(sapling.h, 'sapling', 16);
      const fruitingH = fruiting.h * computeOrchardTreeDisplayScale(fruiting.h, 'fruiting', 16);
      expect(saplingH).toBeCloseTo(24);
      expect(fruitingH).toBeCloseTo(48);
    }

    const livestockRenderedPx = 24 * computeLivestockDisplayScale(16);
    expect(livestockRenderedPx).toBeCloseTo(18);
  });

  it('places all 12 orchard slots and 14 livestock slots on walkable, non-soil, non-road, disjoint tiles', () => {
    expect(DEFAULT_ORCHARD_SLOT_TILES).toHaveLength(12);
    expect(DEFAULT_LIVESTOCK_TILES).toHaveLength(14);

    const W = farmMapJson.width;
    const H = farmMapJson.height;
    const layerData = (name: string) =>
      farmMapJson.layers.find((l) => l.name.toLowerCase() === name.toLowerCase())?.data ?? [];

    const coll = layerData('Collision');
    const soil = layerData('soil');
    const paths = layerData('paths');
    const water = layerData('water');
    const bldg = layerData('building');
    const above = layerData('Above Player');

    const seen = new Set<string>();
    for (const [x, y] of [...DEFAULT_ORCHARD_SLOT_TILES, ...DEFAULT_LIVESTOCK_TILES]) {
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThan(W - 4);
      expect(y).toBeGreaterThanOrEqual(3);
      expect(y).toBeLessThan(H - 4);
      const idx = y * W + x;
      expect(coll[idx], `tile (${x},${y}) collision`).toBe(0);
      expect(soil[idx], `tile (${x},${y}) soil`).toBe(0);
      expect(paths[idx], `tile (${x},${y}) paths`).toBe(0);
      expect(water[idx], `tile (${x},${y}) water`).toBe(0);
      expect(bldg[idx], `tile (${x},${y}) building`).toBe(0);
      expect(above[idx], `tile (${x},${y}) above`).toBe(0);
      const key = `${x},${y}`;
      expect(seen.has(key), `duplicate slot ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
