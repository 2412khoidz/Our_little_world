import {
  OUTDOOR_MAP_HEIGHT_TILES,
  OUTDOOR_MAP_WIDTH_TILES,
} from './worldContent/outdoorGameplayAnchors';
import { OUTDOOR_DEFAULT_SPAWN } from './world/outdoorZones';
import { isOutdoorBlocked, isOutdoorNoPlace } from './world/outdoorCollision';
import { isExtendedWorldDevEnabled } from './worldIntegration/extendedWorldDevFlag';
import { isTileBlockedFromParsed, type ParsedTiledPortal } from './world/parseTiledWorldMap';
import { getParsedTiledWorld } from './world/tiledMapRegistry';
import { getStaticZonePropBlockedTiles } from './world/zonePropColliders';
import farmWorldJson from '../assets/maps/farm.json';
import type { MapId } from './types';

export const TILE_SIZE = 16;

/** Native Tiled tile width for a zone (all zones unified on 16×16 pixel density). */
export function getMapTilePixelSize(mapId: MapId): number {
  if (mapId === 'farm') {
    const tw = (farmWorldJson as { tilewidth?: number }).tilewidth;
    return typeof tw === 'number' && tw > 0 ? tw : TILE_SIZE;
  }
  return TILE_SIZE;
}

export const MAP_IDS = [
  'home',
  'garden',
  'outdoor',
  'village',
  'farm',
  'forest',
  'beach',
  'shop',
  'shop_seed',
  'shop_tool',
  'shop_crop_market',
  'shop_town_hall',
] as const;

export interface MapPortal {
  id: string;
  labelVi: string;
  tileX: number;
  tileY: number;
  radiusTiles: number;
  targetMapId: MapId;
  targetSpawnX: number;
  targetSpawnY: number;
}

export interface MapDefinition {
  id: MapId;
  nameVi: string;
  tiledJsonPath: string;
  widthTiles: number;
  heightTiles: number;
  defaultSpawn: { tileX: number; tileY: number };
  portals: readonly MapPortal[];
  isStaticBlocked: (tileX: number, tileY: number) => boolean;
  isNoPlaceZone: (tileX: number, tileY: number) => boolean;
}

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  home: buildTiledZoneDefinition('home', 'Trong nhà', '/assets/maps/home.json', { tileX: 8, tileY: 9 }),
  garden: buildTiledZoneDefinition('garden', 'Ngoài vườn', '/assets/maps/garden.json', { tileX: 8, tileY: 4 }),
  outdoor: {
    id: 'outdoor',
    nameVi: 'Thế giới mở rộng',
    tiledJsonPath: '/assets/maps/meadow.json',
    widthTiles: OUTDOOR_MAP_WIDTH_TILES,
    heightTiles: OUTDOOR_MAP_HEIGHT_TILES,
    defaultSpawn: OUTDOOR_DEFAULT_SPAWN,
    portals: [
      {
        id: 'outdoor-to-garden',
        labelVi: 'Về khu vườn',
        tileX: 16,
        tileY: 20,
        radiusTiles: 1.6,
        targetMapId: 'garden',
        targetSpawnX: 9,
        targetSpawnY: 12,
      },
    ],
    isStaticBlocked(tileX, tileY) {
      return isOutdoorBlocked(tileX, tileY);
    },
    isNoPlaceZone(tileX, tileY) {
      return isOutdoorNoPlace(tileX, tileY);
    },
  },
  village: buildTiledZoneDefinition(
    'village',
    'Làng',
    '/assets/maps/village.json',
    { tileX: 42, tileY: 31 },
  ),
  farm: buildTiledZoneDefinition('farm', 'Đồng ruộng', '/assets/maps/farm.json', {
    tileX:
      (farmWorldJson as { properties?: { name: string; value: number }[] }).properties?.find(
        (p) => p.name === 'olwDefaultSpawnTileX',
      )?.value ?? 29,
    tileY:
      (farmWorldJson as { properties?: { name: string; value: number }[] }).properties?.find(
        (p) => p.name === 'olwDefaultSpawnTileY',
      )?.value ?? 22,
  }),
  forest: buildTiledZoneDefinition('forest', 'Khu rừng', '/assets/maps/forest.json', { tileX: 14, tileY: 32 }),
  beach: buildTiledZoneDefinition('beach', 'Bãi biển', '/assets/maps/beach.json', { tileX: 3, tileY: 16 }),
  shop: buildTiledZoneDefinition('shop', 'Cửa hàng Bác Hai', '/assets/maps/shop.json', { tileX: 12, tileY: 14 }),
  shop_seed: buildTiledZoneDefinition(
    'shop_seed',
    'Cửa hàng hạt',
    '/assets/maps/shop_seed.json',
    { tileX: 12, tileY: 14 },
  ),
  shop_tool: buildTiledZoneDefinition(
    'shop_tool',
    'Cửa hàng dụng cụ',
    '/assets/maps/shop_tool.json',
    { tileX: 11, tileY: 13 },
  ),
  shop_crop_market: buildTiledZoneDefinition(
    'shop_crop_market',
    'Chợ nông sản',
    '/assets/maps/shop_crop_market.json',
    { tileX: 11, tileY: 14 },
  ),
  shop_town_hall: buildTiledZoneDefinition(
    'shop_town_hall',
    'Tòa thị chính',
    '/assets/maps/shop_town_hall.json',
    { tileX: 11, tileY: 13 },
  ),
};

