import { describe, expect, it } from 'vitest';
import {
  PUNY_SHEET,
  punyDirForFacing8,
  punyFrameIndex,
} from '../../src/shared/donor/punyCharacter8dSheet';

describe('donor Puny 8d sheet layout', () => {
  it('indexes walk-down-right middle frame', () => {
    const dir = punyDirForFacing8('down-right');
    expect(dir).toBe(7);
    const idx = punyFrameIndex(PUNY_SHEET.rows.walk, dir, 1);
    expect(idx).toBe(1 * PUNY_SHEET.cols + 7 * 3 + 1);
  });

  it('maps cardinals to south-west-north-east columns', () => {
    expect(punyDirForFacing8('down')).toBe(0);
    expect(punyDirForFacing8('left')).toBe(2);
    expect(punyDirForFacing8('up')).toBe(4);
    expect(punyDirForFacing8('right')).toBe(6);
  });
});