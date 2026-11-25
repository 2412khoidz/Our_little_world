/**
 * Multi-donor care autonomy — memu-cat chase/sleep moods + Petivolution-style need urgency.
 * Maps to one `PhysicalCarePetState`; no parallel save.
 */
import type { PetAnimState } from '../petVisualTypes';
import {
  createInitialPhysicalCareState,
  resolvePetEat,
  type PhysicalCarePetState,
} from '../petPhysicalCare';

export type DonorCarePosture =
  | 'idle'
  | 'sleep'
  | 'chase_toy'
  | 'eating'
  | 'refuse_food'
  | 'petting';

export type CarePartnerId = 'partner-a' | 'partner-b';

export interface DonorPetAutonomyState {
  posture: DonorCarePosture;
  sleepUntilMs: number | null;
  chaseUntilMs: number | null;
  toyNorm: { x: number; y: number };
  lastPartner: CarePartnerId | null;
  simulatedSessionMs: number;
}

export function createDonorPetAutonomyState(): DonorPetAutonomyState {
  return {
    posture: 'idle',
    sleepUntilMs: null,
    chaseUntilMs: null,
    toyNorm: { x: 0.72, y: 0.55 },
    lastPartner: null,
    simulatedSessionMs: 0,
  };
}

export interface DonorAutonomyTickResult {
  physical: PhysicalCarePetState;
  autonomy: DonorPetAutonomyState;
  anim: PetAnimState;
  bubbleVi: string;
}

const TICK_MS_DEFAULT = 2000;

export function donorAutonomyTickMs(): number {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OLW_DONOR_CARE_FAST === '1') {
    return 400;
  }
  return TICK_MS_DEFAULT;
}

/** Needs decay + autonomous sleep / toy chase (inspired by memu-cat game loop). */
export function tickDonorPetAutonomy(
  physical: PhysicalCarePetState,
  autonomy: DonorPetAutonomyState,
  nowMs: number,
  dtMs: number,
): DonorAutonomyTickResult {
  const simDt = dtMs * (import.meta.env.VITE_OLW_DONOR_CARE_FAST === '1' ? 5 : 1);
  let nextPhysical: PhysicalCarePetState = {
    ...physical,
    hunger: Math.max(0, physical.hunger - simDt * 0.004),
    thirst: Math.max(0, physical.thirst - simDt * 0.003),
    fun: Math.max(0, physical.fun - simDt * 0.0025),
  };
  let nextAuto: DonorPetAutonomyState = {
    ...autonomy,
    simulatedSessionMs: autonomy.simulatedSessionMs + simDt,
  };
  let anim: PetAnimState = 'sit_south';
  let bubbleVi = '';

  const tired = nextPhysical.fun < 30 || nextPhysical.hunger < 25;
  const lonely = nextPhysical.fun < 32;

  if (nextAuto.sleepUntilMs && nowMs < nextAuto.sleepUntilMs) {
    nextAuto = { ...nextAuto, posture: 'sleep' };
    nextPhysical = { ...nextPhysical, isSleeping: true };
    anim = 'sleep';
    bubbleVi = 'Zzz…';
    return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
  }

  if (nextAuto.chaseUntilMs && nowMs < nextAuto.chaseUntilMs) {
    nextAuto = { ...nextAuto, posture: 'chase_toy' };
    anim = 'walk_south';
    bubbleVi = 'Đuổi cuộn len~';
    return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
  }

  nextPhysical = { ...nextPhysical, isSleeping: false };

  if (lonely && nextPhysical.foodBowl.portions === 0) {
    nextAuto = {
      ...nextAuto,
      posture: 'chase_toy',
      chaseUntilMs: nowMs + 6000,
    };
    anim = 'happy_hop';
    bubbleVi = 'Nhàm chơi quá!';
    return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
  }

  if (tired && nextAuto.posture !== 'petting') {
    nextAuto = {
      ...nextAuto,
      posture: 'sleep',
      sleepUntilMs: nowMs + 8000,
    };
    anim = 'sleep';
    bubbleVi = 'Bé buồn ngủ…';
    return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
  }

  if (nextPhysical.foodBowl.portions > 0 && nextPhysical.hunger < 50) {
    const eatRes = resolvePetEat(nextPhysical, 'bowl', nowMs);
    nextPhysical = eatRes.next;
    if (eatRes.ate) {
      nextAuto = { ...nextAuto, posture: 'eating' };
      anim = 'eat';
      bubbleVi = eatRes.hintVi;
    } else if (eatRes.reaction === 'turn_away' || eatRes.reaction === 'full_refuse') {
      nextAuto = { ...nextAuto, posture: 'refuse_food' };
      anim = 'sit_south';
      bubbleVi = eatRes.hintVi;
    }
    return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
  }

  nextAuto = { ...nextAuto, posture: 'idle', sleepUntilMs: null, chaseUntilMs: null };
  anim = nextPhysical.isSleeping ? 'sleep' : 'sit_south';
  return { physical: nextPhysical, autonomy: nextAuto, anim, bubbleVi };
}

/** Hand-feed with shared refuse semantics (two caregivers, one cat). */
export function donorHandFeedCat(
  physical: PhysicalCarePetState,
  sku: string,
  quality: 'normal' | 'silver' | 'gold',
  partner: CarePartnerId,
  nowMs: number,
): {
  physical: PhysicalCarePetState;
  autonomy: DonorPetAutonomyState;
  anim: PetAnimState;
  bubbleVi: string;
} {
  const autonomy = createDonorPetAutonomyState();
  const res = resolvePetEat(physical, { sku, quality }, nowMs);
  const anim: PetAnimState = res.ate ? 'eat' : res.reaction === 'turn_away' ? 'sit_south' : 'happy_hop';
  return {
    physical: res.next,
    autonomy: { ...autonomy, lastPartner: partner, posture: res.ate ? 'eating' : 'refuse_food' },
    anim,
    bubbleVi: res.hintVi,
  };
}

export function donorCarePhysicalSeed(): PhysicalCarePetState {
  const base = createInitialPhysicalCareState();
  return {
    ...base,
    hunger: 74,
    fun: 58,
    foodBowl: { foodSku: 'pet_kibble_basic', foodQuality: 'normal', portions: 1 },
  };
}