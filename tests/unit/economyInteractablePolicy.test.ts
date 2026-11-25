import { describe, expect, it } from 'vitest';
import { shouldOmitEconomyTargetFromResolve } from '../../src/shared/interaction/economyInteractablePolicy';
import type { ContextualAction } from '../../src/shared/interaction/interactionTypes';

describe('economyInteractablePolicy', () => {
  it('omits unplayable economy shops when preview is off', () => {
    const target = {
      id: 'outdoor_market',
      kind: 'shop_npc' as const,
      labelVi: 'Chợ',
      x: 0,
      y: 0,
      maxRadiusPx: 40,
      donorPlayable: false,
    };
    const action: ContextualAction = {
      code: 'open_farm_market',
      keyHint: 'J',
      labelVi: 'Mua',
      targetId: target.id,
      available: false,
    };
    expect(shouldOmitEconomyTargetFromResolve(target, action, false)).toBe(true);
    expect(shouldOmitEconomyTargetFromResolve(target, action, true)).toBe(false);
  });

  it('keeps portal targets when preview is off', () => {
    const target = {
      id: 'to-garden',
      kind: 'portal' as const,
      labelVi: 'Ra vườn',
      x: 0,
      y: 0,
      maxRadiusPx: 40,
    };
    const action: ContextualAction = {
      code: 'use_portal',
      keyHint: 'J',
      labelVi: 'Ra vườn',
      targetId: 'to-garden',
      available: true,
    };
    expect(shouldOmitEconomyTargetFromResolve(target, action, false)).toBe(false);
  });
});