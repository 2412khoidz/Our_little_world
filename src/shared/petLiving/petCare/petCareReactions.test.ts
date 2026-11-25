import { describe, expect, it } from 'vitest';
import { PET_PERSONALITY_PRESETS } from '../petIntelligenceConfig';
import { reactToCareStroke, reactToCareAction } from './petCareReactions';

describe('petCareReactions', () => {
  const traits = PET_PERSONALITY_PRESETS[0]!.traits;

  it('returns purr on chin stroke', () => {
    const ex = reactToCareStroke('chin', { traits, petName: 'Quýt', shyRefuseRoll: 0.1 }, 1);
    expect(ex.anim).toBe('pet_purr');
    expect(ex.bubbleVi).toContain('Purr');
  });

  it('maps toy yarn to pounce', () => {
    const ex = reactToCareAction('toy_yarn', { traits, petName: 'Quýt', shyRefuseRoll: 0.1 });
    expect(ex.anim).toBe('play_pounce');
  });

  it('uses valid anim states only', () => {
    const shy = reactToCareStroke('belly', { traits: { ...traits, shy: 0.9 }, petName: 'Mochi', shyRefuseRoll: 0.99 }, 1);
    expect(shy.anim).not.toBe('refuse_shy' as never);
    expect(shy.refuse).toBe(true);
  });
});