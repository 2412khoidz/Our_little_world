import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { noteSelection } from '../../src/shared/petAdvanced/primitives/stabilization';
import {
  PET_BRAIN_QA_PROFILE_IDS,
  PET_PERSONALITY_PRESETS,
  createDefault8Needs,
} from '../../src/shared/petLiving/petIntelligenceConfig';
import {
  PET_LAB_LONG_SESSIONS,
  buildLabAffordances,
  runPetLabSessionTrace,
  runPetLabVerificationTrace,
} from '../../src/shared/petLiving/petLabSimulation';
import { confirmLabCompletion, createLabSimulationExecutor } from '../../src/shared/petLiving/petLabSimulationExecutor';
import { createDefaultBrainAux } from '../../src/shared/petLiving/petBrainConfig';
import {
  createPetBrainState,
  decidePetAction,
  deserializePetBrain,
  serializePetBrain,
  snapshotToInput,
  tickPetBrain,
} from '../../src/shared/petLiving/petAutonomousController';
import type { PetActionCompletionEvent } from '../../src/shared/petLiving/petBrainContract04B';
import { appendBoundedMemory, deserializeMemory, serializeMemory } from '../../src/shared/petLiving/petPrimitivesAdapter';
import { decideFoodOffer } from '../../src/shared/petLiving/petFoodIntent';

const profile = (id: string) =>
  PET_PERSONALITY_PRESETS.find((p) => p.id === id)!.traits;

