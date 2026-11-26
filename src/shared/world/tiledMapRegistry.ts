import type { MapId } from '../types';
import beachJson from '../../assets/maps/beach.json';
import farmJson from '../../assets/maps/farm.json';
import forestJson from '../../assets/maps/forest.json';
import meadowJson from '../../assets/maps/meadow.json';
import shopJson from '../../assets/maps/shop.json';
import shopCropMarketJson from '../../assets/maps/shop_crop_market.json';
import shopSeedJson from '../../assets/maps/shop_seed.json';
import shopToolJson from '../../assets/maps/shop_tool.json';
import shopTownHallJson from '../../assets/maps/shop_town_hall.json';
import homeJson from '../../assets/maps/home.json';
import gardenJson from '../../assets/maps/garden.json';
import villageJson from '../../assets/maps/village.json';
import { parseTiledWorldMap, type ParsedTiledWorldMap, type TiledWorldMapJson } from './parseTiledWorldMap';

export const PARSED_TILED_WORLDS: Partial<Record<MapId, ParsedTiledWorldMap>> = {
  home: parseTiledWorldMap(homeJson as TiledWorldMapJson),
  garden: parseTiledWorldMap(gardenJson as TiledWorldMapJson),
  village: parseTiledWorldMap(villageJson as TiledWorldMapJson),
  farm: parseTiledWorldMap(farmJson as TiledWorldMapJson),
  forest: parseTiledWorldMap(forestJson as TiledWorldMapJson),
  beach: parseTiledWorldMap(beachJson as TiledWorldMapJson),
  shop: parseTiledWorldMap(shopJson as TiledWorldMapJson),
  shop_seed: parseTiledWorldMap(shopSeedJson as TiledWorldMapJson),
  shop_tool: parseTiledWorldMap(shopToolJson as TiledWorldMapJson),
  shop_crop_market: parseTiledWorldMap(shopCropMarketJson as TiledWorldMapJson),
  shop_town_hall: parseTiledWorldMap(shopTownHallJson as TiledWorldMapJson),
};

export function getParsedTiledWorld(mapId: MapId): ParsedTiledWorldMap | null {
  return PARSED_TILED_WORLDS[mapId] ?? null;
}

export const TILED_WORLD_MAP_IDS = [
  'home',
  'garden',
  'village',
  'farm',
  'forest',
  'beach',
  'shop',
  'shop_seed',
  'shop_tool',
  'shop_crop_market',
  'shop_town_hall',
] as const satisfies readonly MapId[];
export type TiledWorldMapId = (typeof TILED_WORLD_MAP_IDS)[number];

export function isTiledWorldMapId(mapId: MapId): mapId is TiledWorldMapId {
  return (TILED_WORLD_MAP_IDS as readonly string[]).includes(mapId);
}

export const TILED_MAP_PHASER_KEYS: Record<TiledWorldMapId, string> = {
  home: 'map-home',
  garden: 'map-garden',
  village: 'map-village',
  farm: 'map-farm',
  forest: 'map-forest',
  beach: 'map-beach',
  shop: 'map-shop',
  shop_seed: 'map-shop-seed',
  shop_tool: 'map-shop-tool',
  shop_crop_market: 'map-shop-crop-market',
  shop_town_hall: 'map-shop-town-hall',
};

export const TILED_MAP_RAW_JSON_BY_PHASER_KEY: Record<string, TiledWorldMapJson> = {
  'map-home': homeJson as TiledWorldMapJson,
  'map-garden': gardenJson as TiledWorldMapJson,
  'map-meadow': meadowJson as TiledWorldMapJson,
  'map-village': villageJson as TiledWorldMapJson,
  'map-farm': farmJson as TiledWorldMapJson,
  'map-forest': forestJson as TiledWorldMapJson,
  'map-beach': beachJson as TiledWorldMapJson,
  'map-shop': shopJson as TiledWorldMapJson,
  'map-shop-seed': shopSeedJson as TiledWorldMapJson,
  'map-shop-tool': shopToolJson as TiledWorldMapJson,
  'map-shop-crop-market': shopCropMarketJson as TiledWorldMapJson,
  'map-shop-town-hall': shopTownHallJson as TiledWorldMapJson,
};