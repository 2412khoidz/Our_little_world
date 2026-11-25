/**
 * Mission 04B-2 / 04D — navigation authority contract (registry; not home-only hardcode).
 * SQL `pet_nav_anchors` + plan builders consume the same target/action bindings.
 */

import { PET_HOME_MAP_ID } from './petHomeNavLayout';
import { AUTHORITY_CONSUMPTION_TARGET_BY_ACTION } from './petAuthorityMovementPlan';

export const PET_AUTHORITY_NAV_CONTRACT_VERSION = 1;

export type PetAuthorityFurnitureCollisionMode =
  | 'starter_static'
  | 'world_placement_snapshot'
  | 'unsupported';

export interface PetAuthorityMapNavSupport {
  readonly mapId: string;
  readonly supported: boolean;
  readonly furnitureCollisionMode: PetAuthorityFurnitureCollisionMode;
  readonly failClosedWhenUnverified: boolean;
  readonly noteVi: string;
}

/** Maps eligible for server consumption planning (extended in 04D without rewriting RPC names). */
export const PET_AUTHORITY_MAP_REGISTRY: Readonly<Record<string, PetAuthorityMapNavSupport>> = {
  [PET_HOME_MAP_ID]: {
    mapId: PET_HOME_MAP_ID,
    supported: true,
    furnitureCollisionMode: 'starter_static',
    failClosedWhenUnverified: true,
    noteVi: 'Chỉ dùng tường tĩnh + bố cục starter; chưa có placement động từ DB.',
  },
  garden: {
    mapId: 'garden',
    supported: false,
    furnitureCollisionMode: 'unsupported',
    failClosedWhenUnverified: true,
    noteVi: '04D: bật khi có snapshot placement cho garden.',
  },
};

export function getMapNavSupport(mapId: string): PetAuthorityMapNavSupport | null {
  return PET_AUTHORITY_MAP_REGISTRY[mapId] ?? null;
}

export function isConsumptionPlanningSupported(mapId: string): boolean {
  const row = getMapNavSupport(mapId);
  return row?.supported === true && row.failClosedWhenUnverified;
}

export { AUTHORITY_CONSUMPTION_TARGET_BY_ACTION };