import {
  OUTDOOR_MAP_HEIGHT_TILES,
  OUTDOOR_MAP_WIDTH_TILES,
} from './worldContent/outdoorGameplayAnchors';
import { OUTDOOR_DEFAULT_SPAWN } from './world/outdoorZones';
import { isOutdoorBlocked, isOutdoorNoPlace } from './world/outdoorCollision';
import { isExtendedWorldDevEnabled } from './worldIntegration/extendedWorldDevFlag';
import { isTileBlockedFromParsed, type ParsedTiledPortal } from './world/parseTiledWorldMap';
import { getParsedTiledWorld } from './world/tiledMapRegistry';
import farmWorldJson from '../../public/assets/maps/farm.json';
import type { MapId } from './types';

export const TILE_SIZE = 16;

/** Native Tiled tile width for a zone (PyDew farm uses 64px). */
export function getMapTilePixelSize(mapId: MapId): number {
  if (mapId === 'farm') {
    const tw = (farmWorldJson as { tilewidth?: number }).tilewidth;
    return typeof tw === 'number' && tw > 0 ? tw : TILE_SIZE;
  }
  return TILE_SIZE;
}

export const MAP_IDS = ['home', 'garden', 'outdoor', 'village', 'farm', 'forest', 'beach', 'shop'] as const;

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
  home: {
    id: 'home',
    nameVi: 'Trong nhà',
    tiledJsonPath: '/assets/maps/home.json',
    widthTiles: 16,
    heightTiles: 12,
    defaultSpawn: { tileX: 8, tileY: 9 },
    portals: [
      {
        id: 'door-to-garden',
        labelVi: 'Ra khu vườn',
        tileX: 7,
        tileY: 11,
        radiusTiles: 1.6,
        targetMapId: 'garden',
        targetSpawnX: 8,
        targetSpawnY: 4,
      },
    ],
    isStaticBlocked(tileX, tileY) {
      if (tileX < 0 || tileY < 0 || tileX >= 16 || tileY >= 12) return true;
      if (tileY <= 2) return true;
      if (tileX === 0 || tileX === 15) return true;
      if (tileY === 11 && tileX !== 7 && tileX !== 8) return true;
      return false;
    },
    isNoPlaceZone(tileX, tileY) {
      if (tileY >= 10 && (tileX === 7 || tileX === 8)) return true;
      if (tileY === 9 && (tileX === 7 || tileX === 8)) return true;
      return false;
    },
  },
  garden: {
    id: 'garden',
    nameVi: 'Ngoài vườn',
    tiledJsonPath: '/assets/maps/garden.json',
    widthTiles: 18,
    heightTiles: 14,
    defaultSpawn: { tileX: 8, tileY: 4 },
    portals: [
      {
        id: 'cottage-to-home',
        labelVi: 'Vào trong nhà',
        tileX: 8,
        tileY: 2,
        radiusTiles: 1.7,
        targetMapId: 'home',
        targetSpawnX: 8,
        targetSpawnY: 9,
      },
    ],
    isStaticBlocked(tileX, tileY) {
      if (tileX < 0 || tileY < 0 || tileX >= 18 || tileY >= 14) return true;
      if (tileX === 0 || tileX === 17 || tileY === 0 || tileY === 13) return true;
      if (tileY === 1 && tileX >= 7 && tileX <= 9) return true;
      if (tileY === 2 && (tileX === 7 || tileX === 9)) return true;
      if (tileY === 3 && (tileX === 2 || tileX === 3 || tileX === 14 || tileX === 15)) {
        return true;
      }
      return false;
    },
    isNoPlaceZone(tileX, tileY) {
      if (tileY === 2 && tileX === 8) return true;
      if (tileY === 3 && tileX >= 7 && tileX <= 9) return true;
      if (tileY === 4 && tileX === 8) return true;
      return false;
    },
  },
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
      )?.value ?? 24,
    tileY:
      (farmWorldJson as { properties?: { name: string; value: number }[] }).properties?.find(
        (p) => p.name === 'olwDefaultSpawnTileY',
      )?.value ?? 27,
  }),
  forest: buildTiledZoneDefinition('forest', 'Khu rừng', '/assets/maps/forest.json', { tileX: 8, tileY: 26 }),
  beach: buildTiledZoneDefinition('beach', 'Bãi biển', '/assets/maps/beach.json', { tileX: 1, tileY: 16 }),
  shop: buildTiledZoneDefinition('shop', 'Cửa hàng Bác Hai', '/assets/maps/shop.json', { tileX: 12, tileY: 14 }),
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
  id: 'village' | 'farm' | 'forest' | 'beach' | 'shop',
  nameVi: string,
  tiledJsonPath: string,
  defaultSpawn: { tileX: number; tileY: number },
): MapDefinition {
  const parsed = getParsedTiledWorld(id);
  if (!parsed) {
    throw new Error(`Missing parsed Tiled map for ${id}`);
  }
  return {
    id,
    nameVi,
    tiledJsonPath,
    widthTiles: parsed.widthTiles,
    heightTiles: parsed.heightTiles,
    defaultSpawn,
    portals: parsed.portals,
    isStaticBlocked(tileX, tileY) {
      return isTileBlockedFromParsed(parsed, tileX, tileY);
    },
    isNoPlaceZone(tileX, tileY) {
      if (portalBlocksDecorate(parsed.portals, tileX, tileY)) return true;
      return isTileBlockedFromParsed(parsed, tileX, tileY);
    },
  };
}

const GARDEN_TO_VILLAGE_PORTAL: MapPortal = {
  id: 'garden-to-village',
  labelVi: 'Vào làng',
  tileX: 9,
  tileY: 13,
  radiusTiles: 1.6,
  targetMapId: 'village',
  targetSpawnX: 42,
  targetSpawnY: 31,
};

export function getMapDefinition(mapId: MapId): MapDefinition {
  const base = MAP_DEFINITIONS[mapId];
  if (mapId === 'garden' && isExtendedWorldDevEnabled()) {
    return { ...base, portals: [...base.portals, GARDEN_TO_VILLAGE_PORTAL] };
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