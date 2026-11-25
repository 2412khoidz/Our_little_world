import {
  isActionFinished,
  isRepeatSuppressed,
  noteSelection,
  noteSwitch,
  shouldInterrupt,
  type ActiveAction,
  type SelectionLogState,
  type SwitchHistoryState,
} from '../petAdvanced/primitives/stabilization';
import {
  PET_BRAIN_STABILIZATION,
  createDefaultBrainAux,
} from './petBrainConfig';
import type {
  PetActionCompletionEvent,
  PetActionIntent,
  PetBrainDecisionOutput,
  PetBrainInputSnapshot,
  PetBrainPhase,
  PetBrainPersistedState,
} from './petBrainContract04B';
import {
  DEFAULT_PET_AFFORDANCE_BLUEPRINTS,
  derive9Emotion,
  scoreAffordanceAction,
  type ActionScoreBreakdown,
  type DecisionContext,
} from './petIntelligenceConfig';
import {
  PET_MEMORY_PERSIST_CAP,
  appendBoundedMemory,
  createMemoryState,
  deserializeMemory,
  deterministicCandidateBreak,
  filterValidAffordances,
  serializeMemory,
  type AffordanceCandidate,
  type MemoryState,
  type PetMemoryEvent,
} from './petPrimitivesAdapter';

export interface PetBrainAux {
  selectionLog: SelectionLogState;
  switchHistory: SwitchHistoryState;
}

export interface PetBrainState {
  phase: PetBrainPhase;
  memory: MemoryState;
  active: ActiveAction | null;
  travelCompleteAtMs: number | null;
  aux: PetBrainAux;
  lastIntent: PetActionIntent | null;
  lastSwitchReasonVi: string;
  utilityTrace: readonly ActionScoreBreakdown[];
}

export interface PetDecisionStepResult {
  chosen: ActionScoreBreakdown | null;
  candidates: ActionScoreBreakdown[];
  emotion: ReturnType<typeof derive9Emotion>;
  switchReason: string;
  aux: PetBrainAux;
}

export function createPetBrainState(seedMemory?: MemoryState): PetBrainState {
  return {
    phase: 'idle',
    memory: seedMemory ?? createMemoryState(PET_MEMORY_PERSIST_CAP),
    active: null,
    travelCompleteAtMs: null,
    aux: createDefaultBrainAux(),
    lastIntent: null,
    lastSwitchReasonVi: 'Khởi tạo',
    utilityTrace: [],
  };
}

function blueprintFor(targetId: string, actionId: string) {
  return (
    DEFAULT_PET_AFFORDANCE_BLUEPRINTS.find(
      (b) => b.affordanceId === targetId || b.supportedActions.includes(actionId),
    ) ?? DEFAULT_PET_AFFORDANCE_BLUEPRINTS[0]!
  );
}

function toIntent(row: ActionScoreBreakdown): PetActionIntent {
  const bp = blueprintFor(row.targetId, row.action);
  return {
    actionId: row.action,
    targetId: row.targetId,
    affordanceId: row.affordance.id,
    score01: row.score01,
    reasonVi: row.reasonVi,
    animationHint: row.action,
    interruptible: bp.interruptible,
    estimatedDurationMs: Math.max(bp.minCommitmentMs, row.affordance.estimatedCostMs),
  };
}

function travelMs(affordance: AffordanceCandidate): number {
  return Math.min(2800, Math.max(400, Math.round(affordance.distance * 18)));
}

