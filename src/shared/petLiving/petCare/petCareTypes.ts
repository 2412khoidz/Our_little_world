import type { PetAnimState } from '../petVisualTypes';
import type { PetPersonalityTraits } from '../petIntelligenceConfig';

export type PetCareZone = 'head' | 'chin' | 'back' | 'belly' | 'none';

export type PetCareActionKind =
  | 'stroke'
  | 'toy_yarn'
  | 'toy_box'
  | 'offer_food'
  | 'brush'
  | 'call'
  | 'observe';

export interface PetCareStrokeInput {
  kind: 'stroke';
  zone: PetCareZone;
  strokeIndex: number;
}

export interface PetCareHeldInput {
  kind: 'toy_yarn' | 'toy_box' | 'offer_food' | 'brush';
  sku: string;
}

export interface PetCareCallInput {
  kind: 'call';
  petName: string;
}

export type PetCareInput = PetCareStrokeInput | PetCareHeldInput | PetCareCallInput;

export type PetCareTailMode = 'idle' | 'wag_fast' | 'wag_slow' | 'puff' | 'tuck';

export interface PetCareExpression {
  anim: PetAnimState;
  bubbleVi: string;
  earTilt: number;
  tail: PetCareTailMode;
  eyeMood: 'open' | 'blink' | 'happy' | 'sleep' | 'shy';
  squeak?: 'purr' | 'mrow' | 'chirp' | 'refuse';
  refuse?: boolean;
}

export interface PetCareReactionContext {
  traits: PetPersonalityTraits;
  petName: string;
  shyRefuseRoll?: number;
}