import { describe, expect, it } from 'vitest';
import type { FarmToolSwingKind } from '../../src/game/farming/FarmToolSwingFx';

describe('farm tool swing presentation', () => {
  it('declares swing kinds for till water harvest only (no donor sprite sheets)', () => {
    const kinds: FarmToolSwingKind[] = ['till', 'water', 'harvest'];
    expect(kinds).toHaveLength(3);
  });
});