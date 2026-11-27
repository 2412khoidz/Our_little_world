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
    coatFluff: 0.72,
    activeToy: null,
    catPose: null,
  };
}

export function mergeSharedPetCareSession(prev, patch) {
  const physical = {
    ...prev.physical,
    foodBowl: { ...(prev.physical.foodBowl || { foodSku: null, foodQuality: 'normal', portions: 0 }) },
    waterBowl: { ...(prev.physical.waterBowl || { volume: 55, capacity: 100 }) },
  };
  let coatFluff = prev.coatFluff ?? 0.72;
  let activeToy = prev.activeToy ?? null;
  let catPose = prev.catPose ?? null;

  if (patch.kind === 'stroke') {
    physical.fun = Math.min(100, physical.fun + 5);
    physical.lastPettedAtMs = patch.atMs;
    physical.isSleeping = false;
  } else if (patch.kind === 'feed') {
    physical.hunger = Math.min(100, physical.hunger + 10);
    physical.lastFedAtMs = patch.atMs;
    physical.foodBowl = {
      foodSku: patch.itemSku || physical.foodBowl.foodSku || 'pet_kibble_basic',
      foodQuality: physical.foodBowl.foodQuality || 'normal',
      portions: Math.min(4, (physical.foodBowl.portions || 0) + 2),
    };
    if (!physical.familiarSkus.includes(patch.itemSku)) {
      physical.familiarSkus = [...physical.familiarSkus, patch.itemSku];
    }
  } else if (patch.kind === 'brush') {
    physical.fun = Math.min(100, physical.fun + 3);
    physical.lastPettedAtMs = patch.atMs;
    coatFluff = Math.min(0.96, coatFluff + 0.06);
  } else if (patch.kind === 'water') {
    physical.thirst = Math.min(100, physical.thirst + 8);
    physical.waterBowl = { ...physical.waterBowl, volume: 100 };
  } else if (patch.kind === 'toy') {
    physical.fun = Math.min(100, physical.fun + 4);
    physical.isSleeping = false;
    activeToy = {
      kind: patch.toyKind,
      x: patch.x,
      z: patch.z,
      vx: patch.vx,
      vz: patch.vz,
      atMs: patch.atMs,
    };
  } else if (patch.kind === 'pose') {
    catPose = {
      x: patch.x,
      z: patch.z,
      heading: patch.heading,
      activity: patch.activity,
    };
  }
  return {
    ...prev,
    revision: prev.revision + 1,
    physical,
    lastActorUserId: patch.actorUserId,
    updatedAtMs: patch.atMs,
    coatFluff,
    activeToy,
    catPose,
  };
}