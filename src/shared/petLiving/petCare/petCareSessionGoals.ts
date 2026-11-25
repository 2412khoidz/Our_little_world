import type { PetCareActionKind } from './petCareTypes';

export type PetCareSessionGoalId =
  | 'stroke'
  | 'brush'
  | 'pour_water'
  | 'toy'
  | 'food'
  | 'call'
  | 'observe'
  | 'autonomy';

const GOAL_VI: Record<PetCareSessionGoalId, string> = {
  stroke: 'Vuốt ve',
  brush: 'Chải lông',
  pour_water: 'Cho uống nước',
  toy: 'Chơi đồ chơi',
  food: 'Cho ăn tay',
  call: 'Gọi bé',
  observe: 'Quan sát',
  autonomy: 'Bé tự chơi',
};

export function petCareActionToGoal(kind: PetCareActionKind): PetCareSessionGoalId | null {
  switch (kind) {
    case 'stroke':
      return 'stroke';
    case 'brush':
      return 'brush';
    case 'pour_water':
      return 'pour_water';
    case 'toy_yarn':
    case 'toy_box':
      return 'toy';
    case 'offer_food':
      return 'food';
    case 'call':
      return 'call';
    case 'observe':
      return 'observe';
    default:
      return null;
  }
}

export class PetCareSessionGoals {
  private readonly seen = new Set<PetCareSessionGoalId>();

  record(id: PetCareSessionGoalId): boolean {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    return true;
  }

  recordAction(kind: PetCareActionKind): PetCareSessionGoalId | null {
    const id = petCareActionToGoal(kind);
    if (!id) return null;
    return this.record(id) ? id : null;
  }

  get progress(): { count: number; total: number; labelsVi: string[] } {
    return {
      count: this.seen.size,
      total: Object.keys(GOAL_VI).length,
      labelsVi: [...this.seen].map((id) => GOAL_VI[id]),
    };
  }
}