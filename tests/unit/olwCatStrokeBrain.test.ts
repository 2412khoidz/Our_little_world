import { describe, expect, it } from 'vitest';
import { OlwCatStrokeBrain } from '../../src/donors/nintendogs-threejs-43d231c/olwCatStrokeBrain';

describe('olwCatStrokeBrain (donor stroke port)', () => {
  it('maps normalized touch to head/chin/back zones', () => {
    const brain = new OlwCatStrokeBrain();
    expect(brain.zoneFromNorm(0.5, 0.2)).toBe('head');
    expect(brain.zoneFromNorm(0.5, 0.8)).toBe('chin');
    expect(brain.zoneFromNorm(0.5, 0.55)).toBe('back');
  });
});