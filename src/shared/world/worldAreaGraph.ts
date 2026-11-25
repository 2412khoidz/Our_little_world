/**
 * Planned multi-region world graph (Stardew-style linked areas).
 * Mission 04D ships `home` | `garden` | `outdoor` only; this file is the
 * contract for the world overhaul without widening runtime `MapId` yet.
 *
 * Source patterns: Harvest Duo `Area.warps`, Hollowmere `data/maps/*.json`.
 */

import type { MapId } from '../types';

export type WorldAreaPhase = 'live' | 'tiled_wip' | 'planned';

export interface WorldAreaNode {
  /** Stable id (may become MapId when implemented). */
  id: string;
  nameVi: string;
  phase: WorldAreaPhase;
  /** Existing OLW map when live. */
  mapId?: MapId;
  /** Target size in tiles once authored (Tiled). */
  widthTiles: number;
  heightTiles: number;
  /** Interior maps entered from this area (shop, house). */
  interiorIds: readonly string[];
}

export interface WorldAreaWarp {
  id: string;
  fromAreaId: string;
  toAreaId: string;
  labelVi: string;
  /** Tile rect on source map (inclusive). */
  fromRect: { x: number; y: number; w: number; h: number };
  spawnTile: { x: number; y: number };
}

/** Canonical target topology for owner vision (not all playable yet). */
export const WORLD_AREA_NODES: readonly WorldAreaNode[] = [
  { id: 'home', nameVi: 'Trong nhà', phase: 'live', mapId: 'home', widthTiles: 16, heightTiles: 12, interiorIds: [] },
  { id: 'garden', nameVi: 'Khu vườn', phase: 'live', mapId: 'garden', widthTiles: 18, heightTiles: 14, interiorIds: [] },
  { id: 'meadow', nameVi: 'Đồng cỏ & nông trại', phase: 'live', mapId: 'outdoor', widthTiles: 64, heightTiles: 64, interiorIds: ['barn', 'greenhouse'] },
  { id: 'village', nameVi: 'Làng', phase: 'planned', widthTiles: 80, heightTiles: 60, interiorIds: ['general_store', 'inn'] },
  { id: 'forest', nameVi: 'Rừng', phase: 'planned', widthTiles: 72, heightTiles: 72, interiorIds: ['forest_shrine'] },
  { id: 'lake', nameVi: 'Hồ & cầu câu', phase: 'planned', widthTiles: 48, heightTiles: 40, interiorIds: [] },
  { id: 'beach', nameVi: 'Bãi biển', phase: 'planned', widthTiles: 56, heightTiles: 32, interiorIds: ['beach_cabana'] },
];

/** Warps that exist today in `MAP_DEFINITIONS` (outdoor overhaul adds more). */
export const WORLD_AREA_WARPS_LIVE: readonly WorldAreaWarp[] = [
  {
    id: 'home-garden',
    fromAreaId: 'home',
    toAreaId: 'garden',
    labelVi: 'Ra khu vườn',
    fromRect: { x: 7, y: 11, w: 2, h: 1 },
    spawnTile: { x: 8, y: 4 },
  },
  {
    id: 'garden-outdoor',
    fromAreaId: 'garden',
    toAreaId: 'meadow',
    labelVi: 'Ra đồng cỏ',
    fromRect: { x: 9, y: 13, w: 1, h: 1 },
    spawnTile: { x: 31, y: 32 },
  },
];

export function plannedAreas(): WorldAreaNode[] {
  return WORLD_AREA_NODES.filter((n) => n.phase === 'planned');
}