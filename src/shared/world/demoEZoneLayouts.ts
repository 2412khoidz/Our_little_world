/**
 * Semantic prop placements for extended world zones when `VITE_OLW_PRIVATE_ART=1`.
 * Collision/portals remain Tiled JSON — đây là lớp hiển thị Demo E (world-props manifest ids).
 */
import type { MapId } from '../types';

export type DemoEPropPlacement = {
  /** Key in props-manifest / worldExtendedArtIds.props */
  propId: string;
  tileX: number;
  tileY: number;
  originX?: number;
  originY?: number;
};

export type DemoEZoneLayout = {
  mapId: MapId;
  /** Optional ground stamp (meadow tile) — skipped when absent from atlas */
  groundTileId?: string;
  props: readonly DemoEPropPlacement[];
};

/** Village — oval plaza, pond west, market east; Stardew-like density (footprint 48×40 unchanged). */
export const VILLAGE_DEMO_E_LAYOUT: DemoEZoneLayout = {
  mapId: 'village',
  groundTileId: 'env.meadow_tile',
  props: [
    { propId: 'prop.side_cottage', tileX: 14, tileY: 7 },
    { propId: 'prop.side_cottage', tileX: 28, tileY: 7 },
    { propId: 'prop.side_cottage', tileX: 6, tileY: 17 },
    { propId: 'prop.oak_tree', tileX: 9, tileY: 15 },
    { propId: 'prop.sakura_bush', tileX: 11, tileY: 28 },
    { propId: 'prop.planter_box', tileX: 13, tileY: 15 },
    { propId: 'prop.planter_box', tileX: 34, tileY: 15 },
    { propId: 'prop.planter_box', tileX: 13, tileY: 25 },
    { propId: 'prop.planter_box', tileX: 34, tileY: 25 },
    { propId: 'prop.picnic_blanket', tileX: 23, tileY: 19 },
    { propId: 'prop.picnic_basket', tileX: 24, tileY: 18 },
    { propId: 'prop.picnic_tart', tileX: 25, tileY: 19 },
    { propId: 'prop.fence_1w', tileX: 21, tileY: 17 },
    { propId: 'prop.fence_1w', tileX: 27, tileY: 17 },
    { propId: 'prop.fence_1w', tileX: 21, tileY: 23 },
    { propId: 'prop.fence_1w', tileX: 27, tileY: 23 },
    { propId: 'prop.fence_3w', tileX: 23, tileY: 13 },
    { propId: 'prop.sunflower', tileX: 18, tileY: 20 },
    { propId: 'prop.sunflower', tileX: 30, tileY: 20 },
    { propId: 'prop.mailbox_red', tileX: 5, tileY: 20 },
    { propId: 'prop.bridge_wood', tileX: 10, tileY: 31, originX: 0, originY: 1 },
    { propId: 'prop.water_lily', tileX: 9, tileY: 33 },
    { propId: 'prop.water_reed_a', tileX: 11, tileY: 34 },
    { propId: 'prop.beehive', tileX: 38, tileY: 12 },
    { propId: 'prop.side_cottage', tileX: 36, tileY: 11 },
    { propId: 'prop.oak_tree', tileX: 10, tileY: 16 },
    { propId: 'prop.oak_tree', tileX: 38, tileY: 24 },
    { propId: 'prop.sakura_bush', tileX: 16, tileY: 27 },
    { propId: 'prop.sakura_bush', tileX: 32, tileY: 27 },
  ],
};

export const FARM_DEMO_E_LAYOUT: DemoEZoneLayout = {
  mapId: 'farm',
  groundTileId: 'env.meadow_tile',
  props: [
    { propId: 'prop.fence_3w', tileX: 14, tileY: 8 },
    { propId: 'prop.sunflower', tileX: 17, tileY: 8 },
    { propId: 'prop.tomato', tileX: 19, tileY: 7 },
    { propId: 'prop.corn', tileX: 21, tileY: 7 },
    { propId: 'prop.planter_box', tileX: 7, tileY: 6 },
    { propId: 'prop.beehive', tileX: 6, tileY: 5 },
    { propId: 'prop.bridge_wood', tileX: 51, tileY: 10, originX: 0, originY: 1 },
    { propId: 'prop.water_reed_a', tileX: 50, tileY: 11 },
    { propId: 'prop.radish', tileX: 41, tileY: 27 },
    { propId: 'prop.beetroot', tileX: 45, tileY: 27 },
    { propId: 'prop.picnic_blanket', tileX: 31, tileY: 17 },
    { propId: 'prop.oak_tree', tileX: 56, tileY: 14 },
  ],
};

export const FOREST_DEMO_E_LAYOUT: DemoEZoneLayout = {
  mapId: 'forest',
  props: [
    { propId: 'prop.oak_tree', tileX: 12, tileY: 10 },
    { propId: 'prop.peach_tree', tileX: 22, tileY: 8 },
    { propId: 'prop.sakura_bush', tileX: 34, tileY: 11 },
    { propId: 'prop.picnic_blanket', tileX: 35, tileY: 33 },
    { propId: 'prop.picnic_basket', tileX: 36, tileY: 32 },
    { propId: 'prop.bridge_wood', tileX: 33, tileY: 35, originX: 0, originY: 1 },
    { propId: 'prop.water_lily', tileX: 35, tileY: 33 },
  ],
};

export const BEACH_DEMO_E_LAYOUT: DemoEZoneLayout = {
  mapId: 'beach',
  props: [
    { propId: 'prop.shore_s', tileX: 28, tileY: 26 },
    { propId: 'prop.bridge_wood', tileX: 22, tileY: 26, originX: 0, originY: 1 },
    { propId: 'prop.picnic_blanket', tileX: 23, tileY: 6 },
    { propId: 'prop.picnic_basket', tileX: 24, tileY: 5 },
    { propId: 'prop.side_cottage', tileX: 42, tileY: 11 },
    { propId: 'prop.sakura_bush', tileX: 13, tileY: 19 },
    { propId: 'prop.oak_tree', tileX: 14, tileY: 3 },
    { propId: 'prop.oak_tree', tileX: 36, tileY: 4 },
  ],
};

export const SHOP_DEMO_E_LAYOUT: DemoEZoneLayout = {
  mapId: 'shop',
  props: [
    { propId: 'prop.kitchen_counter_fruit', tileX: 7, tileY: 5 },
    { propId: 'prop.bookshelf_wide', tileX: 2, tileY: 4 },
    { propId: 'prop.rug_coral', tileX: 5, tileY: 6 },
    { propId: 'prop.dining_chair_left', tileX: 4, tileY: 5 },
    { propId: 'prop.dining_chair_right', tileX: 8, tileY: 5 },
    { propId: 'prop.planter_box', tileX: 9, tileY: 6 },
  ],
};

const LAYOUTS: Partial<Record<MapId, DemoEZoneLayout>> = {
  village: VILLAGE_DEMO_E_LAYOUT,
  farm: FARM_DEMO_E_LAYOUT,
  forest: FOREST_DEMO_E_LAYOUT,
  beach: BEACH_DEMO_E_LAYOUT,
  shop: SHOP_DEMO_E_LAYOUT,
};

export function getDemoEZoneLayout(mapId: MapId): DemoEZoneLayout | null {
  return LAYOUTS[mapId] ?? null;
}