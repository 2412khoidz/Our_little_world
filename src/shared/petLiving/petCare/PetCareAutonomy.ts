import type { PetCareActionKind } from './petCareTypes';
import type { PetCareMoodState } from './petCareMood';

export type PetCareAutonomyCue =
  | { kind: 'proactive'; action: PetCareActionKind; bubbleVi: string }
  | { kind: 'idle' };

export class PetCareAutonomy {
  private nextTickAt = 0;
  private idleRolls = 0;

  constructor(private mood: PetCareMoodState) {}

  setMood(mood: PetCareMoodState): void {
    this.mood = mood;
  }

  tick(nowMs: number, playerQuietMs: number): PetCareAutonomyCue {
    if (nowMs < this.nextTickAt) return { kind: 'idle' };
    const fast =
      typeof window !== 'undefined' &&
      (window as unknown as { __OLW_PET_CARE_FAST?: boolean }).__OLW_PET_CARE_FAST === true;
    this.nextTickAt = nowMs + (fast ? 1800 : 4500) + Math.random() * (fast ? 2200 : 5500);

    if (playerQuietMs < 3500) return { kind: 'idle' };

    this.idleRolls += 1;
    const roll = Math.random();
    if (roll > this.mood.proactiveChance && this.idleRolls < 3) return { kind: 'idle' };

    if (this.mood.label === 'sleepy' && roll < 0.55) {
      return { kind: 'proactive', action: 'observe', bubbleVi: 'Zzz… tự ngủ một chút' };
    }
    if (this.mood.label === 'affectionate' && roll < 0.32) {
      return { kind: 'proactive', action: 'pour_water', bubbleVi: 'Khát nước quá~' };
    }
    if (this.mood.label === 'hungry' && roll < 0.4) {
      return { kind: 'proactive', action: 'call', bubbleVi: 'Meo meo… có món không?' };
    }
    if (this.mood.label === 'playful' && roll < 0.5) {
      return { kind: 'proactive', action: 'toy_yarn', bubbleVi: 'Đuổi theo nào!' };
    }
    if (roll < 0.35) {
      return { kind: 'proactive', action: 'brush', bubbleVi: '*tự liếm lông*' };
    }
    return { kind: 'proactive', action: 'call', bubbleVi: '…nhìn bạn đấy' };
  }
}