export function decidePetAction(
  ctx: DecisionContext,
  affordances: readonly AffordanceCandidate[],
  active: ActiveAction | null,
  aux: PetBrainAux,
): PetDecisionStepResult {
  const emotion = derive9Emotion(ctx.needs, ctx.traits);
  const eligible = filterValidAffordances(affordances, ctx.nowMs);
  const scored = eligible.map((c) => scoreAffordanceAction(c, { ...ctx, emotion }));
  const ranked = deterministicCandidateBreak(
    scored,
    (s) => s.score01,
    (s) => `${s.action}:${s.targetId}`,
  );
  const top = ranked.find((r) => r.score01 > 0.02) ?? ranked[0] ?? null;

  if (!top) {
    return {
      chosen: null,
      candidates: ranked,
      emotion,
      switchReason: 'Không có đích hợp lệ — giữ idle an toàn',
      aux,
    };
  }

  const repeatMs = (actionId: string): number =>
    actionId === 'hide_in_box' ? 34_000 : PET_BRAIN_STABILIZATION.minRepeatCooldownMs;

  const pickTop = (): ActionScoreBreakdown | null => {
    for (const row of ranked) {
      if (row.score01 <= 0.02) continue;
      if (isRepeatSuppressed(aux.selectionLog, row.action, ctx.nowMs, repeatMs(row.action))) {
        continue;
      }
      return row;
    }
    return ranked[0] ?? null;
  };

  const candidate = pickTop();
  if (!candidate) {
    return {
      chosen: null,
      candidates: ranked,
      emotion,
      switchReason: 'Cooldown chống lặp — chờ hành động khác',
      aux,
    };
  }

  if (active) {
    const held =
      ranked.find(
        (r) =>
          r.action === active.actionId &&
          (active.targetId === null || r.targetId === active.targetId),
      ) ?? null;
  const currentInvalid = held === null || (held?.score01 ?? 0) <= 0.02;
    if (
      held &&
      !shouldInterrupt({
        current: active,
        candidate: {
          actionId: candidate.action,
          targetId: candidate.targetId,
          score01: candidate.score01,
        },
        nowMs: ctx.nowMs,
        config: PET_BRAIN_STABILIZATION,
        history: aux.switchHistory,
        currentInvalid,
      })
    ) {
      return {
        chosen: held,
        candidates: ranked,
        emotion,
        switchReason: 'Giữ commitment / hysteresis — không giật',
        aux,
      };
    }
  }

  let nextAux = aux;
  if (active && active.actionId !== candidate.action) {
    nextAux = {
      ...aux,
      switchHistory: noteSwitch(
        aux.switchHistory,
        { actionId: candidate.action, targetId: candidate.targetId, atMs: ctx.nowMs },
        { switchWindowMs: PET_BRAIN_STABILIZATION.switchWindowMs },
      ),
      selectionLog: noteSelection(aux.selectionLog, candidate.action, ctx.nowMs),
    };
  } else if (!active) {
    nextAux = {
      ...aux,
      selectionLog: noteSelection(aux.selectionLog, candidate.action, ctx.nowMs),
    };
  }

  return {
    chosen: candidate,
    candidates: ranked,
    emotion,
    switchReason: candidate.reasonVi,
    aux: nextAux,
  };
}

/** Single-step evaluation used by Pet Lab UI (legacy name). */
export function evaluateLivingPetStep(
  ctx: DecisionContext,
  affordances: readonly AffordanceCandidate[],
  currentAction: { action: string; score01: number; commitmentUntilMs: number } | null,
): PetDecisionStepResult & { emotion: ReturnType<typeof derive9Emotion> } {
  const active: ActiveAction | null = currentAction
    ? {
        actionId: currentAction.action,
        targetId: null,
        startedAtMs: currentAction.commitmentUntilMs - 8000,
        durationMs: 8000,
        score01: currentAction.score01,
        interruptible: true,
      }
    : null;
  const brain = createPetBrainState();
  const res = decidePetAction(ctx, affordances, active, brain.aux);
  return { ...res, emotion: res.emotion };
}

export function tickPetBrain(
  brain: PetBrainState,
  input: PetBrainInputSnapshot,
): { state: PetBrainState; output: PetBrainDecisionOutput } {
  const ctx: DecisionContext = {
    needs: input.needs,
    traits: input.traits,
    emotion: input.emotion,
    bowlFoodPortions: input.bowlFoodPortions,
    waterBowlVolume: input.waterBowlVolume,
    isStudying: input.environmental.isStudying,
    partnersSittingSofa: input.environmental.partnersSittingSofa,
    partnerJustArrived: input.environmental.partnerJustArrived,
    hasNewFurnitureId: input.environmental.hasNewFurnitureId,
    nowMs: input.nowMs,
  };

  const completions: PetActionCompletionEvent[] = [];
  let phase = brain.phase;
  let active = brain.active;
  let travelCompleteAtMs = brain.travelCompleteAtMs;
  let aux = brain.aux;
  let lastIntent = brain.lastIntent;
  let memory = brain.memory;
  let switchReason = brain.lastSwitchReasonVi;
  let utilityTrace = brain.utilityTrace;

  if (active && phase === 'moving' && travelCompleteAtMs !== null && input.nowMs >= travelCompleteAtMs) {
    phase = 'performing';
  }

  if (active && phase === 'performing' && isActionFinished(active, input.nowMs)) {
    phase = 'completing';
  }

  if (phase === 'completing' && lastIntent) {
    completions.push({
      kind: 'completed',
      intent: lastIntent,
      atMs: input.nowMs,
    });
    const memEvent: PetMemoryEvent = {
      id: `mem-${input.nowMs}-${lastIntent.actionId}`,
      kind:
        lastIntent.actionId === 'eat_bowl'
          ? 'fed'
          : lastIntent.actionId === 'play_yarn' || lastIntent.actionId === 'chase_ball'
            ? 'played'
            : lastIntent.actionId === 'sleep_cushion'
              ? 'slept'
              : 'explored',
      atMs: input.nowMs,
      caregiverId: input.caregiverIds[0] ?? null,
    };
    memory = {
      ...memory,
      events: appendBoundedMemory(memory.events, memEvent, memory.capacity),
    };
    active = null;
    travelCompleteAtMs = null;
    lastIntent = null;
    phase = 'idle';
    switchReason = 'Hoàn thành hành động';
  }

  if (phase === 'idle') {
    const decision = decidePetAction(ctx, input.affordances, active, aux);
    aux = decision.aux;
    utilityTrace = decision.candidates;
    switchReason = decision.switchReason;

    if (decision.chosen) {
      const intent = toIntent(decision.chosen);
      const bp = blueprintFor(intent.targetId, intent.actionId);
      const tMs = travelMs(decision.chosen.affordance);
      active = {
        actionId: intent.actionId,
        targetId: intent.targetId,
        startedAtMs: input.nowMs,
        durationMs: intent.estimatedDurationMs,
        score01: intent.score01,
        interruptible: bp.interruptible,
      };
      lastIntent = intent;
      travelCompleteAtMs = input.nowMs + tMs;
      phase = tMs > 0 ? 'moving' : 'performing';
    }
  }

  const output: PetBrainDecisionOutput = {
    phase,
    currentIntent: lastIntent,
    completions,
    foodIntents: [],
    memoryIntents: [],
    rejectedReasonVi: phase === 'idle' && !lastIntent ? switchReason : null,
  };

  return {
    state: {
      ...brain,
      phase,
      active,
      travelCompleteAtMs,
      aux,
      lastIntent,
      memory,
      lastSwitchReasonVi: switchReason,
      utilityTrace,
    },
    output,
  };
}

