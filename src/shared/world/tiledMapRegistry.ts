import type { MapId } from '../types';
import farmJson from '../../../public/assets/maps/farm.json';
import { parseTiledWorldMap, type ParsedTiledWorldMap, type TiledWorldMapJson } from './parseTiledWorldMap';

/** Mission 05 (#14): farm zone only; other Tiled zones land with PR #12. */
export const PARSED_TILED_WORLDS: Partial<Record<MapId, ParsedTiledWorldMap>> = {
  farm: parseTiledWorldMap(farmJson as TiledWorldMapJson),
};

export function getParsedTiledWorld(mapId: MapId): ParsedTiledWorldMap | null {
  return PARSED_TILED_WORLDS[mapId] ?? null;
}

export const TILED_WORLD_MAP_IDS = ['farm'] as const satisfies readonly MapId[];
export type TiledWorldMapId = (typeof TILED_WORLD_MAP_IDS)[number];

export function isTiledWorldMapId(mapId: MapId): mapId is TiledWorldMapId {
  return (TILED_WORLD_MAP_IDS as readonly string[]).includes(mapId);
}

export const TILED_MAP_PHASER_KEYS: Record<TiledWorldMapId, string> = {
  farm: 'map-farm',
};