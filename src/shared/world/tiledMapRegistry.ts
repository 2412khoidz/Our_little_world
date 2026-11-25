import type { MapId } from '../types';
import beachJson from '../../../public/assets/maps/beach.json';
import farmJson from '../../../public/assets/maps/farm.json';
import forestJson from '../../../public/assets/maps/forest.json';
import shopJson from '../../../public/assets/maps/shop.json';
import villageJson from '../../../public/assets/maps/village.json';
import { parseTiledWorldMap, type ParsedTiledWorldMap, type TiledWorldMapJson } from './parseTiledWorldMap';

export const PARSED_TILED_WORLDS: Partial<Record<MapId, ParsedTiledWorldMap>> = {
  village: parseTiledWorldMap(villageJson as TiledWorldMapJson),
  farm: parseTiledWorldMap(farmJson as TiledWorldMapJson),
  forest: parseTiledWorldMap(forestJson as TiledWorldMapJson),
  beach: parseTiledWorldMap(beachJson as TiledWorldMapJson),
  shop: parseTiledWorldMap(shopJson as TiledWorldMapJson),
};

export function getParsedTiledWorld(mapId: MapId): ParsedTiledWorldMap | null {
  return PARSED_TILED_WORLDS[mapId] ?? null;
}

export const TILED_WORLD_MAP_IDS = ['village', 'farm', 'forest', 'beach', 'shop'] as const satisfies readonly MapId[];
export type TiledWorldMapId = (typeof TILED_WORLD_MAP_IDS)[number];

export function isTiledWorldMapId(mapId: MapId): mapId is TiledWorldMapId {
  return (TILED_WORLD_MAP_IDS as readonly string[]).includes(mapId);
}

export const TILED_MAP_PHASER_KEYS: Record<TiledWorldMapId, string> = {
  village: 'map-village',
  farm: 'map-farm',
  forest: 'map-forest',
  beach: 'map-beach',
  shop: 'map-shop',
};