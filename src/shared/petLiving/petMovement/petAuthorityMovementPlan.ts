/**
 * Mission 04B-2 — server-owned movement plan (mirrored in PostgreSQL).
 * Uses the same grid + anchors as 04B-1 `petMovementExecutor`.
 */

import { MAP_DEFINITIONS, TILE_SIZE } from '../../maps';
import { getActionAnimationSpec } from './petActionAnimationMap';
import {
  PET_HOME_MAP_ID,
  buildHomeMovementBlockedTiles,
  findNavAnchor,
} from './petHomeNavLayout';
import { findTilePath, type GridPoint } from './tilePathfinding';

export const AUTHORITY_CONSUMPTION_TARGET_BY_ACTION = {
  eat_bowl: 'food_bowl',
  drink_water: 'water_bowl',
} as const;

export type AuthorityConsumptionActionId = keyof typeof AUTHORITY_CONSUMPTION_TARGET_BY_ACTION;

const APPROACH_SNIFF_MS = 900;
const MS_PER_PATH_STEP = 420;
const MIN_TRAVEL_MS = 400;
const MAX_TRAVEL_MS = 8000;

function specActionId(actionId: AuthorityConsumptionActionId): string {
  return actionId === 'drink_water' ? 'drink_bowl' : actionId;
}

export interface PetAuthorityMovementPlan {
  pathSteps: number;
  destTileX: number;
  destTileY: number;
  travelMs: number;
  performMs: number;
  planHash: string;
  targetAffordanceId: string;
}

export type PetAuthorityMovementPlanResult =
  | { ok: true; plan: PetAuthorityMovementPlan }
  | { ok: false; code: 'MAP_NOT_SUPPORTED' | 'TARGET_MISMATCH' | 'TARGET_UNKNOWN' | 'TARGET_UNREACHABLE' };

function standTileFromAnchor(targetId: string): GridPoint | null {
  const anchor = findNavAnchor(targetId);
  if (!anchor) return null;
  return {
    tileX: Math.floor(anchor.anchorPixelX / TILE_SIZE),
    tileY: Math.floor((anchor.anchorPixelY - TILE_SIZE + 2) / TILE_SIZE),
  };
}

function hashPlan(parts: readonly (string | number)[]): string {
  return parts.join(':');
}

export function buildPetAuthorityMovementPlan(input: {
  mapId: string;
  startTileX: number;
  startTileY: number;
  actionId: AuthorityConsumptionActionId;
  targetAffordanceId: string;
}): PetAuthorityMovementPlanResult {
  const required = AUTHORITY_CONSUMPTION_TARGET_BY_ACTION[input.actionId];
  if (input.targetAffordanceId !== required) {
    return { ok: false, code: 'TARGET_MISMATCH' };
  }
  if (input.mapId !== PET_HOME_MAP_ID) {
    return { ok: false, code: 'MAP_NOT_SUPPORTED' };
  }
  const dest = standTileFromAnchor(input.targetAffordanceId);
  if (!dest) {
    return { ok: false, code: 'TARGET_UNKNOWN' };
  }
  const map = MAP_DEFINITIONS[PET_HOME_MAP_ID];
  const blocked = buildHomeMovementBlockedTiles();
  const start: GridPoint = { tileX: input.startTileX, tileY: input.startTileY };
  const path = findTilePath(start, dest, map.widthTiles, map.heightTiles, blocked);
  const sameTile = start.tileX === dest.tileX && start.tileY === dest.tileY;
  if (!sameTile && path.length === 0) {
    return { ok: false, code: 'TARGET_UNREACHABLE' };
  }
  const pathSteps = path.length;
  const anim = getActionAnimationSpec(specActionId(input.actionId));
  const performMs = anim?.performDurationMs ?? 4000;
  const travelMs = Math.min(
    MAX_TRAVEL_MS,
    Math.max(MIN_TRAVEL_MS, pathSteps * MS_PER_PATH_STEP + (anim?.approachIntent === 'sniff' ? APPROACH_SNIFF_MS : 0)),
  );
  const planHash = hashPlan([input.actionId, input.targetAffordanceId, start.tileX, start.tileY, dest.tileX, dest.tileY, pathSteps]);
  return {
    ok: true,
    plan: {
      pathSteps,
      destTileX: dest.tileX,
      destTileY: dest.tileY,
      travelMs,
      performMs,
      planHash,
      targetAffordanceId: input.targetAffordanceId,
    },
  };
}