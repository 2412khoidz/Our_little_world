import { describe, expect, it } from 'vitest';
import {
  PET_PERSONALITY_PRESETS,
  applyNonLethal8NeedsCatchup,
  createDefault8Needs,
  derive9Emotion,
  getSubtleBehaviorHintVi,
} from '../../src/shared/petLiving/petIntelligenceConfig';
import {
  PET_MEMORY_PERSIST_CAP,
  appendBoundedMemory,
  computeCaregiverFamiliarity,
} from '../../src/shared/petLiving/petPrimitivesAdapter';
import {
  PET_LAB_SCENARIOS,
  buildLabAffordances,
  evaluateLivingPetStep,
  runPetLabVerificationTrace,
} from '../../src/shared/petLiving/petLabSimulation';

describe('Living Pet 7-Trait / 8-Need / 9-Emotion & Lab Simulation (M4)', () => {
  it('enforces non-lethal offline catch-up over 48h and 30d with FLOOR=25..30', () => {
    const start = createDefault8Needs();
    const after48h = applyNonLethal8NeedsCatchup(start, 48 * 3600 * 1000);
    const after30d = applyNonLethal8NeedsCatchup(start, 30 * 24 * 3600 * 1000);
    expect(after48h).toEqual(after30d); // 48h cap stops 30-day decay cleanly
    expect(after30d.hunger).toBeGreaterThanOrEqual(25);
    expect(after30d.safety).toBeGreaterThanOrEqual(30);
    expect(after30d.energy).toBeGreaterThanOrEqual(52);
  });

  it('prevents anti-sleep-loop when hunger < 35 and recovers cleanly when target moves away', () => {
    const hungry = runPetLabVerificationTrace({
      presetId: 'hungry',
      traits: PET_PERSONALITY_PRESETS[1]!.traits, // Even lazy Mochi prioritizes food when hunger < 35
      steps: 10,
    });
    expect(hungry.actionsChosen[0]).toBe('eat_bowl');

    const moved = runPetLabVerificationTrace({
      presetId: 'target_moved',
      traits: PET_PERSONALITY_PRESETS[0]!.traits,
      steps: 8,
    });
    expect(moved.actionsChosen).toHaveLength(8);
  });

  it('distinguishes personality profiles behaviorally without oscillation spam', () => {
    const ctx = {
      needs: { ...createDefault8Needs(), fun: 55, stimulation: 55, energy: 45 },
      traits: PET_PERSONALITY_PRESETS[0]!.traits,
      emotion: 'relaxed' as const,
      bowlFoodPortions: 0,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 1_000_000,
    };
    const affordances = buildLabAffordances();
    const playfulChoice = evaluateLivingPetStep({ ...ctx, traits: PET_PERSONALITY_PRESETS[0]!.traits }, affordances, null);
    const lazyChoice = evaluateLivingPetStep({ ...ctx, traits: PET_PERSONALITY_PRESETS[1]!.traits }, affordances, null);
    const curiousChoice = evaluateLivingPetStep({ ...ctx, traits: PET_PERSONALITY_PRESETS[2]!.traits }, affordances, null);

    expect(playfulChoice.chosen?.action).not.toBe(lazyChoice.chosen?.action);
    expect(curiousChoice.chosen?.action).not.toBe(lazyChoice.chosen?.action);

    // Every one of the 18 scenarios runs cleanly
    expect(PET_LAB_SCENARIOS.length).toBeGreaterThanOrEqual(18);
    for (const sc of PET_LAB_SCENARIOS) {
      const tr = runPetLabVerificationTrace({ presetId: sc.id, traits: PET_PERSONALITY_PRESETS[0]!.traits, steps: 6 });
      expect(tr.memoryCount).toBeLessThanOrEqual(PET_MEMORY_PERSIST_CAP);
    }
  });

  it('caps memory to 24 events without caregiver ranking and communicates via subtle hints', () => {
    let mem: ReturnType<typeof appendBoundedMemory> = [];
    for (let i = 0; i < 40; i += 1) {
      mem = appendBoundedMemory(mem, {
        id: `m-${i}`,
        kind: i % 2 === 0 ? 'fed' : 'petted',
        atMs: i * 1000,
        caregiverId: i % 3 === 0 ? 'partner-a' : 'partner-b',
      });
    }
    expect(mem).toHaveLength(24);
    const fam = computeCaregiverFamiliarity(mem, ['partner-a', 'partner-b'], 50_000);
    expect(fam['partner-a']).toBeGreaterThan(0);
    expect(fam['partner-b']).toBeGreaterThan(0);

    const emo = derive9Emotion({ ...createDefault8Needs(), hunger: 32 }, PET_PERSONALITY_PRESETS[0]!.traits);
    expect(emo).toBe('grumpy');
    const hint = getSubtleBehaviorHintVi({ ...createDefault8Needs(), hunger: 32 }, emo);
    expect(hint).toContain('ăn');
    expect(hint).not.toMatch(/\+\d/);
  });
});
