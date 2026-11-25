import { describe, expect, it } from 'vitest';
import { getCatalogItem } from '../../src/shared/catalog';
import {
  canRotateFootprint,
  footprintForCatalog,
  nextRotatedFootprint,
  previewFootprintTiles,
} from '../../src/shared/decorate/decoratePlacementLoop';

describe('decoratePlacementLoop', () => {
  it('flips catalog footprint when rotated', () => {
    const sofa = getCatalogItem('sofa_cream')!;
    expect(footprintForCatalog(sofa, false)).toEqual({ widthTiles: 2, heightTiles: 1 });
    expect(footprintForCatalog(sofa, true)).toEqual({ widthTiles: 1, heightTiles: 2 });
    expect(canRotateFootprint(sofa)).toBe(true);
    expect(nextRotatedFootprint({ widthTiles: 2, heightTiles: 1 })).toEqual({
      widthTiles: 1,
      heightTiles: 2,
    });
  });

  it('builds snap footprint tiles', () => {
    const tiles = previewFootprintTiles(3, 4, { widthTiles: 2, heightTiles: 1 });
    expect(tiles).toEqual([
      { tileX: 3, tileY: 4 },
      { tileX: 4, tileY: 4 },
    ]);
  });
});