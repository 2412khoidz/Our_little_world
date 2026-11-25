import { PET_ANIMATION_SPECS, type PetAnimState } from '../petVisualTypes';
import type { PetBehaviorIntent } from './petLocomotionModel';

export interface PetActionAnimationSpec {
  readonly actionId: string;
  readonly labelVi: string;
  readonly travelIntent: 'move' | 'run';
  readonly approachIntent: 'sniff' | 'move' | 'sit';
  readonly performIntent: PetBehaviorIntent;
  readonly cautiousApproach: boolean;
  readonly performDurationMs: number;
  readonly loopsWhilePerforming: boolean;
  readonly fallbackNoteVi: string | null;
}

const DEFAULT_MS = 5000;

function spec(
  actionId: string,
  labelVi: string,
  performIntent: PetBehaviorIntent,
  overrides?: Partial<Omit<PetActionAnimationSpec, 'actionId' | 'labelVi' | 'performIntent'>>,
): PetActionAnimationSpec {
  return {
    actionId,
    labelVi,
    travelIntent: 'move',
    approachIntent: 'move',
    performIntent,
    cautiousApproach: false,
    performDurationMs: DEFAULT_MS,
    loopsWhilePerforming: true,
    fallbackNoteVi: null,
    ...overrides,
  };
}

/** Maps brain `actionId` → locomotion + animation intents (all three coat variants share tracks). */
export const PET_ACTION_ANIMATION_MAP: Readonly<Record<string, PetActionAnimationSpec>> = {
  eat_bowl: spec('eat_bowl', 'Ăn tại bát', 'eat', {
    performDurationMs: 4200,
    approachIntent: 'sniff',
    cautiousApproach: false,
    loopsWhilePerforming: true,
  }),
  drink_bowl: spec('drink_bowl', 'Uống nước', 'drink', { performDurationMs: 3800, approachIntent: 'sniff' }),
  sleep_cushion: spec('sleep_cushion', 'Ngủ đệm', 'sleep', {
    performDurationMs: 9000,
    approachIntent: 'sit',
    loopsWhilePerforming: true,
  }),
  nap_on_sofa: spec('nap_on_sofa', 'Nap sofa', 'lie', { performDurationMs: 7500 }),
  couple_sofa_cuddle: spec('couple_sofa_cuddle', 'Nằm sofa', 'pet_purr', { performDurationMs: 8000 }),
  study_companion: spec('study_companion', 'Ngồi cạnh bàn học', 'sit', {
    performDurationMs: 11000,
    approachIntent: 'sit',
  }),
  play_yarn: spec('play_yarn', 'Chơi len', 'play_pounce', {
    travelIntent: 'run',
    performDurationMs: 5500,
  }),
  chase_ball: spec('chase_ball', 'Đuổi bóng', 'play_pounce', { travelIntent: 'run', performDurationMs: 5500 }),
  hide_in_box: spec('hide_in_box', 'Trốn hộp', 'box_peek', { performDurationMs: 8000, approachIntent: 'sniff' }),
  scratch_stretch: spec('scratch_stretch', 'Cào & duỗi', 'groom', {
    performDurationMs: 4500,
    fallbackNoteVi: 'Dùng groom thay stretch chuyên biệt (asset chưa tách track).',
  }),
  sunbathe: spec('sunbathe', 'Phơi nắng', 'lie', { performDurationMs: 7000, approachIntent: 'sit' }),
  lie_idle: spec('lie_idle', 'Nằm nghỉ', 'lie', { performDurationMs: 6000 }),
  watch_window: spec('watch_window', 'Ngắm cửa sổ', 'sit', { performDurationMs: 7000 }),
  groom: spec('groom', 'Chải lông', 'groom', { performDurationMs: 5000, approachIntent: 'sit' }),
  sniff_flowers: spec('sniff_flowers', 'Ngửi hoa', 'sniff', { cautiousApproach: true, performDurationMs: 5000 }),
  watch_butterfly: spec('watch_butterfly', 'Đuổi bướm', 'happy_hop', { travelIntent: 'run' }),
  sit_garden_bench: spec('sit_garden_bench', 'Ngồi ghế vườn', 'sit', { performDurationMs: 6500 }),
  explore_area: spec('explore_area', 'Khám phá', 'sniff', {
    performDurationMs: 4500,
    cautiousApproach: true,
    fallbackNoteVi: 'Không có track explore riêng — dùng sniff.',
  }),
  attention_seek: spec('attention_seek', 'Đòi chú ý', 'happy_hop', { performDurationMs: 3500, loopsWhilePerforming: false }),
  refuse_food: spec('refuse_food', 'Từ chối món', 'refuse_shy', { performDurationMs: 2800, loopsWhilePerforming: false }),
};

export function getActionAnimationSpec(actionId: string): PetActionAnimationSpec {
  return (
    PET_ACTION_ANIMATION_MAP[actionId] ?? {
      actionId,
      labelVi: 'Hành vi chưa map',
      travelIntent: 'move',
      approachIntent: 'sniff',
      performIntent: 'sniff',
      cautiousApproach: true,
      performDurationMs: 4000,
      loopsWhilePerforming: true,
      fallbackNoteVi: 'Fallback sniff — chưa audit animation cho action này.',
    }
  );
}

/** Validates all map perform intents exist in Demo E animation registry. */
export function auditActionAnimationCoverage(): {
  covered: string[];
  missingAnimKeys: string[];
} {
  const animKeys = new Set(PET_ANIMATION_SPECS.map((s) => s.key));
  const covered: string[] = [];
  const missingAnimKeys: string[] = [];
  for (const row of Object.values(PET_ACTION_ANIMATION_MAP)) {
    covered.push(row.actionId);
    const intent = row.performIntent;
    if (!animKeys.has(behaviorIntentToAnimKey(intent))) {
      missingAnimKeys.push(`${row.actionId}:${intent}`);
    }
  }
  return { covered, missingAnimKeys };
}

function behaviorIntentToAnimKey(intent: PetBehaviorIntent): PetAnimState {
  if (intent === 'refuse_shy') return 'idle_south';
  if (intent === 'stretch') return 'wake_yawn_stretch';
  if (intent === 'lie') return 'lie_down';
  if (intent === 'sit') return 'sit_south';
  if (intent === 'move' || intent === 'run' || intent === 'idle') return 'idle_south';
  return intent;
}