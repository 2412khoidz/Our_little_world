import { describe, expect, it } from 'vitest';
import { PetCareSessionGoals } from '../../src/shared/petLiving/petCare/petCareSessionGoals';

describe('PetCareSessionGoals', () => {
  it('tracks unique goals across actions', () => {
    const g = new PetCareSessionGoals();
    expect(g.recordAction('brush')).toBe('brush');
    expect(g.recordAction('brush')).toBeNull();
    g.record('pour_water');
    expect(g.progress.count).toBe(2);
  });
});