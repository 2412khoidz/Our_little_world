/**
 * Phase II plan: one physical pet, two caregivers — state synced via world backend / dev-LAN.
 * Replaces per-client “đổi người chăm” toggles with authoritative shared care state.
 */
import type { PhysicalCarePetState } from '../petPhysicalCare';

export interface SharedPetCareSession {
  worldId: string;
  petInstanceId: string;
  /** Monotonic server revision for merge. */
  revision: number;
  physical: PhysicalCarePetState;
  /** Last member who stroked/fed (presence only — not ownership). */
  lastActorUserId: string | null;
  updatedAtMs: number;
}

export type SharedPetCarePatch =
  | { kind: 'stroke'; zone: string; actorUserId: string; atMs: number }
  | { kind: 'feed'; itemSku: string; actorUserId: string; atMs: number }
  | { kind: 'brush'; actorUserId: string; atMs: number };

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
  };
}

/** Authoritative merge for dev-LAN / optimistic client. */
export function mergeSharedPetCareSession(
  prev: SharedPetCareSession,
  patch: SharedPetCarePatch,
): SharedPetCareSession {
  const physical: PhysicalCarePetState = { ...prev.physical };
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