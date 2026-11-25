import { describe, expect, it } from 'vitest';
import { decorateGhostAnchorFromFootprint } from '../../src/shared/decorate/decorateGhostAnchor';

describe('decorateGhostAnchor', () => {
  it('anchors bottom-center of multi-tile footprint', () => {
    const anchor = decorateGhostAnchorFromFootprint({
      tileX: 2,
      tileY: 3,
      widthTiles: 2,
      heightTiles: 1,
      tilePx: 16,
      layerSlot: 'object',
    });
    expect(anchor.centerX).toBe(48);
    expect(anchor.footY).toBe(64);
    expect(anchor.depth).toBe(64);
  });

  it('uses floor layer depth for rugs', () => {
    const anchor = decorateGhostAnchorFromFootprint({
      tileX: 0,
      tileY: 0,
      widthTiles: 2,
      heightTiles: 2,
      tilePx: 16,
      layerSlot: 'floor',
    });
    expect(anchor.depth).toBe(2);
  });
});