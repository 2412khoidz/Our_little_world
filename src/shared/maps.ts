import type { MapId } from './types';
import { getParsedTiledWorld } from './world/tiledMapRegistry';
import { isTileBlockedFromParsed, type ParsedTiledPortal } from './world/parseTiledWorldMap';

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
  farm: buildFarmZoneDefinition(),
};

function portalBlocksDecorate(portals: readonly ParsedTiledPortal[], tileX: number, tileY: number): boolean {
  for (const portal of portals) {
    const dx = Math.abs(tileX - portal.tileX);
    const dy = Math.abs(tileY - portal.tileY);
    if (dx <= 1 && dy <= 1) return true;
  }
  return false;
}

function buildFarmZoneDefinition(): MapDefinition {
  const parsed = getParsedTiledWorld('farm');
  if (!parsed) {
    throw new Error('Missing parsed Tiled map for farm');
  }
  const fallbackHomePortal: MapPortal = {
    id: 'farm-to-home',
    labelVi: 'Về nhà',
    tileX: 55,
    tileY: 20,
    radiusTiles: 2.25,
    targetMapId: 'home',
    targetSpawnX: 8,
    targetSpawnY: 9,
  };
  return {
    id: 'farm',
    nameVi: 'Đồng ruộng',
    tiledJsonPath: '/assets/maps/farm.json',
    widthTiles: parsed.widthTiles,
    heightTiles: parsed.heightTiles,
    defaultSpawn: { tileX: 55, tileY: 20 },
    portals: parsed.portals.length > 0 ? parsed.portals : [fallbackHomePortal],
    isStaticBlocked(tileX, tileY) {
      return isTileBlockedFromParsed(parsed, tileX, tileY);
    },
    isNoPlaceZone(tileX, tileY) {
      if (portalBlocksDecorate(parsed.portals, tileX, tileY)) return true;
      return isTileBlockedFromParsed(parsed, tileX, tileY);
    },
  };
}

export function getMapDefinition(mapId: MapId): MapDefinition {
  return MAP_DEFINITIONS[mapId];
}
