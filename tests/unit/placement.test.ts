import { describe, expect, it } from 'vitest';
import { buildDefaultStarterPlacements } from '../../src/shared/catalog';
import {
  buildMovementCollisionGrid,
  findPlacementAtTile,
  getFootprintTiles,
  getRemainingStockForSku,
  validatePlacement,
} from '../../src/shared/placement';
import type { FurniturePlacement } from '../../src/shared/types';

function makePlacement(overrides: Partial<FurniturePlacement>): FurniturePlacement {
  return {
    id: 'p-1',
    worldId: 'w-1',
    mapId: 'home',
    sku: 'plant_monstera',
    layerSlot: 'object',
    tileX: 6,
    tileY: 4,
    widthTiles: 1,
    heightTiles: 1,
    updatedBy: 'user-a',
    updatedAt: '2026-11-24T00:00:00Z',
    ...overrides,
  };
}

describe('placement validation & collision grid', () => {
  it('computes exact multi-tile footprints', () => {
    expect(getFootprintTiles(2, 3, 2, 2)).toEqual([
      { tileX: 2, tileY: 3 },
      { tileX: 3, tileY: 3 },
      { tileX: 2, tileY: 4 },
      { tileX: 3, tileY: 4 },
    ]);
  });

  it('validates all default starter placements cleanly without conflict', () => {
    const defaults = buildDefaultStarterPlacements('w-1', 'user-a', '2026-11-24T00:00:00Z');
    for (const item of defaults) {
      const result = validatePlacement({
        mapId: item.mapId,
        sku: item.sku,
        tileX: item.tileX,
        tileY: item.tileY,
        placements: defaults,
        ignorePlacementId: item.id,
      });
      expect(result.ok).toBe(true);
    }
  });

  it('allows placing object-layer furniture on top of floor-layer rug', () => {
    const rug = makePlacement({
      id: 'rug-1',
      sku: 'rug_peach',
      layerSlot: 'floor',
      tileX: 5,
      tileY: 6,
      widthTiles: 2,
      heightTiles: 2,
    });

    const res = validatePlacement({
      mapId: 'home',
      sku: 'table_wood',
      tileX: 5,
      tileY: 6,
      placements: [rug],
    });
    expect(res.ok).toBe(true);
  });

  it('rejects overlapping object-layer furniture on partial footprint collision', () => {
    const table = makePlacement({
      id: 'table-1',
      sku: 'table_wood',
      layerSlot: 'object',
      tileX: 6,
      tileY: 6,
      widthTiles: 2,
      heightTiles: 1,
    });

    // Plant at (7, 6) overlaps right half of 2x1 table at (6..7, 6)
    const res = validatePlacement({
      mapId: 'home',
      sku: 'plant_monstera',
      tileX: 7,
      tileY: 6,
      placements: [table],
    });
    expect(res).toEqual({
      ok: false,
      code: 'TILE_OCCUPIED',
      message: expect.any(String),
    });
  });

  it('blocks placement in doorway no-place zone and on static walls', () => {
    const wallAttempt = validatePlacement({
      mapId: 'home',
      sku: 'plant_monstera',
      tileX: 5,
      tileY: 1,
      placements: [],
    });
    expect(wallAttempt.ok).toBe(false);
    if (!wallAttempt.ok) expect(wallAttempt.code).toBe('BLOCKED_TILE');

    const doorwayAttempt = validatePlacement({
      mapId: 'home',
      sku: 'plant_monstera',
      tileX: 7,
      tileY: 10,
      placements: [],
    });
    expect(doorwayAttempt.ok).toBe(false);
    if (!doorwayAttempt.ok) expect(doorwayAttempt.code).toBe('NO_PLACE_ZONE');
  });

  it('enforces wrong-map restriction and starter stock cap', () => {
    const wrongMap = validatePlacement({
      mapId: 'home',
      sku: 'bench_garden',
      tileX: 6,
      tileY: 6,
      placements: [],
    });
    expect(wrongMap.ok).toBe(false);
    if (!wrongMap.ok) expect(wrongMap.code).toBe('WRONG_MAP');

    const existingBed = makePlacement({
      id: 'bed-1',
      sku: 'bed_cozy',
      tileX: 1,
      tileY: 3,
      widthTiles: 2,
      heightTiles: 2,
    });
    const overStock = validatePlacement({
      mapId: 'home',
      sku: 'bed_cozy',
      tileX: 10,
      tileY: 7,
      placements: [existingBed],
    });
    expect(overStock.ok).toBe(false);
    if (!overStock.ok) expect(overStock.code).toBe('STOCK_EXCEEDED');
    expect(getRemainingStockForSku([existingBed], 'bed_cozy')).toBe(0);
  });

  it('allows moving an item to an adjacent overlapping tile when ignorePlacementId is passed', () => {
    const table = makePlacement({
      id: 'table-1',
      sku: 'table_wood',
      tileX: 6,
      tileY: 6,
      widthTiles: 2,
      heightTiles: 1,
    });
    const moveRes = validatePlacement({
      mapId: 'home',
      sku: 'table_wood',
      tileX: 7,
      tileY: 6,
      placements: [table],
      ignorePlacementId: 'table-1',
    });
    expect(moveRes.ok).toBe(true);
  });

  it('builds movement collision grid including blocking furniture but excluding floor rugs', () => {
    const placements = [
      makePlacement({
        id: 'rug-1',
        sku: 'rug_peach',
        layerSlot: 'floor',
        tileX: 5,
        tileY: 6,
        widthTiles: 2,
        heightTiles: 2,
      }),
      makePlacement({
        id: 'plant-1',
        sku: 'plant_monstera',
        layerSlot: 'object',
        tileX: 10,
        tileY: 6,
        widthTiles: 1,
        heightTiles: 1,
      }),
    ];
    const grid = buildMovementCollisionGrid('home', placements);
    expect(grid.has('5,6')).toBe(false); // floor rug does not block walking
    expect(grid.has('10,6')).toBe(true); // potted plant blocks walking
    expect(grid.has('0,5')).toBe(true); // wall blocks walking
    expect(grid.has('7,11')).toBe(false); // open doorway does not block walking
  });

  it('prioritizes object-layer furniture over floor rug when picking at tile', () => {
    const rug = makePlacement({
      id: 'rug-1',
      sku: 'rug_peach',
      layerSlot: 'floor',
      tileX: 5,
      tileY: 5,
      widthTiles: 2,
      heightTiles: 2,
    });
    const sofa = makePlacement({
      id: 'sofa-1',
      sku: 'sofa_cream',
      layerSlot: 'object',
      tileX: 5,
      tileY: 5,
      widthTiles: 2,
      heightTiles: 1,
    });
    expect(findPlacementAtTile('home', 5, 5, [rug, sofa])?.id).toBe('sofa-1');
    expect(findPlacementAtTile('home', 5, 6, [rug, sofa])?.id).toBe('rug-1');
  });
});
