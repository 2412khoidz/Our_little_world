/**
 * Mission 04B — integration contract (brain emits intents; server mutates state).
 * Pure types only; no RPC, inventory, or affection persistence here.
 */

export interface PetFoodOfferInput {
  readonly caregiverId: string;
  readonly sku: string;
  readonly quality: 'normal' | 'silver' | 'gold';
  readonly offerId: string;
}

/** Snapshot the authoritative layer should supply each tick. */
export interface PetBrainInputSnapshot {
  readonly nowMs: number;
  readonly seed: number;
  readonly caregiverIds: readonly [string, string];
  readonly needs: import('./petIntelligenceConfig').Pet8Needs;
  readonly traits: import('./petIntelligenceConfig').PetPersonalityTraits;
  readonly emotion: import('./petIntelligenceConfig').Pet9Emotion;
  readonly affordances: readonly import('./petPrimitivesAdapter').AffordanceCandidate[];
  readonly bowlFoodPortions: number;
  readonly waterBowlVolume: number;
  readonly environmental: {
    readonly isStudying: boolean;
    readonly partnersSittingSofa: boolean;
    readonly partnerJustArrived: boolean;
    readonly hasNewFurnitureId: string | null;
  };
  readonly foodOffer?: PetFoodOfferInput | null;
  readonly decisionCadenceMs?: number;
}

export type PetBrainPhase =
  | 'idle'
  | 'moving'
  | 'performing'
  | 'completing'
  | 'interrupted';

/** Selected action before/during execution — no consumption side effects. */
export interface PetActionIntent {
  readonly instanceId: string;
  readonly actionId: string;
  readonly targetId: string;
  readonly affordanceId: string;
  readonly score01: number;
  readonly reasonVi: string;
  readonly animationHint: string;
  readonly interruptible: boolean;
  readonly estimatedPerformMs: number;
  readonly estimatedTravelMs: number;
}

export interface PetActionCompletionEvent {
  readonly kind: 'completed' | 'failed' | 'cancelled' | 'interrupted';
  readonly instanceId: string;
  readonly intent: PetActionIntent;
  readonly atMs: number;
  /** Proposed only — authoritative layer confirms before applying. */
  readonly proposedNeedDeltas?: Readonly<Partial<import('./petIntelligenceConfig').Pet8Needs>>;
  readonly failureReasonVi?: string;
}

export interface PetFoodOfferIntent {
  readonly offerId: string;
  readonly caregiverId: string;
  readonly sku: string;
  readonly quality: 'normal' | 'silver' | 'gold';
  readonly reaction: import('./petFoodCatalog').FoodReactionKind;
  readonly accepted: boolean;
  readonly deferMs: number;
  readonly hintVi: string;
  readonly /** 04B: when true, server may debit item after validation. */ mayConsumeItem: boolean;
}

export interface PetMemoryWriteIntent {
  readonly id: string;
  readonly kind: string;
  readonly atMs: number;
  readonly caregiverId: string;
  readonly tags?: readonly string[];
}

export interface PetBrainDecisionOutput {
  readonly phase: PetBrainPhase;
  readonly currentIntent: PetActionIntent | null;
  readonly completions: readonly PetActionCompletionEvent[];
  readonly foodIntents: readonly PetFoodOfferIntent[];
  readonly memoryIntents: readonly PetMemoryWriteIntent[];
  readonly rejectedReasonVi: string | null;
}

/** Serializable brain blob for 04B persistence (JSON-safe). */
export interface PetBrainPersistedStateV1 {
  readonly version: 1;
  readonly phase: PetBrainPhase;
  readonly memoryJson: string;
  readonly selectionLogJson: string;
  readonly switchHistoryJson: string;
  readonly activeJson: string | null;
  readonly travelCompleteAtMs: number | null;
}

export interface PetBrainPersistedState {
  readonly version: 2;
  readonly phase: PetBrainPhase;
  readonly memoryJson: string;
  readonly selectionLogJson: string;
  readonly switchHistoryJson: string;
  readonly activeJson: string | null;
  readonly lastIntentJson: string | null;
  readonly travelCompleteAtMs: number | null;
  readonly performingStartedAtMs: number | null;
  readonly moveStartedAtMs: number | null;
  readonly instanceSeq: number;
  readonly lastDecisionAtMs: number;
  readonly completedInstanceIdsJson: string;
}