describe('Mission 04A — pet brain controller', () => {
  it('wires DeepSeek primitives via adapter (memory round-trip)', () => {
    let events = appendBoundedMemory([], {
      id: 'a',
      kind: 'fed',
      atMs: 100,
      caregiverId: 'partner-a',
    });
    events = appendBoundedMemory(events, {
      id: 'b',
      kind: 'played',
      atMs: 200,
      caregiverId: 'partner-b',
    });
    const json = serializeMemory({ capacity: 24, events });
    const restored = deserializeMemory(json);
    expect(restored.events).toHaveLength(2);
  });

  it('serializes and restores brain state including mid-action intent (v2)', () => {
    const ctx = {
      needs: { ...createDefault8Needs(), hunger: 22 },
      traits: profile('sleepy_mochi'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 1_000_000,
    };
    let brain = createPetBrainState();
    const affordances = buildLabAffordances();
    for (let i = 0; i < 8; i += 1) {
      const tick = tickPetBrain(
        brain,
        snapshotToInput({ ...ctx, nowMs: 1_000_000 + i * 2000 }, affordances, ['partner-a', 'partner-b'], {
          decisionCadenceMs: 500,
        }),
      );
      brain = tick.state;
      if (brain.lastIntent) break;
    }
    expect(brain.lastIntent).not.toBeNull();
    expect(['moving', 'performing', 'completing', 'idle']).toContain(brain.phase);

    const blob = serializePetBrain(brain);
    expect(blob.version).toBe(2);
    const back = deserializePetBrain(blob);
    expect(back.phase).toBe(brain.phase);
    expect(back.lastIntent?.instanceId).toBe(brain.lastIntent?.instanceId);
    expect(back.completedInstanceIds).toEqual(brain.completedInstanceIds);

    const continued = tickPetBrain(
      back,
      snapshotToInput({ ...ctx, nowMs: 1_000_000 + 20_000 }, affordances),
    );
    expect(continued.output.completions.every((c) => c.kind !== 'failed' || c.failureReasonVi)).toBe(true);
  });

  it('recovers safely from inconsistent v2 completing without intent', () => {
    const brain = createPetBrainState();
    const blob = serializePetBrain({ ...brain, phase: 'completing', lastIntent: null });
    const back = deserializePetBrain(blob);
    expect(back.phase).toBe('idle');
  });

  it('restores v1 blobs without sticking in completing', () => {
    const back = deserializePetBrain({
      version: 1,
      phase: 'completing',
      memoryJson: serializeMemory({ capacity: 24, events: [] }),
      selectionLogJson: JSON.stringify(createDefaultBrainAux().selectionLog),
      switchHistoryJson: JSON.stringify(createDefaultBrainAux().switchHistory),
      activeJson: null,
      travelCompleteAtMs: null,
    });
    expect(back.phase).toBe('idle');
  });

  it('restores v2 moving/performing without lastIntent as idle', () => {
    const brain = createPetBrainState();
    const blob = serializePetBrain({
      ...brain,
      phase: 'moving',
      lastIntent: null,
    });
    const back = deserializePetBrain(blob);
    expect(back.phase).toBe('idle');
  });

  it('personality QA profiles diverge in the same explore scenario', () => {
    const results = PET_BRAIN_QA_PROFILE_IDS.map((id) =>
      runPetLabVerificationTrace({
        presetId: 'new_furniture',
        traits: profile(id),
        steps: 12,
        stepMs: 3500,
      }),
    );
    const actionSets = results.map((r) => [...new Set(r.actionsChosen)].join(','));
    expect(new Set(actionSets).size).toBeGreaterThanOrEqual(2);
  });

  it('anti-repeat reduces hide_in_box spam over a long trace', () => {
    const trace = runPetLabSessionTrace({
      presetId: 'new_furniture',
      traits: profile('curious_bong'),
      durationMs: 90_000,
      stepMs: 2500,
    });
    const boxCount = trace.actionsChosen.filter((a) => a === 'hide_in_box').length;
    expect(boxCount).toBeLessThanOrEqual(3);
    expect(trace.switches).toBeLessThanOrEqual(14);
    expect(trace.instanceTransitions.length).toBeGreaterThan(2);
  });

  it('honors commitment — no switch every tick when scores are close', () => {
    const ctx = {
      needs: { ...createDefault8Needs(), fun: 62, stimulation: 62, energy: 70 },
      traits: profile('mischievous_quyt'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 2_000_000,
    };
    const brain = createPetBrainState();
    const affordances = buildLabAffordances();
    let state = brain;
    let changes = 0;
    let interrupted = 0;
    let last: string | null = null;
    for (let i = 0; i < 8; i += 1) {
      const tick = tickPetBrain(state, snapshotToInput({ ...ctx, nowMs: 2_000_000 + i * 500 }, affordances));
      state = tick.state;
      interrupted += tick.output.completions.filter((c) => c.kind === 'interrupted').length;
      const action = tick.output.currentIntent?.actionId ?? null;
      if (action && action !== last) {
        changes += 1;
        last = action;
      }
    }
    expect(changes).toBeLessThanOrEqual(3);
    expect(interrupted).toBe(0);
  });

  it('may interrupt during performing when urgency overtakes commitment', () => {
    const affordances = buildLabAffordances();
    let brain = createPetBrainState();
    const sleepyCtx = {
      needs: { ...createDefault8Needs(), energy: 26, hunger: 80 },
      traits: profile('sleepy_mochi'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 3_000_000,
    };
    let performingSeen = false;
    let interrupted = false;
    for (let i = 0; i < 12; i += 1) {
      const nowMs = 3_000_000 + i * 2000;
      const needs =
        i >= 7
          ? { ...createDefault8Needs(), energy: 26, hunger: 20, thirst: 80 }
          : sleepyCtx.needs;
      const tick = tickPetBrain(
        brain,
        snapshotToInput({ ...sleepyCtx, needs, nowMs }, affordances),
      );
      brain = tick.state;
      if (brain.phase === 'performing') performingSeen = true;
      if (tick.output.completions.some((c) => c.kind === 'interrupted')) interrupted = true;
    }
    expect(performingSeen).toBe(true);
    expect(interrupted).toBe(true);
  });

  it('cancels in-flight action when target disappears while moving', () => {
    const trace = runPetLabVerificationTrace({
      presetId: 'sleepy',
      traits: profile('sleepy_mochi'),
      steps: 10,
      stepMs: 2000,
      targetMovedAfterStep: 1,
      targetMovedId: 'pet_bed',
    });
    expect((trace.completionKinds.cancelled ?? 0) + (trace.completionKinds.failed ?? 0)).toBeGreaterThan(0);
  });

  it('does not pick repeat-suppressed candidates when all are on cooldown', () => {
    const ctx = {
      needs: createDefault8Needs(),
      traits: profile('curious_bong'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 4_000_000,
    };
    const affordances = buildLabAffordances();
    let aux = createDefaultBrainAux();
    const t = 4_000_000;
    for (const a of affordances) {
      const key = `${a.action}@${a.targetId}`;
      aux = { ...aux, selectionLog: noteSelection(aux.selectionLog, key, t) };
    }
    const res = decidePetAction(ctx, affordances, null, aux);
    expect(res.chosen).toBeNull();
    expect(res.switchReason).toContain('idle');
  });

  it('food decision emits accept/refuse/defer without consume when deferred', () => {
    const shy = decideFoodOffer('fish_carp_grilled', 'normal', 60, {
      traits: profile('shy_timid'),
      emotion: 'relaxed',
      currentCommitmentAction: 'hide_in_box',
      favoriteSkus: [],
      dislikedSkus: [],
      familiarSkus: ['pet_kibble_basic'],
      lastFedAtMs: null,
      nowMs: 1_000_000,
    });
    expect(shy.deferred).toBe(true);
    expect(shy.consumeItem).toBe(false);

    const fav = decideFoodOffer('fish_carp_grilled', 'gold', 45, {
      traits: profile('mischievous_quyt'),
      emotion: 'happy',
      currentCommitmentAction: null,
      favoriteSkus: ['fish_carp_grilled'],
      dislikedSkus: [],
      familiarSkus: [],
      lastFedAtMs: null,
      nowMs: 1_000_000,
    });
    expect(fav.accepted).toBe(true);
    expect(fav.consumeItem).toBe(true);
  });

  it('integrates food offer into tick output with caregiver identity', () => {
    const ctx = {
      needs: { ...createDefault8Needs(), hunger: 55 },
      traits: profile('mischievous_quyt'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 5_000_000,
    };
    const tick = tickPetBrain(
      createPetBrainState(),
      snapshotToInput(ctx, buildLabAffordances(), ['partner-a', 'partner-b'], {
        foodOffer: {
          offerId: 'offer-1',
          caregiverId: 'partner-b',
          sku: 'fish_carp_grilled',
          quality: 'gold',
        },
      }),
    );
    expect(tick.output.foodIntents).toHaveLength(1);
    expect(tick.output.foodIntents[0]?.caregiverId).toBe('partner-b');
    expect(tick.output.foodIntents[0]?.mayConsumeItem).toBe(true);
  });

  it('rejects unreachable affordance (target moved)', () => {
    const ctx = {
      needs: createDefault8Needs(),
      traits: profile('sleepy_mochi'),
      emotion: 'relaxed' as const,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 1_000_000,
    };
    const res = decidePetAction(ctx, buildLabAffordances('pet_bed'), null, createPetBrainState().aux);
    expect(res.chosen?.action).not.toBe('sleep_cushion');
  });

  it('brain does not write fed memory — lab executor confirms exactly once', () => {
    const trace = runPetLabSessionTrace({
      presetId: 'hungry',
      traits: profile('mischievous_quyt'),
      durationMs: 60_000,
      stepMs: 2500,
    });
    expect(trace.brainMemoryCount).toBe(0);
    expect(trace.memoryCount).toBeGreaterThan(0);

    const completion: PetActionCompletionEvent = {
      kind: 'completed',
      instanceId: 'dup-test',
      atMs: 1,
      intent: {
        instanceId: 'dup-test',
        actionId: 'eat_bowl',
        targetId: 'food_bowl',
        affordanceId: 'food_bowl',
        score01: 0.9,
        reasonVi: 'test',
        animationHint: 'eat_bowl',
        interruptible: true,
        estimatedPerformMs: 3000,
        estimatedTravelMs: 400,
      },
      proposedNeedDeltas: { hunger: 22 },
    };
    const sim = createLabSimulationExecutor(createDefault8Needs(), { bowlFoodPortions: 1, waterBowlVolume: 80 });
    const first = confirmLabCompletion(sim, completion, 'dup-test');
    const second = confirmLabCompletion(first.sim, completion, 'dup-test');
    expect(first.memoryIntents).toHaveLength(1);
    expect(second.memoryIntents).toHaveLength(0);
    expect(second.sim.resources.bowlFoodPortions).toBe(0);
  });

  it('does not create fed memory when bowl is empty on confirm', () => {
    const completion: PetActionCompletionEvent = {
      kind: 'completed',
      instanceId: 'empty-bowl',
      atMs: 1,
      intent: {
        instanceId: 'empty-bowl',
        actionId: 'eat_bowl',
        targetId: 'food_bowl',
        affordanceId: 'food_bowl',
        score01: 0.9,
        reasonVi: 'test',
        animationHint: 'eat_bowl',
        interruptible: true,
        estimatedPerformMs: 3000,
        estimatedTravelMs: 400,
      },
    };
    const sim = createLabSimulationExecutor(createDefault8Needs(), { bowlFoodPortions: 0, waterBowlVolume: 80 });
    const { memoryIntents, sim: after } = confirmLabCompletion(sim, completion, 'empty-bowl');
    expect(memoryIntents).toHaveLength(0);
    expect(after.resources.bowlFoodPortions).toBe(0);
  });

  it('depletes food and water resources over hungry/thirsty sessions', () => {
    const hungry = runPetLabSessionTrace({
      presetId: 'hungry',
      traits: profile('mischievous_quyt'),
      durationMs: 75_000,
      stepMs: 2500,
    });
    expect(hungry.resources.bowlFoodPortions).toBeLessThan(1);
    const thirsty = runPetLabSessionTrace({
      presetId: 'thirsty',
      traits: profile('sleepy_mochi'),
      durationMs: 75_000,
      stepMs: 2500,
    });
    expect(thirsty.resources.waterBowlVolume).toBeLessThan(80);
  });

  it('exports session trace artifacts for acceptance (180–300s)', () => {
    const outDir = path.join(process.cwd(), 'test-results', 'pet-brain-traces');
    fs.mkdirSync(outDir, { recursive: true });
    const sessions = [
      ...PET_LAB_LONG_SESSIONS.map((s) => ({
        presetId: s.presetId,
        traitId: s.traitId,
        file: `session-${s.presetId}-${s.traitId}.json`,
        durationMs: s.durationMs,
      })),
    ];
    for (const s of sessions) {
      const trace = runPetLabSessionTrace({
        presetId: s.presetId,
        traits: profile(s.traitId),
        durationMs: s.durationMs,
        stepMs: 2500,
      });
      expect(trace.transitionCount).toBeGreaterThan(10);
      fs.writeFileSync(path.join(outDir, s.file), JSON.stringify(trace, null, 2));
    }
    expect(fs.readdirSync(outDir).length).toBeGreaterThanOrEqual(3);
  });

  it('deterministic replay: same seed steps yield identical instance transitions', () => {
    const input = {
      presetId: 'playful' as const,
      traits: profile('curious_bong'),
      steps: 16,
      stepMs: 3000,
    };
    const a = runPetLabVerificationTrace(input);
    const b = runPetLabVerificationTrace(input);
    expect(a.instanceTransitions).toEqual(b.instanceTransitions);
  });
});