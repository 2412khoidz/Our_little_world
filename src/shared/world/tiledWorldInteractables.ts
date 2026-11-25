import { TILE_SIZE } from '../maps';
import type { MapId } from '../types';
import type { InteractableTarget } from '../interaction/interactionTypes';
import { FARM_WORLD_INTERACTABLES } from './farmPlotContract';
import { getParsedTiledWorld } from './tiledMapRegistry';

function tileCenterPx(tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };
}

/** Presentation targets for Tiled zones (farm shipping bin, pond water, etc.). */
export function buildTiledWorldInteractableTargets(
  mapId: MapId,
  economyPlayable = false,
): InteractableTarget[] {
  const parsed = getParsedTiledWorld(mapId);
  if (!parsed) return [];

  const fromJson: InteractableTarget[] = [];
  for (const spawn of parsed.interactableSpawns) {
    if (
      !economyPlayable &&
      (spawn.kind === 'shipping_bin' || spawn.kind === 'fishing_spot' || spawn.kind === 'workshop_building')
    ) {
      continue;
    }
    const center = tileCenterPx(spawn.tileX, spawn.tileY);
    const economyKind =
      spawn.kind === 'shipping_bin' || spawn.kind === 'fishing_spot' || spawn.kind === 'workshop_building';
    fromJson.push({
      id: spawn.id,
      kind: spawn.kind,
      labelVi:
        spawn.kind === 'shipping_bin' && economyPlayable
          ? 'Thùng gom hàng — bán qua đêm'
          : spawn.labelVi,
      x: center.x,
      y: center.y,
      maxRadiusPx: spawn.maxRadiusPx ?? 48,
      donorPlayable: economyKind ? economyPlayable : undefined,
    });
  }
  if (fromJson.length > 0) return fromJson;

  if (mapId === 'farm') {
    return Object.values(FARM_WORLD_INTERACTABLES)
      .filter((def) => {
        if (economyPlayable && def.id === 'farm_barn_door') return false;
        if (!economyPlayable && (def.kind === 'shipping_bin' || def.id === 'farm_barn_door')) {
          return false;
        }
        return true;
      })
      .map((def) => {
        const center = tileCenterPx(def.tileX, def.tileY);
        const shipping = def.kind === 'shipping_bin';
        return {
          id: def.id,
          kind: def.kind,
          labelVi: shipping && economyPlayable ? 'Thùng gom hàng — bán qua đêm' : def.labelVi,
          x: center.x,
          y: center.y,
          maxRadiusPx: def.kind === 'water_source' ? 54 : 46,
          donorPlayable: shipping ? economyPlayable : undefined,
        };
      });
  }

  return [];
}