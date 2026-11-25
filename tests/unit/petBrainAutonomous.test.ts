import { describe, expect, it } from 'vitest';
import {
  PET_BRAIN_QA_PROFILE_IDS,
  PET_PERSONALITY_PRESETS,
  createDefault8Needs,
} from '../../src/shared/petLiving/petIntelligenceConfig';
import {
  buildLabAffordances,
  runPetLabSessionTrace,
  runPetLabVerificationTrace,
} from '../../src/shared/petLiving/petLabSimulation';
import {
  createPetBrainState,
  decidePetAction,
  deserializePetBrain,
  serializePetBrain,
  snapshotToInput,
  tickPetBrain,
} from '../../src/shared/petLiving/petAutonomousController';
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

  it('serializes and restores brain state deterministically', () => {
    const brain = createPetBrainState();
    const blob = serializePetBrain(brain);
    const back = deserializePetBrain(blob);
    expect(back.phase).toBe(brain.phase);
    expect(back.memory.capacity).toBe(24);
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
  let last: string | null = null;
    for (let i = 0; i < 8; i += 1) {
      const tick = tickPetBrain(state, snapshotToInput({ ...ctx, nowMs: 2_000_000 + i * 500 }, affordances));
      state = tick.state;
      const action = tick.output.currentIntent?.actionId ?? null;
      if (action && action !== last) {
        changes += 1;
        last = action;
      }
    }
    expect(changes).toBeLessThanOrEqual(3);
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

  it('deterministic replay: same seed steps yield identical action list', () => {
    const input = {
      presetId: 'playful' as const,
      traits: profile('curious_bong'),
      steps: 16,
      stepMs: 3000,
    };
    const a = runPetLabVerificationTrace(input);
    const b = runPetLabVerificationTrace(input);
    expect(a.actionsChosen).toEqual(b.actionsChosen);
  });
});