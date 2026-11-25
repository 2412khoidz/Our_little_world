import type Phaser from 'phaser';
import { USE_PRIVATE_ART } from '../art/atlasProfile';
import { WORLD_ART_KEY, WORLD_PROPS_KEY } from '../art/worldAtlas';
import type { MapId } from '../../shared/types';
import { isTiledWorldMapId } from '../../shared/world/tiledMapRegistry';

/** Zones that switch from starter tileset to Demo E atlas props/terrain when private art is ready. */
export const DEMO_E_WORLD_ZONE_IDS = ['village', 'farm', 'forest', 'beach', 'shop'] as const satisfies readonly MapId[];

export type DemoEWorldZoneId = (typeof DEMO_E_WORLD_ZONE_IDS)[number];

export function isDemoEWorldZone(mapId: MapId): mapId is DemoEWorldZoneId {
  return isTiledWorldMapId(mapId) && (DEMO_E_WORLD_ZONE_IDS as readonly string[]).includes(mapId);
}

/** Atlas six-pack on disk (dev server sets VITE_OLW_PRIVATE_ART when these exist). */
export function isPrivateAtlasReady(scene: Phaser.Scene): boolean {
  return scene.textures.exists(WORLD_ART_KEY) && scene.textures.exists(WORLD_PROPS_KEY);
}

export function shouldRenderDemoEWorldZone(scene: Phaser.Scene, mapId: MapId): boolean {
  return USE_PRIVATE_ART && isDemoEWorldZone(mapId) && isPrivateAtlasReady(scene);
}

export function privateArtBlockedReason(scene: Phaser.Scene): string | null {
  if (!USE_PRIVATE_ART) return null;
  if (isPrivateAtlasReady(scene)) return null;
  return 'Thiếu public/assets/private-unified/* — chạy npm run assets:atlas:private sau khi upload nguồn Demo E (xem docs/handover/MISSING_ASSETS_MANIFEST.md).';
}