export function snapshotToInput(
  ctx: DecisionContext,
  affordances: readonly AffordanceCandidate[],
  caregiverIds: readonly [string, string] = ['player-1', 'player-2'],
): PetBrainInputSnapshot {
  return {
    nowMs: ctx.nowMs,
    seed: 0,
    caregiverIds,
    needs: ctx.needs,
    traits: ctx.traits,
    emotion: derive9Emotion(ctx.needs, ctx.traits),
    affordances,
    bowlFoodPortions: ctx.bowlFoodPortions,
    waterBowlVolume: ctx.waterBowlVolume,
    environmental: {
      isStudying: ctx.isStudying,
      partnersSittingSofa: ctx.partnersSittingSofa,
      partnerJustArrived: ctx.partnerJustArrived,
      hasNewFurnitureId: ctx.hasNewFurnitureId,
    },
  };
}

export function serializePetBrain(state: PetBrainState): PetBrainPersistedState {
  return {
    version: 1,
    phase: state.phase,
    memoryJson: serializeMemory(state.memory),
    selectionLogJson: JSON.stringify(state.aux.selectionLog),
    switchHistoryJson: JSON.stringify(state.aux.switchHistory),
    activeJson: state.active ? JSON.stringify(state.active) : null,
    travelCompleteAtMs: state.travelCompleteAtMs,
  };
}

export function deserializePetBrain(blob: PetBrainPersistedState): PetBrainState {
  const base = createPetBrainState(deserializeMemory(JSON.parse(blob.memoryJson)));
  return {
    ...base,
    phase: blob.phase,
    active: blob.activeJson ? (JSON.parse(blob.activeJson) as ActiveAction) : null,
    travelCompleteAtMs: blob.travelCompleteAtMs,
    aux: {
      selectionLog: JSON.parse(blob.selectionLogJson) as SelectionLogState,
      switchHistory: JSON.parse(blob.switchHistoryJson) as SwitchHistoryState,
    },
  };
}

export interface PetBrainDebugTrace {
  phase: PetBrainPhase;
  switchReasonVi: string;
  currentIntent: PetActionIntent | null;
  active: ActiveAction | null;
  travelCompleteAtMs: number | null;
  topUtility: readonly { action: string; targetId: string; score01: number; reasonVi: string }[];
  memoryCount: number;
  selectionCount: number;
}

export function buildBrainDebugTrace(state: PetBrainState): PetBrainDebugTrace {
  return {
    phase: state.phase,
    switchReasonVi: state.lastSwitchReasonVi,
    currentIntent: state.lastIntent,
    active: state.active,
    travelCompleteAtMs: state.travelCompleteAtMs,
    topUtility: state.utilityTrace.slice(0, 6).map((row) => ({
      action: row.action,
      targetId: row.targetId,
      score01: row.score01,
      reasonVi: row.reasonVi,
    })),
    memoryCount: state.memory.events.length,
    selectionCount: state.aux.selectionLog.entries.length,
  };
}