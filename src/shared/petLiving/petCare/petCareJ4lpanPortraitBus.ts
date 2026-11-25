import type { PetActionType, PetSnapshot } from '../../pet/petTypes';

export interface PetCareJ4lpanPortraitPayload {
  snapshot: PetSnapshot | null;
  bubbleVi: string;
  careFlash: PetActionType | 'play' | null;
  careFlashAtMs: number;
  serverNowMs: number;
}

export type PetCareJ4lpanFlash = PetActionType | 'play';