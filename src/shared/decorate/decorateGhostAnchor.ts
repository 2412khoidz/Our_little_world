import type { FurnitureCatalogItem } from '../types';

/** Screen anchor for decorate placement ghost — matches `WorldScene` furniture bottom-center. */
export interface DecorateGhostAnchor {
  centerX: number;
  footY: number;
  depth: number;
}

export function decorateGhostAnchorFromFootprint(input: {
  tileX: number;
  tileY: number;
  widthTiles: number;
  heightTiles: number;
  tilePx: number;
  layerSlot: FurnitureCatalogItem['layerSlot'];
}): DecorateGhostAnchor {
  const centerX = (input.tileX + input.widthTiles / 2) * input.tilePx;
  const footY = (input.tileY + input.heightTiles) * input.tilePx;
  const depth = input.layerSlot === 'floor' ? 2 : Math.round(footY);
  return { centerX, footY, depth };
}