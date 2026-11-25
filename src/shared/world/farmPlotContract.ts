import type { MapId } from '../types';

/**
 * Composer 1 — world anchors only (no farming simulation).
 * Keep object tile positions in sync with `scripts/generate-world-zone-maps.mjs` Interactables layer.
 * Bump `FARM_PLOT_CONTRACT_VERSION` + regenerate `farmPlotContract.v1.json` when anchors change.
 */
export const FARM_PLOT_CONTRACT_VERSION = '1.0.1';

export const FARM_ZONE_MAP_ID: MapId = 'farm';

/** Tiled tile layer ids on `public/assets/maps/farm.json` (match generator). */
export const FARM_TILED_LAYER_IDS = {
  ground: 1,
  paths: 2,
  water: 3,
  buildings: 4,
  vegetation: 5,
  collision: 6,
} as const;

export const FARM_TILED_OBJECT_LAYER_IDS = {
  portals: 10,
  interactables: 11,
} as const;

/** Gids on `tileset-cozy` row 3 — must match `scripts/generate-starter-assets.mjs`. */
export const FARM_TILE_GIDS = {
  soilDry: 53,
  soilWet: 54,
  waterDeep: 51,
  shoreGrass: 52,
} as const;

export interface FarmPlotRegion {
  readonly id: 'farm_main' | 'farm_annex';
  readonly labelVi: string;
  readonly originTileX: number;
  readonly originTileY: number;
  readonly columns: number;
  readonly rows: number;
}

/**
 * Walkable soil rectangles on the farm map (Ground layer gids 53/54).
 * `plotAnchorId` = `${regionId}_${localIndex}` row-major within the region.
 */
export const FARM_PLOT_REGIONS: readonly FarmPlotRegion[] = [
  {
    id: 'farm_main',
    labelVi: 'Ruộng chính',
    originTileX: 16,
    originTileY: 10,
    columns: 12,
    rows: 10,
  },
  {
    id: 'farm_annex',
    labelVi: 'Ruộng phụ',
    originTileX: 40,
    originTileY: 28,
    columns: 8,
    rows: 8,
  },
] as const;

export const FARM_PLOT_MIN_WALKABLE_TILES = 160;

export type FarmPlotAnchorId = `${FarmPlotRegion['id']}_${number}`;

export function farmPlotAnchorId(regionId: FarmPlotRegion['id'], localIndex: number): FarmPlotAnchorId {
  return `${regionId}_${localIndex}`;
}

export function farmPlotTileFromAnchor(
  region: FarmPlotRegion,
  localIndex: number,
): { tileX: number; tileY: number } | null {
  if (localIndex < 0 || localIndex >= region.columns * region.rows) return null;
  const col = localIndex % region.columns;
  const row = Math.floor(localIndex / region.columns);
  return { tileX: region.originTileX + col, tileY: region.originTileY + row };
}

export function enumerateFarmPlotAnchors(): ReadonlyArray<{
  anchorId: FarmPlotAnchorId;
  regionId: FarmPlotRegion['id'];
  tileX: number;
  tileY: number;
}> {
  const out: Array<{ anchorId: FarmPlotAnchorId; regionId: FarmPlotRegion['id']; tileX: number; tileY: number }> =
    [];
  for (const region of FARM_PLOT_REGIONS) {
    const count = region.columns * region.rows;
    for (let i = 0; i < count; i += 1) {
      const tile = farmPlotTileFromAnchor(region, i)!;
      out.push({
        anchorId: farmPlotAnchorId(region.id, i),
        regionId: region.id,
        tileX: tile.tileX,
        tileY: tile.tileY,
      });
    }
  }
  return out;
}

export function isFarmSoilTile(tileX: number, tileY: number): boolean {
  for (const region of FARM_PLOT_REGIONS) {
    const dx = tileX - region.originTileX;
    const dy = tileY - region.originTileY;
    if (dx >= 0 && dx < region.columns && dy >= 0 && dy < region.rows) {
      return true;
    }
  }
  return false;
}

/** World interactables (HUD / simulation hooks). Tile coords = object origin in Tiled. */
export const FARM_WORLD_INTERACTABLES = {
  shipping_bin: {
    id: 'farm_shipping_bin',
    anchorId: 'farm_shipping_bin',
    kind: 'shipping_bin' as const,
    tileX: 7,
    tileY: 7,
    labelVi: 'Thùng gom hàng — bán qua đêm (V0.2)',
  },
  pond_water: {
    id: 'farm_pond_water',
    anchorId: 'farm_pond_water',
    kind: 'water_source' as const,
    tileX: 52,
    tileY: 11,
    labelVi: 'Ao nước — múc nước tưới',
  },
  barn_mill: {
    id: 'farm_barn_mill',
    anchorId: 'farm_barn_mill',
    kind: 'workshop_building' as const,
    tileX: 9,
    tileY: 9,
    labelVi: 'Xưởng ruộng — cối Meadowbrook',
  },
  barn_door: {
    id: 'farm_barn_door',
    anchorId: 'farm_barn_door',
    kind: 'door' as const,
    tileX: 10,
    tileY: 9,
    labelVi: 'Vào cửa hàng Bác Hai',
  },
} as const;

/** Village seed shop entry (Cabacos donor `village-to-shop-seed` → `shop_seed` interior). */
export const VILLAGE_SHOP_PORTAL = {
  portalObjectId: 'village-to-shop-seed',
  mapId: 'village' as MapId,
  targetMapId: 'shop_seed' as MapId,
  doorTileX: 32,
  doorTileY: 23,
  labelVi: 'Vào cửa hàng hạt',
} as const;

export interface FarmPlotContractExport {
  contractVersion: string;
  mapId: MapId;
  mapSizeTiles: { width: number; height: number };
  defaultSpawnTile: { tileX: number; tileY: number };
  tiledJsonPath: string;
  tileGids: typeof FARM_TILE_GIDS;
  tileLayerIds: typeof FARM_TILED_LAYER_IDS;
  objectLayerIds: typeof FARM_TILED_OBJECT_LAYER_IDS;
  plotRegions: typeof FARM_PLOT_REGIONS;
  plotMinWalkableTiles: number;
  plotAnchors: ReturnType<typeof enumerateFarmPlotAnchors>;
  worldInteractables: typeof FARM_WORLD_INTERACTABLES;
  villageShopPortal: typeof VILLAGE_SHOP_PORTAL;
}

/** Machine-readable export for Composer 1 (mirrors `farmPlotContract.v1.json`). */
export function buildFarmPlotContractExport(): FarmPlotContractExport {
  return {
    contractVersion: FARM_PLOT_CONTRACT_VERSION,
    mapId: FARM_ZONE_MAP_ID,
    mapSizeTiles: { width: 64, height: 56 },
    defaultSpawnTile: { tileX: 55, tileY: 20 },
    tiledJsonPath: '/assets/maps/farm.json',
    tileGids: FARM_TILE_GIDS,
    tileLayerIds: FARM_TILED_LAYER_IDS,
    objectLayerIds: FARM_TILED_OBJECT_LAYER_IDS,
    plotRegions: FARM_PLOT_REGIONS,
    plotMinWalkableTiles: FARM_PLOT_MIN_WALKABLE_TILES,
    plotAnchors: [...enumerateFarmPlotAnchors()],
    worldInteractables: FARM_WORLD_INTERACTABLES,
    villageShopPortal: VILLAGE_SHOP_PORTAL,
  };
}