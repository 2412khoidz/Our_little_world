import { describe, expect, it } from 'vitest';
import {
  petCareActionKindToFlash,
  petCareExpressionToFlash,
  toCarePanelMode,
} from '../../src/shared/donor/pet-shop-j4lpan/petCareJ4lpanBridge';

describe('petCareJ4lpanBridge', () => {
  it('maps touch and feed actions', () => {
    expect(petCareActionKindToFlash('pour_water')).toBe('water');
    expect(petCareActionKindToFlash('offer_food')).toBe('feed');
    expect(petCareActionKindToFlash('toy_yarn')).toBe('play');
  });

  it('maps stroke expression to pet flash', () => {
    expect(
      petCareExpressionToFlash({
        anim: 'pet_purr',
        bubbleVi: '',
        earTilt: 0,
        tail: 'wag_fast',
        eyeMood: 'happy',
      }),
    ).toBe('pet');
  });

  it('converts active play flash to care panel play mode', () => {
    expect(toCarePanelMode('play', true)).toBe('play');
    expect(toCarePanelMode('feed', false)).toBe('idle');
  });
});