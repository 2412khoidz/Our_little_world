import type { MapId } from '../types';

export interface StaticPropFootprint {
  readonly id: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface StaticZonePropSpec extends StaticPropFootprint {
  readonly mapId: MapId;
  readonly textureKey: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly scale: number;
  readonly shadowW?: number;
  readonly depthOffset?: number;
  readonly bobAmp?: number;
  /** Visual-only ambient props (overhead string lights, floating boat/sea pot) do not block walking. */
  readonly walkable?: boolean;
}

/**
 * Single authoritative registry for Hollowmere props and their solid collision footprints
 * across reconstructed Tiled zones (`applyTiledZoneAccents`, player movement, click pathing, and pet BFS).
 */
export const STATIC_ZONE_PROP_SPECS: readonly StaticZonePropSpec[] = [
  // Farm
  { id: 'hollowmere_greenhouse', mapId: 'farm', textureKey: 'donor-hollowmere-greenhouse', tileX: 18, tileY: 8, scale: 0.44, shadowW: 72, x0: 16, y0: 6, x1: 20, y1: 8 },
  { id: 'hollowmere_farmhouse', mapId: 'farm', textureKey: 'donor-hollowmere-farmhouse', tileX: 8, tileY: 9, scale: 0.46, shadowW: 66, x0: 6, y0: 7, x1: 10, y1: 9 },
  { id: 'hollowmere_shipping_bin', mapId: 'farm', textureKey: 'donor-hollowmere-shipping-bin', tileX: 13, tileY: 5, scale: 0.55, shadowW: 18, x0: 13, y0: 5, x1: 13, y1: 5 },
  { id: 'hollowmere_windmill', mapId: 'farm', textureKey: 'donor-hollowmere-windmill', tileX: 9.5, tileY: 21.5, scale: 0.72, shadowW: 24, x0: 9, y0: 20, x1: 10, y1: 22 },
  { id: 'hollowmere_scarecrow', mapId: 'farm', textureKey: 'donor-hollowmere-scarecrow', tileX: 22, tileY: 9, scale: 0.62, shadowW: 14, x0: 22, y0: 9, x1: 22, y1: 9 },
  { id: 'hollowmere_wishing_well', mapId: 'farm', textureKey: 'donor-hollowmere-wishing-well', tileX: 30, tileY: 14, scale: 0.55, shadowW: 20, x0: 30, y0: 14, x1: 30, y1: 14 },
  { id: 'hollowmere_hay_bale_1', mapId: 'farm', textureKey: 'donor-hollowmere-hay-bale', tileX: 8, tileY: 24, scale: 0.55, shadowW: 16, x0: 8, y0: 24, x1: 8, y1: 24 },
  { id: 'hollowmere_hay_bale_2', mapId: 'farm', textureKey: 'donor-hollowmere-hay-bale', tileX: 10, tileY: 24, scale: 0.55, shadowW: 16, x0: 10, y0: 24, x1: 10, y1: 24 },
  { id: 'hollowmere_bench', mapId: 'farm', textureKey: 'donor-hollowmere-bench', tileX: 35, tileY: 11, scale: 0.55, shadowW: 22, x0: 35, y0: 11, x1: 36, y1: 11 },

  // Village
  { id: 'hollowmere_village_cafe', mapId: 'village', textureKey: 'donor-hollowmere-cafe', tileX: 19, tileY: 30, scale: 0.36, shadowW: 54, x0: 17, y0: 29, x1: 20, y1: 30 },
  { id: 'hollowmere_village_lights', mapId: 'village', textureKey: 'donor-hollowmere-string-lights', tileX: 42, tileY: 26, scale: 0.65, depthOffset: 40, x0: 42, y0: 26, x1: 42, y1: 26, walkable: true },

  // Beach
  { id: 'hollowmere_beach_ferry', mapId: 'beach', textureKey: 'donor-hollowmere-ferry', tileX: 39, tileY: 21, scale: 0.72, shadowW: 56, bobAmp: 2.2, x0: 39, y0: 21, x1: 39, y1: 21, walkable: true },
  { id: 'hollowmere_beach_cafe', mapId: 'beach', textureKey: 'donor-hollowmere-cafe', tileX: 14, tileY: 11, scale: 0.44, shadowW: 68, x0: 12, y0: 8, x1: 16, y1: 11 },
  { id: 'hollowmere_palm_nw', mapId: 'beach', textureKey: 'donor-hollowmere-palm', tileX: 11, tileY: 14, scale: 0.72, shadowW: 20, x0: 11, y0: 14, x1: 11, y1: 14 },
  { id: 'hollowmere_palm_ne', mapId: 'beach', textureKey: 'donor-hollowmere-palm', tileX: 24, tileY: 11, scale: 0.75, shadowW: 20, x0: 24, y0: 11, x1: 24, y1: 11 },
  { id: 'hollowmere_palm_sw', mapId: 'beach', textureKey: 'donor-hollowmere-palm', tileX: 17, tileY: 24, scale: 0.7, shadowW: 20, x0: 17, y0: 24, x1: 17, y1: 24 },
  { id: 'hollowmere_crab_pot_sea', mapId: 'beach', textureKey: 'donor-hollowmere-crab-pot', tileX: 34.5, tileY: 19.2, scale: 0.6, shadowW: 10, bobAmp: 1.0, x0: 34, y0: 19, x1: 34, y1: 19, walkable: true },
  { id: 'hollowmere_crab_pot_south', mapId: 'beach', textureKey: 'donor-hollowmere-crab-pot', tileX: 28, tileY: 28, scale: 0.6, shadowW: 12, x0: 28, y0: 28, x1: 28, y1: 28 },
  { id: 'hollowmere_beach_bench', mapId: 'beach', textureKey: 'donor-hollowmere-bench', tileX: 21, tileY: 16, scale: 0.62, shadowW: 22, x0: 21, y0: 16, x1: 21, y1: 16 },

  // Forest
  { id: 'hollowmere_forest_bench', mapId: 'forest', textureKey: 'donor-hollowmere-bench', tileX: 21, tileY: 18, scale: 0.58, shadowW: 20, x0: 21, y0: 18, x1: 21, y1: 18 },
  { id: 'hollowmere_forest_well', mapId: 'forest', textureKey: 'donor-hollowmere-wishing-well', tileX: 11, tileY: 22, scale: 0.52, shadowW: 18, x0: 11, y0: 22, x1: 11, y1: 22 },
];

export function getStaticZonePropSpecs(mapId: MapId): readonly StaticZonePropSpec[] {
  return STATIC_ZONE_PROP_SPECS.filter((s) => s.mapId === mapId);
}

/**
 * Authoritative solid tile footprints for all visual architectural/prop overlays
 * rendered by `applyTiledZoneAccents` so player movement, click pathfinding, and
 * pet navigation obey the exact same solid geometry.
 */
export const STATIC_ZONE_PROP_FOOTPRINTS: Partial<Record<MapId, readonly StaticPropFootprint[]>> = {
  farm: [
    ...STATIC_ZONE_PROP_SPECS.filter((s) => s.mapId === 'farm' && !s.walkable),
    { id: 'farm_beehive', x0: 40, y0: 26, x1: 40, y1: 26 },
  ],
  village: STATIC_ZONE_PROP_SPECS.filter((s) => s.mapId === 'village' && !s.walkable),
  beach: STATIC_ZONE_PROP_SPECS.filter((s) => s.mapId === 'beach' && !s.walkable),
  forest: STATIC_ZONE_PROP_SPECS.filter((s) => s.mapId === 'forest' && !s.walkable),
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
