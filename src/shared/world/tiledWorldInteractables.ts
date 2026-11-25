import { TILE_SIZE } from '../maps';
import type { MapId } from '../types';
import type { InteractableTarget } from '../interaction/interactionTypes';
import { FARM_WORLD_INTERACTABLES } from './farmPlotContract';
import { getParsedTiledWorld } from './tiledMapRegistry';

function tileCenterPx(tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };
}

/** Presentation targets for Tiled zones (farm shipping bin, pond water, etc.). */
export function buildTiledWorldInteractableTargets(mapId: MapId): InteractableTarget[] {
  const parsed = getParsedTiledWorld(mapId);
  if (!parsed) return [];

  const fromJson: InteractableTarget[] = [];
  for (const spawn of parsed.interactableSpawns) {
    const center = tileCenterPx(spawn.tileX, spawn.tileY);
    fromJson.push({
      id: spawn.id,
      kind: spawn.kind,
      labelVi: spawn.labelVi,
      x: center.x,
      y: center.y,
      maxRadiusPx: spawn.maxRadiusPx ?? 48,
    });
  }
  if (fromJson.length > 0) return fromJson;

  if (mapId === 'farm') {
    return Object.values(FARM_WORLD_INTERACTABLES).map((def) => {
      const center = tileCenterPx(def.tileX, def.tileY);
      return {
        id: def.id,
        kind: def.kind,
        labelVi: def.labelVi,
        x: center.x,
        y: center.y,
        maxRadiusPx: def.kind === 'water_source' ? 54 : 46,
      };
    });
  }

  return [];
}