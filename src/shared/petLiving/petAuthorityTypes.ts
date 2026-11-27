/**
 * Mission 04B-2 — server-authoritative living pet snapshots (no client vitals mutation).
 */

export type PetLivingProposalKind = 'movement_ready' | 'animation_finished';

export type PetFoodOfferStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'deferred'
  | 'cancelled'
  | 'expired'
  | 'consumed';

export type PetLivingActionStatus =
  | 'pending'
  | 'moving'
  | 'performing'
  | 'completed'
  | 'cancelled';

export interface PetLivingActionInstance {
  id: string;
  worldId: string;
  petId: string;
  actionId: 'eat_bowl' | 'drink_water';
  targetAffordanceId: string;
  status: PetLivingActionStatus;
  startedAtMs: number;
  arriveAtMs: number;
  performUntilMs: number;
  movementVerified: boolean;
  animationVerified: boolean;
  completedAtMs: number | null;
  originTileX?: number | null;
  originTileY?: number | null;
  authoritativeTileX?: number | null;
  authoritativeTileY?: number | null;
  pathSteps?: number | null;
}

export interface PetFoodOfferRow {
  id: string;
  worldId: string;
  petId: string;
  caregiverId: string;
  itemSku: string;
  quality: 'normal' | 'silver' | 'gold';
  status: PetFoodOfferStatus;
  expiresAtMs: number;
  createdAtMs: number;
}

export interface PetLivingMemoryEvent {
  id: string;
  worldId: string;
  petId: string;
  kind: string;
  caregiverId: string | null;
  atMs: number;
  payload: Record<string, unknown>;
}

/** Server-owned slice for 04B-3 wiring; brain JSON is opaque at this layer. */
export interface PetLivingAuthoritySnapshot {
  worldId: string;
  petId: string;
  livingVersion: number;
  serverNowMs: number;
  personalityJson: Record<string, unknown>;
  brainStateJson: Record<string, unknown> | null;
  activeAction: PetLivingActionInstance | null;
  pendingOffers: PetFoodOfferRow[];
  recentMemory: PetLivingMemoryEvent[];
  bowl: {
    version: number;
    foodPortions: number;
    foodSku: string | null;
    foodQuality: string | null;
    waterVolume: number;
  };
  pet: import('../pet/petTypes').PetSnapshot | null;
}