import { describe, expect, it } from 'vitest';
import { cardinalFromFacing8, resolveFacing8 } from '../../src/shared/movement/facing8';

describe('facing8', () => {
  it('resolves diagonals when both axes dominate', () => {
    expect(resolveFacing8(1, 1, 'down')).toBe('down-right');
    expect(resolveFacing8(-1, 1, 'down')).toBe('down-left');
    expect(resolveFacing8(1, -1, 'down')).toBe('up-right');
  });

  it('maps diagonals to cardinal clips', () => {
    expect(cardinalFromFacing8('down-right')).toBe('down');
    expect(cardinalFromFacing8('up-left')).toBe('up');
    expect(cardinalFromFacing8('left')).toBe('left');
  });
});