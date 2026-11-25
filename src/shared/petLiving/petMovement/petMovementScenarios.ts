import { TILE_SIZE } from '../../maps';
import type { PetActionIntent } from '../petBrainContract04B';
import {
  anchorToWorldTarget,
  findNavAnchor,
  type PetNavAnchor,
} from './petHomeNavLayout';
import {
  createPetMovementExecutorState,
  tickPetMovement,
  type PetMovementExecutorState,
} from './petMovementExecutor';
import type { PetMovementCompletionProposal, PetMovementWorldTarget } from './petMovementContract';

export interface PetMovementScenarioResult {
  id: string;
  labelVi: string;
  durationMs: number;
  tickCount: number;
  transitions: string[];
  proposals: PetMovementCompletionProposal[];
  finalStatus: string;
  finalPosition: { x: number; y: number };
  pathSamples: { atMs: number; x: number; y: number }[];
}

function intent(
  instanceId: string,
  actionId: string,
  targetId: string,
  performMs: number,
): PetActionIntent {
  return {
    instanceId,
    actionId,
    targetId,
    affordanceId: targetId,
    score01: 0.85,
    reasonVi: 'scenario',
    animationHint: actionId,
    interruptible: true,
    estimatedPerformMs: performMs,
    estimatedTravelMs: 2500,
  };
}

function targetsFrom(...ids: string[]): PetMovementWorldTarget[] {
  return ids
    .map((id) => {
      const a = findNavAnchor(id);
      return a ? anchorToWorldTarget(a) : null;
    })
    .filter((x): x is PetMovementWorldTarget => x !== null);
}

export function runPetMovementScenario(params: {
  id: string;
  labelVi: string;
  durationMs: number;
  stepMs: number;
  setup: (state: PetMovementExecutorState) => PetMovementExecutorState;
  getIntent: (nowMs: number, state: PetMovementExecutorState) => PetActionIntent | null;
  getTargets: (nowMs: number) => PetMovementWorldTarget[];
}): PetMovementScenarioResult {
  let state = createPetMovementExecutorState(8 * TILE_SIZE, 9 * TILE_SIZE);
  state = params.setup(state);
  const transitions: string[] = [];
  const proposals: PetMovementCompletionProposal[] = [];
  const pathSamples: { atMs: number; x: number; y: number }[] = [];
  let lastStatus = state.status;
  const steps = Math.max(1, Math.floor(params.durationMs / params.stepMs));
  for (let i = 0; i < steps; i += 1) {
    const nowMs = i * params.stepMs;
    const out = tickPetMovement(state, {
      nowMs,
      dtMs: params.stepMs,
      intent: params.getIntent(nowMs, state),
      interrupt: false,
      targets: params.getTargets(nowMs),
    });
    state = out.state;
    proposals.push(...out.output.proposals);
    if (out.output.snapshot.status !== lastStatus) {
      transitions.push(`${nowMs}:${lastStatus}->${out.output.snapshot.status}:${out.output.snapshot.actionId ?? 'none'}`);
      lastStatus = out.output.snapshot.status;
    }
    if (i % 4 === 0) {
      pathSamples.push({ atMs: nowMs, x: out.output.snapshot.positionX, y: out.output.snapshot.positionY });
    }
  }
  return {
    id: params.id,
    labelVi: params.labelVi,
    durationMs: params.durationMs,
    tickCount: steps,
    transitions,
    proposals,
    finalStatus: lastStatus,
    finalPosition: { x: state.loco.x, y: state.loco.y },
    pathSamples,
  };
}

export const PET_MOVEMENT_ACCEPTANCE_SCENARIOS = {
  hungryAroundFurniture: () =>
    runPetMovementScenario({
      id: 'hungry-path-to-bowl',
      labelVi: 'Mèo đói đi vòng qua nội thất tới bát',
      durationMs: 22_000,
      stepMs: 100,
      setup: (s) => s,
      getIntent: (nowMs) => (nowMs < 18_000 ? intent('mv-hungry', 'eat_bowl', 'food_bowl', 4000) : null),
      getTargets: () => targetsFrom('food_bowl', 'water_bowl', 'pet_bed', 'sofa', 'study_desk'),
    }),

  targetRelocated: () =>
    runPetMovementScenario({
      id: 'target-moved-bed',
      labelVi: 'Mèo đang đi — giường bị dời',
      durationMs: 16_000,
      stepMs: 100,
      setup: (s) => s,
      getIntent: (nowMs) => (nowMs < 14_000 ? intent('mv-move', 'sleep_cushion', 'pet_bed', 9000) : null),
      getTargets: (nowMs) => {
        const bed = findNavAnchor('pet_bed')!;
        const moved: PetNavAnchor =
          nowMs >= 6000
            ? {
                ...bed,
                anchorPixelX: bed.anchorPixelX + 32,
                anchorPixelY: bed.anchorPixelY,
              }
            : bed;
        const reachable = nowMs < 9000;
        return [anchorToWorldTarget(moved, reachable, reachable), ...targetsFrom('food_bowl')];
      },
    }),

  sleepNatural: () =>
    runPetMovementScenario({
      id: 'sleep-natural',
      labelVi: 'Đi ngủ và chuyển animation',
      durationMs: 28_000,
      stepMs: 100,
      setup: (s) => s,
      getIntent: (nowMs) => (nowMs < 26_000 ? intent('mv-sleep', 'sleep_cushion', 'pet_bed', 9000) : null),
      getTargets: () => targetsFrom('pet_bed'),
    }),

  blockedPath: () =>
    runPetMovementScenario({
      id: 'blocked-window',
      labelVi: 'Vật cản — cửa sổ khó tới',
      durationMs: 8_000,
      stepMs: 100,
      setup: (s) => {
        const blocked = new Set(s.blocked);
        for (let y = 3; y <= 8; y += 1) blocked.add(`2,${y}`);
        return { ...s, blocked };
      },
      getIntent: () => intent('mv-block', 'sunbathe', 'sunny_window', 7000),
      getTargets: () => targetsFrom('sunny_window'),
    }),

  playThenRest: () =>
    runPetMovementScenario({
      id: 'play-then-rest',
      labelVi: 'Chơi len rồi nghỉ',
      durationMs: 35_000,
      stepMs: 100,
      setup: (s) => s,
      getIntent: (nowMs) => {
        if (nowMs < 14_000) return intent('mv-play', 'play_yarn', 'yarn_ball', 5500);
        if (nowMs >= 16_000 && nowMs < 32_000) return intent('mv-rest', 'lie_idle', 'rug', 6000);
        return null;
      },
      getTargets: () => targetsFrom('yarn_ball', 'rug'),
    }),

  shyNewObject: () =>
    runPetMovementScenario({
      id: 'shy-box',
      labelVi: 'Nhút nhát tiếp cận hộp mới',
      durationMs: 18_000,
      stepMs: 100,
      setup: (s) => s,
      getIntent: (nowMs) => (nowMs < 16_000 ? intent('mv-shy', 'hide_in_box', 'cardboard_box', 8000) : null),
      getTargets: () => targetsFrom('cardboard_box'),
    }),
} as const;