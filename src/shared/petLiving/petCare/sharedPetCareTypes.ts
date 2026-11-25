import type { SharedPetCarePatch, SharedPetCareSession } from './sharedPetCareSession';

export interface PetCareSessionSnapshotPayload {
  type: 'PET_CARE_SESSION';
  worldId: string;
  session: SharedPetCareSession;
}

export interface PetCareSessionPatchPayload {
  type: 'PET_CARE_PATCH';
  worldId: string;
  petInstanceId: string;
  patch: SharedPetCarePatch;
  revision: number;
}

export type PetCareSessionEventPacket = PetCareSessionSnapshotPayload | PetCareSessionPatchPayload;