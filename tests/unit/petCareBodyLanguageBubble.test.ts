import { describe, expect, it } from 'vitest';
import { shouldShowCareBubble } from '../../src/shared/petLiving/petCare/petCareTypes';

describe('shouldShowCareBubble', () => {
  it('hides purr/stroke copy; shows refusals', () => {
    expect(
      shouldShowCareBubble({
        anim: 'pet_purr',
        bubbleVi: 'Purr~',
        earTilt: 0,
        tail: 'wag_slow',
        eyeMood: 'happy',
        squeak: 'purr',
      }),
    ).toBe(false);
    expect(
      shouldShowCareBubble({
        anim: 'sit_south',
        bubbleVi: '…không thích đụng bụng!',
        earTilt: -12,
        tail: 'tuck',
        eyeMood: 'shy',
        refuse: true,
        squeak: 'refuse',
      }),
    ).toBe(true);
  });
});