import {
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
  PetBrainPersistedStateV1,
  PetFoodOfferIntent,
} from './petBrainContract04B';
import { decideFoodOffer } from './petFoodIntent';
import {
  DEFAULT_PET_AFFORDANCE_BLUEPRINTS,
  derive9Emotion,
  scoreAffordanceAction,
  type ActionScoreBreakdown,
  type DecisionContext,
} from './petIntelligenceConfig';
import {
  PET_MEMORY_PERSIST_CAP,
  createMemoryState,
  deserializeMemory,
  deterministicCandidateBreak,
  filterValidAffordances,
  serializeMemory,
  type AffordanceCandidate,
  type MemoryState,
} from './petPrimitivesAdapter';

export const PET_BRAIN_DECISION_CADENCE_MS = 2000;

export interface PetBrainAux {
  selectionLog: SelectionLogState;
  switchHistory: SwitchHistoryState;
}

export interface PetBrainState {
  phase: PetBrainPhase;
  memory: MemoryState;
  active: ActiveAction | null;
  lastIntent: PetActionIntent | null;
  travelCompleteAtMs: number | null;
  performingStartedAtMs: number | null;
  moveStartedAtMs: number | null;
  instanceSeq: number;
  lastDecisionAtMs: number;
  completedInstanceIds: Set<string>;
  aux: PetBrainAux;
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
    lastIntent: null,
    travelCompleteAtMs: null,
    performingStartedAtMs: null,
    moveStartedAtMs: null,
    instanceSeq: 0,
    lastDecisionAtMs: 0,
    completedInstanceIds: new Set(),
    aux: createDefaultBrainAux(),
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

function travelMs(affordance: AffordanceCandidate): number {
  return Math.min(2800, Math.max(400, Math.round(affordance.distance * 18)));
}

function instanceKey(actionId: string, targetId: string): string {
  return `${actionId}@${targetId}`;
}

function nextInstanceId(seq: number, nowMs: number): string {
  return `pa-${nowMs}-${seq}`;
}

function toIntent(row: ActionScoreBreakdown, instanceId: string): PetActionIntent {
  const bp = blueprintFor(row.targetId, row.action);
  const performMs = Math.max(bp.minCommitmentMs, row.affordance.estimatedCostMs);
  const travel = travelMs(row.affordance);
  return {
    instanceId,
    actionId: row.action,
    targetId: row.targetId,
    affordanceId: row.affordance.id,
    score01: row.score01,
    reasonVi: row.reasonVi,
    animationHint: row.action,
    interruptible: bp.interruptible,
    estimatedPerformMs: performMs,
    estimatedTravelMs: travel,
  };
}

function isTargetValid(
  intent: PetActionIntent,
  affordances: readonly AffordanceCandidate[],
  nowMs: number,
): boolean {
  const match = affordances.find(
    (a) => a.targetId === intent.targetId && a.action === intent.actionId,
  );
  if (!match) return false;
  const eligible = filterValidAffordances([match], nowMs);
  return eligible.length > 0;
}

function performingFinished(state: PetBrainState, nowMs: number): boolean {
  if (state.phase !== 'performing' || state.performingStartedAtMs === null || !state.active) {
    return false;
  }
  const end = state.performingStartedAtMs + state.active.durationMs;
  return nowMs >= end;
}

function resetActive(state: PetBrainState): PetBrainState {
  return {
    ...state,
    phase: 'idle',
    active: null,
    lastIntent: null,
    travelCompleteAtMs: null,
    performingStartedAtMs: null,
    moveStartedAtMs: null,
  };
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

  const repeatMs = (actionId: string): number =>
    actionId === 'hide_in_box' ? 34_000 : PET_BRAIN_STABILIZATION.minRepeatCooldownMs;

  const pickTop = (): ActionScoreBreakdown | null => {
    for (const row of ranked) {
      if (row.score01 <= 0.02) continue;
      const key = instanceKey(row.action, row.targetId);
      if (isRepeatSuppressed(aux.selectionLog, key, ctx.nowMs, repeatMs(row.action))) {
        continue;
      }
      return row;
    }
    return null;
  };

  const candidate = pickTop();
  if (!candidate) {
    return {
      chosen: null,
      candidates: ranked,
      emotion,
      switchReason:
        ranked.length === 0
          ? 'Không có đích hợp lệ — giữ idle an toàn'
          : 'Cooldown chống lặp — giữ idle an toàn',
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
  const candidateKey = instanceKey(candidate.action, candidate.targetId);
  if (active && active.actionId !== candidate.action) {
    nextAux = {
      ...aux,
      switchHistory: noteSwitch(
        aux.switchHistory,
        { actionId: candidateKey, targetId: candidate.targetId, atMs: ctx.nowMs },
        { switchWindowMs: PET_BRAIN_STABILIZATION.switchWindowMs },
      ),
      selectionLog: noteSelection(aux.selectionLog, candidateKey, ctx.nowMs),
    };
  } else if (!active) {
    nextAux = {
      ...aux,
      selectionLog: noteSelection(aux.selectionLog, candidateKey, ctx.nowMs),
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

function beginAction(
  brain: PetBrainState,
  chosen: ActionScoreBreakdown,
  nowMs: number,
): PetBrainState {
  const instanceSeq = brain.instanceSeq + 1;
  const instanceId = nextInstanceId(instanceSeq, nowMs);
  const intent = toIntent(chosen, instanceId);
  const bp = blueprintFor(intent.targetId, intent.actionId);
  const tMs = intent.estimatedTravelMs;
  const active: ActiveAction = {
    actionId: intent.actionId,
    targetId: intent.targetId,
    startedAtMs: nowMs,
    durationMs: intent.estimatedPerformMs,
    score01: intent.score01,
    interruptible: bp.interruptible,
  };
  return {
    ...brain,
    instanceSeq,
    lastIntent: intent,
    active,
    moveStartedAtMs: nowMs,
    performingStartedAtMs: tMs > 0 ? null : nowMs,
    travelCompleteAtMs: tMs > 0 ? nowMs + tMs : null,
    phase: tMs > 0 ? 'moving' : 'performing',
    lastSwitchReasonVi: intent.reasonVi,
    utilityTrace: brain.utilityTrace,
  };
}

function pushCompletion(
  list: PetActionCompletionEvent[],
  kind: PetActionCompletionEvent['kind'],
  intent: PetActionIntent,
  atMs: number,
  failureReasonVi?: string,
): void {
  const base = {
    kind,
    instanceId: intent.instanceId,
    intent,
    atMs,
  } satisfies Omit<PetActionCompletionEvent, 'proposedNeedDeltas' | 'failureReasonVi'>;
  if (kind === 'completed') {
    list.push({
      ...base,
      proposedNeedDeltas: proposedDeltasForAction(intent.actionId),
    } as PetActionCompletionEvent);
    return;
  }
  list.push({
    ...base,
    failureReasonVi,
  } as PetActionCompletionEvent);
}

function proposedDeltasForAction(
  actionId: string,
): Partial<import('./petIntelligenceConfig').Pet8Needs> | undefined {
  switch (actionId) {
    case 'eat_bowl':
      return { hunger: 22 };
    case 'drink_bowl':
      return { thirst: 22 };
    case 'sleep_cushion':
    case 'nap_on_sofa':
    case 'sunbathe':
      return { energy: 12 };
    default:
      return undefined;
  }
}

function handleFoodOffer(
  brain: PetBrainState,
  input: PetBrainInputSnapshot,
  ctx: DecisionContext,
): { brain: PetBrainState; foodIntents: PetFoodOfferIntent[] } {
  const offer = input.foodOffer;
  if (!offer) return { brain, foodIntents: [] };

  const decision = decideFoodOffer(offer.sku, offer.quality, ctx.needs.hunger, {
    traits: ctx.traits,
    emotion: ctx.emotion,
    currentCommitmentAction: brain.lastIntent?.actionId ?? null,
    favoriteSkus: [],
    dislikedSkus: offer.sku === 'disliked_probe' ? [offer.sku] : [],
    familiarSkus: ['pet_kibble_basic'],
    lastFedAtMs: null,
    nowMs: input.nowMs,
  });

  const foodIntent: PetFoodOfferIntent = {
    offerId: offer.offerId,
    caregiverId: offer.caregiverId,
    sku: offer.sku,
    quality: offer.quality,
    reaction: decision.reaction,
    accepted: decision.accepted && !decision.deferred,
    deferMs: decision.deferred ? 3000 : 0,
    hintVi: decision.hintVi,
    mayConsumeItem: decision.accepted && decision.consumeItem && !decision.deferred,
  };

  return { brain, foodIntents: [foodIntent] };
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
  const cadence = input.decisionCadenceMs ?? PET_BRAIN_DECISION_CADENCE_MS;
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
  let state = brain;
  let switchReason = state.lastSwitchReasonVi;

  const { foodIntents } = handleFoodOffer(state, input, ctx);

  if (
    state.lastIntent &&
    (state.phase === 'moving' || state.phase === 'performing') &&
    !isTargetValid(state.lastIntent, input.affordances, input.nowMs)
  ) {
    pushCompletion(completions, 'cancelled', state.lastIntent, input.nowMs, 'Đích không còn khả dụng');
    state = resetActive(state);
    switchReason = 'Hủy vì đích biến mất / không tới được';
  }

  if (
    state.phase === 'moving' &&
    state.travelCompleteAtMs !== null &&
    input.nowMs >= state.travelCompleteAtMs &&
    state.lastIntent &&
    isTargetValid(state.lastIntent, input.affordances, input.nowMs)
  ) {
    state = {
      ...state,
      phase: 'performing',
      performingStartedAtMs: input.nowMs,
      active: state.active
        ? { ...state.active, startedAtMs: input.nowMs }
        : state.active,
    };
  }

  const shouldDecide =
    input.nowMs - state.lastDecisionAtMs >= cadence ||
    state.phase === 'idle' ||
    state.phase === 'completing';

  if (
    shouldDecide &&
    state.lastIntent &&
    state.active &&
    (state.phase === 'moving' || state.phase === 'performing')
  ) {
    state = { ...state, lastDecisionAtMs: input.nowMs };
    const decision = decidePetAction(ctx, input.affordances, state.active, state.aux);
    state = { ...state, aux: decision.aux, utilityTrace: decision.candidates };
    const activeNow = state.active;
  if (
      decision.chosen &&
      activeNow &&
      (decision.chosen.action !== activeNow.actionId ||
        decision.chosen.targetId !== activeNow.targetId) &&
      state.lastIntent
    ) {
      pushCompletion(
        completions,
        activeNow.interruptible === false ? 'failed' : 'interrupted',
        state.lastIntent,
        input.nowMs,
        'Bị gián đoạn bởi ưu tiên mới',
      );
      state = beginAction(state, decision.chosen, input.nowMs);
      switchReason = decision.switchReason;
    } else if (decision.chosen) {
      switchReason = decision.switchReason;
    }
  }

  if (state.phase === 'performing' && performingFinished(state, input.nowMs) && state.lastIntent) {
    if (!isTargetValid(state.lastIntent, input.affordances, input.nowMs)) {
      pushCompletion(completions, 'failed', state.lastIntent, input.nowMs, 'Đích mất trước khi hoàn tất');
      state = resetActive(state);
      switchReason = 'Thất bại — đích không còn hợp lệ';
    } else if (!state.completedInstanceIds.has(state.lastIntent.instanceId)) {
      state = { ...state, phase: 'completing' };
    }
  }

  if (state.phase === 'completing' && state.lastIntent) {
    if (state.completedInstanceIds.has(state.lastIntent.instanceId)) {
      state = resetActive(state);
    } else {
      pushCompletion(completions, 'completed', state.lastIntent, input.nowMs);
      const done = new Set(state.completedInstanceIds);
      done.add(state.lastIntent.instanceId);
      state = { ...resetActive(state), completedInstanceIds: done };
      switchReason = 'Hoàn thành (chờ xác nhận authoritative)';
    }
  }

  if (state.phase === 'idle' && shouldDecide) {
    state = { ...state, lastDecisionAtMs: input.nowMs };
    const decision = decidePetAction(ctx, input.affordances, null, state.aux);
    state = { ...state, aux: decision.aux, utilityTrace: decision.candidates };
    switchReason = decision.switchReason;
    if (decision.chosen) {
      state = beginAction(state, decision.chosen, input.nowMs);
    }
  }

  const output: PetBrainDecisionOutput = {
    phase: state.phase,
    currentIntent: state.lastIntent,
    completions,
    foodIntents,
    memoryIntents: [],
    rejectedReasonVi: state.phase === 'idle' && !state.lastIntent ? switchReason : null,
  };

  return {
    state: { ...state, lastSwitchReasonVi: switchReason },
    output,
  };
}

export function snapshotToInput(
  ctx: DecisionContext,
  affordances: readonly AffordanceCandidate[],
  caregiverIds: readonly [string, string] = ['player-1', 'player-2'],
  extra?: Partial<Pick<PetBrainInputSnapshot, 'foodOffer' | 'decisionCadenceMs'>>,
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
    foodOffer: extra?.foodOffer ?? null,
    decisionCadenceMs: extra?.decisionCadenceMs,
  };
}

export function serializePetBrain(state: PetBrainState): PetBrainPersistedState {
  return {
    version: 2,
    phase: state.phase,
    memoryJson: serializeMemory(state.memory),
    selectionLogJson: JSON.stringify(state.aux.selectionLog),
    switchHistoryJson: JSON.stringify(state.aux.switchHistory),
    activeJson: state.active ? JSON.stringify(state.active) : null,
    lastIntentJson: state.lastIntent ? JSON.stringify(state.lastIntent) : null,
    travelCompleteAtMs: state.travelCompleteAtMs,
    performingStartedAtMs: state.performingStartedAtMs,
    moveStartedAtMs: state.moveStartedAtMs,
    instanceSeq: state.instanceSeq,
    lastDecisionAtMs: state.lastDecisionAtMs,
    completedInstanceIdsJson: JSON.stringify([...state.completedInstanceIds]),
  };
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function deserializePetBrain(
  blob: PetBrainPersistedState | PetBrainPersistedStateV1,
): PetBrainState {
  const base = createPetBrainState(
    deserializeMemory(
      safeParseJson(blob.memoryJson, { capacity: PET_MEMORY_PERSIST_CAP, events: [] }),
    ),
  );

  if (blob.version === 1) {
    return {
      ...base,
      phase: blob.phase === 'completing' ? 'idle' : blob.phase,
      active: blob.activeJson ? safeParseJson(blob.activeJson, null) : null,
      travelCompleteAtMs: blob.travelCompleteAtMs,
    };
  }

  const lastIntent = blob.lastIntentJson
    ? safeParseJson<PetActionIntent | null>(blob.lastIntentJson, null)
    : null;
  let phase = blob.phase;
  if (phase === 'completing' && !lastIntent) {
    phase = 'idle';
  }

  const completed = new Set<string>(
    safeParseJson<string[]>(blob.completedInstanceIdsJson, []),
  );

  return {
    ...base,
    phase,
    active: blob.activeJson ? safeParseJson(blob.activeJson, null) : null,
    lastIntent,
    travelCompleteAtMs: blob.travelCompleteAtMs,
    performingStartedAtMs: blob.performingStartedAtMs,
    moveStartedAtMs: blob.moveStartedAtMs,
    instanceSeq: blob.instanceSeq,
    lastDecisionAtMs: blob.lastDecisionAtMs,
    completedInstanceIds: completed,
    aux: {
      selectionLog: safeParseJson(blob.selectionLogJson, createDefaultBrainAux().selectionLog),
      switchHistory: safeParseJson(blob.switchHistoryJson, createDefaultBrainAux().switchHistory),
    },
  };
}

export interface PetBrainDebugTrace {
  phase: PetBrainPhase;
  switchReasonVi: string;
  currentIntent: PetActionIntent | null;
  active: ActiveAction | null;
  travelCompleteAtMs: number | null;
  performingStartedAtMs: number | null;
  topUtility: readonly { action: string; targetId: string; score01: number; reasonVi: string }[];
  memoryCount: number;
  selectionCount: number;
  instanceId: string | null;
}

export function buildBrainDebugTrace(state: PetBrainState): PetBrainDebugTrace {
  return {
    phase: state.phase,
    switchReasonVi: state.lastSwitchReasonVi,
    currentIntent: state.lastIntent,
    active: state.active,
    travelCompleteAtMs: state.travelCompleteAtMs,
    performingStartedAtMs: state.performingStartedAtMs,
    topUtility: state.utilityTrace.slice(0, 6).map((row) => ({
      action: row.action,
      targetId: row.targetId,
      score01: row.score01,
      reasonVi: row.reasonVi,
    })),
    memoryCount: state.memory.events.length,
    selectionCount: state.aux.selectionLog.entries.length,
    instanceId: state.lastIntent?.instanceId ?? null,
  };
}