import {
  MEADOW_MAP_HEIGHT_TILES,
  MEADOW_MAP_WIDTH_TILES,
} from './worldContent/meadowGameplayAnchors';
import { isExtendedWorldDevEnabled } from './worldIntegration/extendedWorldDevFlag';
import type { MapId } from './types';

export const TILE_SIZE = 16;

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
      // Keep doorway & arrival spawn clear so nobody traps the entrance
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
      // Cottage exterior walls (leave (8, 2) as cottage front door portal)
      if (tileY === 1 && tileX >= 7 && tileX <= 9) return true;
      if (tileY === 2 && (tileX === 7 || tileX === 9)) return true;
      // Sakura tree trunks
      if (tileY === 3 && (tileX === 2 || tileX === 3 || tileX === 14 || tileX === 15)) {
        return true;
      }
      return false;
    },
    isNoPlaceZone(tileX, tileY) {
      // Keep cottage front door, porch deck, and spawn clear
      if (tileY === 2 && tileX === 8) return true;
      if (tileY === 3 && tileX >= 7 && tileX <= 9) return true;
      if (tileY === 4 && tileX === 8) return true;
      return false;
    },
  },
  meadow: {
    id: 'meadow',
    nameVi: 'Đồng cỏ mở rộng',
    tiledJsonPath: '/assets/maps/meadow.json',
    widthTiles: MEADOW_MAP_WIDTH_TILES,
    heightTiles: MEADOW_MAP_HEIGHT_TILES,
    defaultSpawn: { tileX: 8, tileY: 3 },
    portals: [
      {
        id: 'meadow-to-garden',
        labelVi: 'Về khu vườn',
        tileX: 8,
        tileY: 1,
        radiusTiles: 1.6,
        targetMapId: 'garden',
        targetSpawnX: 8,
        targetSpawnY: 11,
      },
    ],
    isStaticBlocked(tileX, tileY) {
      if (tileX < 0 || tileY < 0 || tileX >= MEADOW_MAP_WIDTH_TILES || tileY >= MEADOW_MAP_HEIGHT_TILES) {
        return true;
      }
      if (tileX === 0 || tileX === MEADOW_MAP_WIDTH_TILES - 1 || tileY === 0 || tileY === MEADOW_MAP_HEIGHT_TILES - 1) {
        return true;
      }
      if (tileX >= 9 && tileX <= 13 && tileY >= 12 && tileY <= 15) return true;
      if (tileY >= 5 && tileY <= 9 && tileX >= 14 && tileX <= 19) {
        if (tileX === 14 || tileX === 19 || tileY === 5 || tileY === 9) return true;
      }
      return false;
    },
    isNoPlaceZone(tileX, tileY) {
      if (tileY <= 2 && tileX >= 7 && tileX <= 9) return true;
      if (tileY === 3 && tileX === 8) return true;
      return false;
    },
  },
};

const GARDEN_TO_MEADOW_PORTAL: MapPortal = {
  id: 'garden-to-meadow',
  labelVi: 'Ra đồng cỏ',
  tileX: 8,
  tileY: 12,
  radiusTiles: 1.6,
  targetMapId: 'meadow',
  targetSpawnX: 8,
  targetSpawnY: 3,
};

export function getMapDefinition(mapId: MapId): MapDefinition {
  const base = MAP_DEFINITIONS[mapId];
  if (mapId === 'garden' && isExtendedWorldDevEnabled()) {
    return { ...base, portals: [...base.portals, GARDEN_TO_MEADOW_PORTAL] };
  }
  return base;
}

export function isMeadowMapUnlocked(): boolean {
  return isExtendedWorldDevEnabled();
}
