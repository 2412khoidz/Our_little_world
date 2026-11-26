import { describe, expect, it } from 'vitest';
import {
  facingTowardPoint,
  isFarmPlotPixelAdjacent,
  isFarmPlotTileAdjacent,
} from '../../src/shared/farming/farmAdjacency';
import { EMPTY_HELD_ITEM, resolveContextualActions } from '../../src/shared/interaction/interactionResolver';
import { resolveHeldItemHandTransform } from '../../src/shared/interaction/heldItemAnchors';
import { resolveSharedPostureSeat } from '../../src/shared/interaction/furnitureSeatAnchors';
import type { FarmPlotView } from '../../src/shared/farming/farmSnapshotTypes';

describe('Checkpoint C1–C3: strict adjacent farming, hand anchors & bench seats', () => {
  it('enforces strict 1-tile adjacency and rejects 2-tile farm plots', () => {
    expect(isFarmPlotTileAdjacent(10, 10, 10, 10)).toBe(true);
    expect(isFarmPlotTileAdjacent(10, 10, 11, 11)).toBe(true);
    expect(isFarmPlotTileAdjacent(10, 10, 12, 10)).toBe(false);
    expect(isFarmPlotTileAdjacent(10, 10, 10, 12)).toBe(false);

    const playerX = 10.5 * 16;
    const playerY = 10.5 * 16;
    expect(isFarmPlotPixelAdjacent(playerX, playerY, 11, 10, 16)).toBe(true);
    expect(isFarmPlotPixelAdjacent(playerX, playerY, 11, 11, 16)).toBe(true);
    expect(isFarmPlotPixelAdjacent(playerX, playerY, 12, 10, 16)).toBe(false);
    expect(isFarmPlotPixelAdjacent(playerX, playerY, 10, 12, 16)).toBe(false);

    expect(facingTowardPoint(160, 160, 176, 160, 'down')).toBe('right');
    expect(facingTowardPoint(160, 160, 160, 144, 'down')).toBe('up');
  });

  it('rejects non-adjacent crop_plot targets in resolveContextualActions and accepts adjacent ones', () => {
    const plotMap = new Map<number, FarmPlotView>([
      [
        0,
        {
          plotId: 0,
          soil: 'empty',
          cropSku: null,
          plantedAtMs: null,
          waterCount: 0,
          growthPermille: 0,
          ready: false,
          harvestReadyAtMs: null,
          growthStage: null,
        },
      ],
    ]);
    const heldHoe = {
      ...EMPTY_HELD_ITEM,
      slotIndex: 0,
      itemSku: 'tool_hoe',
      itemKind: 'tool' as const,
      labelVi: 'Cuốc gỗ',
    };

    const twoTilesAway = resolveContextualActions({
      playerX: 10.5 * 16,
      playerY: 10.5 * 16,
      facing: 'right',
      heldItem: heldHoe,
      interactables: [
        {
          id: 'farm_plot_0',
          kind: 'crop_plot',
          labelVi: 'Luống #1',
          x: 12.5 * 16,
          y: 10.5 * 16,
          maxRadiusPx: 23,
        },
      ],
      farmPlotByIndex: plotMap,
    });
    expect(twoTilesAway.primary).toBeNull();

    const adjacent = resolveContextualActions({
      playerX: 10.5 * 16,
      playerY: 10.5 * 16,
      facing: 'right',
      heldItem: heldHoe,
      interactables: [
        {
          id: 'farm_plot_0',
          kind: 'crop_plot',
          labelVi: 'Luống #1',
          x: 11.5 * 16,
          y: 10.5 * 16,
          maxRadiusPx: 23,
        },
      ],
      farmPlotByIndex: plotMap,
    });
    expect(adjacent.primary?.code).toBe('till_plot');
  });

  it('keeps tools hidden during idle/walk and anchors held items to directional hands with proper depth', () => {
    const hiddenTool = resolveHeldItemHandTransform({
      facing: 'down',
      itemKind: 'tool',
      itemSku: 'tool_hoe',
      isMoving: true,
      timeMs: 400,
      toolSwingActive: false,
    });
    expect(hiddenTool.visible).toBe(false);

    const activeTool = resolveHeldItemHandTransform({
      facing: 'right',
      itemKind: 'tool',
      itemSku: 'tool_hoe',
      isMoving: false,
      timeMs: 400,
      toolSwingActive: true,
    });
    expect(activeTool.visible).toBe(true);

    const flowerUp = resolveHeldItemHandTransform({
      facing: 'up',
      itemKind: 'food',
      itemSku: 'rose_sakura',
      isMoving: false,
      timeMs: 100,
      toolSwingActive: false,
    });
    expect(flowerUp.visible).toBe(true);
    expect(flowerUp.depthDelta).toBeLessThan(0);

    const flowerRight = resolveHeldItemHandTransform({
      facing: 'right',
      itemKind: 'food',
      itemSku: 'rose_sakura',
      isMoving: true,
      timeMs: 120,
      toolSwingActive: false,
    });
    expect(flowerRight.visible).toBe(true);
    expect(flowerRight.depthDelta).toBeGreaterThan(0);
    expect(Math.abs(flowerRight.offsetX)).toBeLessThanOrEqual(5.6);
  });

  it('computes independent side-by-side bench seats on the bench seat plank and preserves sofa/bed', () => {
    const bench = { tileX: 4, tileY: 6, widthTiles: 2, heightTiles: 1 };
    const footY = (bench.tileY + bench.heightTiles) * 16;
    const leftSeat = resolveSharedPostureSeat('bench_sit', bench, 0, 16);
    const rightSeat = resolveSharedPostureSeat('bench_sit', bench, 1, 16);

    expect(leftSeat.y).toBe(footY - 4.5);
    expect(rightSeat.y).toBe(footY - 4.5);
    expect(rightSeat.x - leftSeat.x).toBe(15);
    expect(leftSeat.facing).toBe('down');
    expect(rightSeat.facing).toBe('down');
    expect(leftSeat.depth).toBeGreaterThan(footY);

    const sofa = { tileX: 5, tileY: 5, widthTiles: 2, heightTiles: 1 };
    const sofaLeft = resolveSharedPostureSeat('sofa_sit', sofa, 0, 16);
    expect(sofaLeft.y).toBe((sofa.tileY + sofa.heightTiles) * 16 - 5.5);
    expect(sofaLeft.x).toBe((sofa.tileX + 1) * 16 - 6.5);

    const bed = { tileX: 1, tileY: 3, widthTiles: 2, heightTiles: 2 };
    const bedRight = resolveSharedPostureSeat('bed_lie', bed, 1, 16);
    expect(bedRight.y).toBeCloseTo((bed.tileY + 1.38) * 16);
    expect(bedRight.x).toBe((bed.tileX + 1) * 16 + 6.4);
  });
});