function portalBlocksDecorate(portals: readonly ParsedTiledPortal[], tileX: number, tileY: number): boolean {
  for (const portal of portals) {
    const dx = Math.abs(tileX - portal.tileX);
    const dy = Math.abs(tileY - portal.tileY);
    if (dx <= 1 && dy <= 1) return true;
  }
  return false;
}

function buildTiledZoneDefinition(
  id:
    | 'home'
    | 'garden'
    | 'village'
    | 'farm'
    | 'forest'
    | 'beach'
    | 'shop'
    | 'shop_seed'
    | 'shop_tool'
    | 'shop_crop_market'
    | 'shop_town_hall',
  nameVi: string,
  tiledJsonPath: string,
  defaultSpawn: { tileX: number; tileY: number },
): MapDefinition {
  const parsed = getParsedTiledWorld(id);
  if (!parsed) {
    throw new Error(`Missing parsed Tiled map for ${id}`);
  }
  const propBlocked = getStaticZonePropBlockedTiles(id);
  return {
    id,
    nameVi,
    tiledJsonPath,
    widthTiles: parsed.widthTiles,
    heightTiles: parsed.heightTiles,
    defaultSpawn,
    portals: parsed.portals,
    isStaticBlocked(tileX, tileY) {
      if (isTileBlockedFromParsed(parsed, tileX, tileY)) return true;
      return propBlocked.has(`${tileX},${tileY}`);
    },
    isNoPlaceZone(tileX, tileY) {
      if (portalBlocksDecorate(parsed.portals, tileX, tileY)) return true;
      if (propBlocked.has(`${tileX},${tileY}`)) return true;
      return isTileBlockedFromParsed(parsed, tileX, tileY);
    },
  };
}

const GARDEN_TO_VILLAGE_PORTAL: MapPortal = {
  id: 'garden-to-village',
  labelVi: 'Vào làng',
  tileX: 8,
  tileY: 13,
  radiusTiles: 1.6,
  targetMapId: 'village',
  targetSpawnX: 7,
  targetSpawnY: 13,
};

const GARDEN_TO_FARM_PORTAL: MapPortal = {
  id: 'garden-to-farm',
  labelVi: 'Ra nông trại',
  tileX: 0,
  tileY: 7,
  radiusTiles: 1.6,
  targetMapId: 'farm',
  targetSpawnX: 60,
  targetSpawnY: 22,
};

export function getMapDefinition(mapId: MapId): MapDefinition {
  const base = MAP_DEFINITIONS[mapId];
  if (mapId === 'garden' && isExtendedWorldDevEnabled()) {
    const existingIds = new Set(base.portals.map((p) => p.id));
    const extras = [GARDEN_TO_VILLAGE_PORTAL, GARDEN_TO_FARM_PORTAL].filter((p) => !existingIds.has(p.id));
    return extras.length > 0 ? { ...base, portals: [...base.portals, ...extras] } : base;
  }
  return base;
}

export function isOutdoorMapUnlocked(): boolean {
  return isExtendedWorldDevEnabled();
}

/** @deprecated Use isOutdoorMapUnlocked */
export function isMeadowMapUnlocked(): boolean {
  return isOutdoorMapUnlocked();
}