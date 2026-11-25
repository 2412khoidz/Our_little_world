import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_BOWL_PRESENTATION,
  fillHomeFoodBowl,
  pourHomeWaterBowl,
  waterPitcherPourDelta,
} from '../../src/shared/interaction/homeBowlPresentation';
import { EMPTY_HELD_ITEM, resolveContextualActions } from '../../src/shared/interaction/interactionResolver';

describe('home bowl presentation', () => {
  it('fills food then water independently', () => {
    let s = DEFAULT_HOME_BOWL_PRESENTATION;
    s = fillHomeFoodBowl(s);
    expect(s.foodFull).toBe(true);
    s = pourHomeWaterBowl(s);
    expect(s.waterFull).toBe(true);
  });

  it('pour reduces pitcher level', () => {
    expect(waterPitcherPourDelta(72)).toBe(37);
  });
});

describe('farm barn door action', () => {
  it('offers enter_barn_shop when economy playable', () => {
    const res = resolveContextualActions({
      playerX: 150,
      playerY: 150,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      economyPlayable: true,
      interactables: [
        {
          id: 'farm_barn_door',
          kind: 'door',
          labelVi: 'Barn',
          x: 150,
          y: 150,
          maxRadiusPx: 48,
        },
      ],
    });
    expect(res.primary?.code).toBe('enter_barn_shop');
    expect(res.primary?.available).toBe(true);
  });
});