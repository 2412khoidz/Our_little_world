/**
 * Phase II plan: one physical pet, two caregivers — state synced via world backend / dev-LAN.
 * Replaces per-client “đổi người chăm” toggles with authoritative shared care state.
 */
import type { PhysicalCarePetState } from '../petPhysicalCare';

export interface SharedPetCareToyState {
  kind: 'ball' | 'yarn' | 'wand' | 'box';
  x: number;
  z: number;
  vx?: number;
  vz?: number;
  atMs: number;
}

export interface SharedPetCareCatPoseState {
  x: number;
  z: number;
  heading: number;
  activity: string;
}

export interface SharedPetCareSession {
  worldId: string;
  petInstanceId: string;
  /** Monotonic server revision for merge. */
  revision: number;
  physical: PhysicalCarePetState;
  /** Last member who stroked/fed/played (presence only — not ownership). */
  lastActorUserId: string | null;
  updatedAtMs: number;
  coatFluff?: number;
  activeToy?: SharedPetCareToyState | null;
  catPose?: SharedPetCareCatPoseState | null;
}

export type SharedPetCarePatch =
  | { kind: 'stroke'; zone: string; actorUserId: string; atMs: number }
  | { kind: 'feed'; itemSku: string; actorUserId: string; atMs: number }
  | { kind: 'brush'; actorUserId: string; atMs: number }
  | { kind: 'water'; actorUserId: string; atMs: number }
  | { kind: 'toy'; toyKind: 'ball' | 'yarn' | 'wand' | 'box'; x: number; z: number; vx?: number; vz?: number; actorUserId: string; atMs: number }
  | { kind: 'pose'; x: number; z: number; heading: number; activity: string; actorUserId: string; atMs: number };

export function createSharedPetCareSession(worldId: string, petInstanceId: string, atMs = Date.now()): SharedPetCareSession {
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

/** Authoritative merge for dev-LAN / optimistic client. */
export function mergeSharedPetCareSession(
  prev: SharedPetCareSession,
  patch: SharedPetCarePatch,
): SharedPetCareSession {
  const physical: PhysicalCarePetState = {
    ...prev.physical,
    foodBowl: { ...prev.physical.foodBowl },
    waterBowl: { ...prev.physical.waterBowl },
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
      foodQuality: physical.foodBowl.foodQuality,
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