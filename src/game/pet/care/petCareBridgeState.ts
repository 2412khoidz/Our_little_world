import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { MemoryState } from '../../../shared/petAdvanced/primitives/memory';
import type { Pet8Needs } from '../../../shared/petLiving/petIntelligenceConfig';
import type { SharedPetCareSession } from '../../../shared/petLiving/petCare/sharedPetCareSession';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';

export interface PetCareBridgeIdentity {
  variant: CatCoatVariantId;
  accessory: CatAccessoryId;
  petName: string;
  traitId?: string;
  petSnapshot: PetSnapshot | null;
}

export interface PersistedPetCareV2State {
  catX: number;
  catZ: number;
  heading: number;
  activity: string;
  coatFluff: number;
  foodFill: number;
  waterFill: number;
  boxPlaced: boolean;
  boxPos: [number, number];
  yarnPos: [number, number];
  ballPos: [number, number];
  needs: Pet8Needs;
  memory: MemoryState;
  affection: number;
  updatedAtMs: number;
}

let currentIdentity: PetCareBridgeIdentity | null = null;
let persistedCareState: PersistedPetCareV2State | null = null;
let latestSharedSession: SharedPetCareSession | null = null;
const identityListeners = new Set<(id: PetCareBridgeIdentity) => void>();

export function setLatestSharedPetCareSession(session: SharedPetCareSession | null): void {
  latestSharedSession = session;
}

export function getLatestSharedPetCareSession(): SharedPetCareSession | null {
  return latestSharedSession;
}

export function setPetCareBridgeIdentity(identity: PetCareBridgeIdentity): void {
  currentIdentity = identity;
  for (const listener of identityListeners) listener(identity);
}

export function getPetCareBridgeIdentity(): PetCareBridgeIdentity | null {
  return currentIdentity;
}

export function subscribePetCareBridgeIdentity(listener: (id: PetCareBridgeIdentity) => void): () => void {
  identityListeners.add(listener);
  if (currentIdentity) listener(currentIdentity);
  return () => {
    identityListeners.delete(listener);
  };
}

export function savePersistedPetCareV2State(state: PersistedPetCareV2State): void {
  persistedCareState = state;
}

export function getPersistedPetCareV2State(): PersistedPetCareV2State | null {
  return persistedCareState;
}

export function getPetCareBridgeState() {
  return {
    identity: currentIdentity,
    persistedCareState,
  };
}
