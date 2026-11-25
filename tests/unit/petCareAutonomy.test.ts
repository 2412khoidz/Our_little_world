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
    const cue = a.tick(17_000, 6000);
    expect(cue.kind).toBe('proactive');
    if (cue.kind === 'proactive') {
      expect(cue.action).toBe('observe');
      expect(cue.bubbleVi).toContain('yên tĩnh');
    }
    vi.restoreAllMocks();
  });
});