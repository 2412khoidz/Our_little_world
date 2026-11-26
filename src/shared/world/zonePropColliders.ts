import type { MapId } from '../types';

export interface StaticPropFootprint {
  readonly id: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * Authoritative solid tile footprints for all visual architectural/prop overlays
 * rendered by `applyTiledZoneAccents` so player movement, click pathfinding, and
 * pet navigation obey the exact same solid geometry.
 */
export const STATIC_ZONE_PROP_FOOTPRINTS: Partial<Record<MapId, readonly StaticPropFootprint[]>> = {
  farm: [
    { id: 'hollowmere_greenhouse', x0: 16, y0: 6, x1: 20, y1: 8 },
    { id: 'hollowmere_farmhouse', x0: 6, y0: 7, x1: 10, y1: 9 },
    { id: 'hollowmere_shipping_bin', x0: 13, y0: 5, x1: 13, y1: 5 },
    { id: 'hollowmere_windmill', x0: 9, y0: 20, x1: 10, y1: 21 },
    { id: 'hollowmere_scarecrow', x0: 22, y0: 9, x1: 22, y1: 9 },
    { id: 'hollowmere_wishing_well', x0: 30, y0: 14, x1: 30, y1: 14 },
    { id: 'hollowmere_hay_bale_1', x0: 8, y0: 24, x1: 8, y1: 24 },
    { id: 'hollowmere_hay_bale_2', x0: 10, y0: 24, x1: 10, y1: 24 },
    { id: 'hollowmere_bench', x0: 35, y0: 11, x1: 36, y1: 11 },
    { id: 'farm_beehive', x0: 39, y0: 26, x1: 39, y1: 26 },
  ],
  village: [
    { id: 'hollowmere_village_cafe', x0: 17, y0: 29, x1: 20, y1: 30 },
  ],
  beach: [
    { id: 'hollowmere_beach_cafe', x0: 12, y0: 8, x1: 16, y1: 11 },
    { id: 'hollowmere_palm_nw', x0: 11, y0: 14, x1: 11, y1: 14 },
    { id: 'hollowmere_palm_ne', x0: 24, y0: 11, x1: 24, y1: 11 },
    { id: 'hollowmere_palm_sw', x0: 17, y0: 24, x1: 17, y1: 24 },
    { id: 'hollowmere_beach_bench', x0: 21, y0: 16, x1: 21, y1: 16 },
    { id: 'hollowmere_crab_pot_south', x0: 28, y0: 28, x1: 28, y1: 28 },
  ],
  forest: [
    { id: 'hollowmere_forest_bench', x0: 21, y0: 18, x1: 21, y1: 18 },
    { id: 'hollowmere_forest_well', x0: 11, y0: 22, x1: 11, y1: 22 },
  ],
};

const CACHE = new Map<MapId, ReadonlySet<string>>();

export function getStaticZonePropBlockedTiles(mapId: MapId): ReadonlySet<string> {
  const existing = CACHE.get(mapId);
  if (existing) return existing;
  const set = new Set<string>();
  for (const rect of STATIC_ZONE_PROP_FOOTPRINTS[mapId] ?? []) {
    for (let y = rect.y0; y <= rect.y1; y += 1) {
      for (let x = rect.x0; x <= rect.x1; x += 1) {
        set.add(`${x},${y}`);
      }
    }
  }
  CACHE.set(mapId, set);
  return set;
}
