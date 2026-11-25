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
  | { kind: 'feed'; itemSku: string; actorUserId: string; atMs: number };

/** Client-side placeholder until RPC lands (Mission 04c+). */
export function mergeSharedPetCareSession(
  prev: SharedPetCareSession,
  patch: SharedPetCarePatch,
): SharedPetCareSession {
  return {
    ...prev,
    revision: prev.revision + 1,
    lastActorUserId: patch.actorUserId,
    updatedAtMs: patch.atMs,
  };
}