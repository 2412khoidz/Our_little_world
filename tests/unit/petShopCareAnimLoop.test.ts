import { describe, expect, it } from 'vitest';
import {
  isFeedEatPhase,
  nextBlinkDelayMs,
  pickIdleMicroAction,
  shouldDoubleBlink,
} from '../../src/shared/donor/pet-shop-j4lpan/petShopCareAnimLoop';

describe('petShopCareAnimLoop (pet-shop donor)', () => {
  it('blink delay stays in pet-shop band', () => {
    expect(nextBlinkDelayMs(0)).toBe(2_500);
    expect(nextBlinkDelayMs(1)).toBe(5_500);
  });

  it('double blink at ~25% rate', () => {
    expect(shouldDoubleBlink(0.24)).toBe(true);
    expect(shouldDoubleBlink(0.26)).toBe(false);
  });

  it('picks idle micro actions in upstream weights', () => {
    expect(pickIdleMicroAction(0.1)).toBe('yawn');
    expect(pickIdleMicroAction(0.2)).toBe('ear_twitch');
    expect(pickIdleMicroAction(0.5)).toBe(null);
  });

  it('feed eat phase is short', () => {
    expect(isFeedEatPhase(1_000, 1_500)).toBe(true);
    expect(isFeedEatPhase(1_000, 2_000)).toBe(false);
  });
});