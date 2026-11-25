const AUTHORITY_TARGET = { eat_bowl: 'food_bowl', drink_water: 'water_bowl' };
const DEST_TILE = { food_bowl: [12, 10], water_bowl: [13, 10] };
const PERFORM_MS = { eat_bowl: 4200, drink_water: 3800 };

export function buildDevLanMovementPlan(pet, actionId, targetAffordanceId) {
  const required = AUTHORITY_TARGET[actionId];
  if (!required || targetAffordanceId !== required) {
    return { ok: false, code: 'TARGET_MISMATCH' };
  }
  if ((pet.mapId ?? 'home') !== 'home') {
    return { ok: false, code: 'MAP_NOT_SUPPORTED' };
  }
  const dest = DEST_TILE[targetAffordanceId];
  if (!dest) return { ok: false, code: 'TARGET_UNKNOWN' };
  const sx = pet.anchorTileX ?? 13;
  const sy = pet.anchorTileY ?? 9;
  const pathSteps = Math.abs(dest[0] - sx) + Math.abs(dest[1] - sy);
  const travelMs = Math.min(8000, Math.max(400, pathSteps * 420 + 900));
  const performMs = PERFORM_MS[actionId];
  const plan = {
    pathSteps,
    originTileX: sx,
    originTileY: sy,
    destTileX: dest[0],
    destTileY: dest[1],
    travelMs,
    performMs,
    planHash: `home:${actionId}:${targetAffordanceId}:${sx}:${sy}:${dest[0]}:${dest[1]}:${pathSteps}`,
    mapId: 'home',
    furnitureCollisionMode: 'starter_static',
  };
  return { ok: true, plan };
}

export const STALE_ACTION_MS = 180000;