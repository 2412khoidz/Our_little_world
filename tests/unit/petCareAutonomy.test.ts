import { describe, expect, it, vi } from 'vitest';
import { PetCareAutonomy } from '../../src/shared/petLiving/petCare/PetCareAutonomy';
import type { PetCareMoodState } from '../../src/shared/petLiving/petCare/petCareMood';

const mood: PetCareMoodState = {
  label: 'cozy',
  blinkIntervalMs: 3000,
  breathAmplitude: 0.02,
  proactiveChance: 0.9,
  refuseFoodBias: 0.5,
  bubbleVi: 'test',
};

describe('PetCareAutonomy', () => {
  it('backs off with observe after notifyRefuse', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const a = new PetCareAutonomy(mood);
    a.notifyRefuse(10_000);
    const quietCue = a.tick(17_000, 5_000);
    expect(quietCue.kind).toBe('proactive');
    if (quietCue.kind === 'proactive') {
      expect(quietCue.action).toBe('observe');
    }
    const laterCue = a.tick(20_000, 12_000);
    if (laterCue.kind === 'proactive') {
      expect(laterCue.action).toBe('call');
    }
    vi.restoreAllMocks();
  });

  it('nudges with observe then call after long quiet', () => {
    const playful: PetCareMoodState = { ...mood, proactiveChance: 0.05 };
    const a = new PetCareAutonomy(playful);
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const cue = a.tick(60_000, 50_000);
    expect(cue.kind).toBe('proactive');
    if (cue.kind === 'proactive') {
      expect(cue.action).toBe('observe');
    }
    const late = a.tick(120_000, 80_000);
    expect(late.kind).toBe('proactive');
    if (late.kind === 'proactive') {
      expect(late.action).toBe('call');
    }
    vi.restoreAllMocks();
  });
});