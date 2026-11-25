/** Dev-LAN authoritative pet care session (mirrors sharedPetCareSession.ts). */

export function createSharedPetCareSession(worldId, petInstanceId, atMs = Date.now()) {
  return {
    worldId,
    petInstanceId,
    revision: 0,
    physical: {
      hunger: 72,
      thirst: 70,
      fun: 68,
      isSleeping: false,
      lastFedAtMs: null,
      lastPettedAtMs: null,
      favoriteSkus: ['pet_kibble_basic'],
      dislikedSkus: [],
      familiarSkus: ['pet_kibble_basic'],
      foodBowl: { foodSku: null, foodQuality: 'normal', portions: 0 },
      waterBowl: { volume: 55, capacity: 100 },
      pitcherWater: 80,
    },
    lastActorUserId: null,
    updatedAtMs: atMs,
  };
}

export function mergeSharedPetCareSession(prev, patch) {
  const physical = { ...prev.physical };
  if (patch.kind === 'stroke') {
    physical.fun = Math.min(100, physical.fun + 5);
    physical.lastPettedAtMs = patch.atMs;
    physical.isSleeping = false;
  } else if (patch.kind === 'feed') {
    physical.hunger = Math.min(100, physical.hunger + 10);
    physical.lastFedAtMs = patch.atMs;
    if (!physical.familiarSkus.includes(patch.itemSku)) {
      physical.familiarSkus = [...physical.familiarSkus, patch.itemSku];
    }
  } else if (patch.kind === 'brush') {
    physical.fun = Math.min(100, physical.fun + 3);
    physical.lastPettedAtMs = patch.atMs;
  }
  return {
    ...prev,
    revision: prev.revision + 1,
    physical,
    lastActorUserId: patch.actorUserId,
    updatedAtMs: patch.atMs,
  };
}