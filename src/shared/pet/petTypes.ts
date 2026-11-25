import type { MapId } from '../types';

export type PetSpecies = 'cat-orange';
export type PetActionType = 'pet' | 'feed' | 'water';
export type PetMood = 'happy' | 'cozy' | 'sleepy' | 'hungry';

export interface PetVitals {
  hunger: number; // 30..100
  energy: number; // 30..100
  fun: number; // 30..100
}

export interface PetSnapshot {
  id: string;
  worldId: string;
  species: PetSpecies;
  name: string;
  vitals: PetVitals;
  emotion: PetMood;
  mapId: MapId;
  anchorTileX: number;
  anchorTileY: number;
  lastFedAtMs: number | null;
  lastWateredAtMs: number | null;
  lastPettedAtMs: number | null;
  simStateAtMs: number;
  version: number;
  updatedAt: string;
  serverNowMs: number;
}

export interface PetInteractionResult {
  pet: PetSnapshot;
  action: PetActionType;
  kibbleRemaining: number;
}

export interface PetCareBowlSnapshot {
  worldId: string;
  petId: string | null;
  version: number;
  foodPortions: number;
  waterVolume: number;
  foodSku: string | null;
  foodQuality: 'normal' | 'silver' | 'gold' | null;
}

export interface PetCareApplyResult {
  bowl: {
    version: number;
    food_portions?: number;
    water_volume?: number;
    food_sku?: string | null;
    food_quality?: string | null;
  };
  pet: PetSnapshot;
}

export type PetCareAction = 'fill_food' | 'fill_water';
