import { describe, expect, it } from 'vitest';
import {
  beginTidefallCast,
  createTidefallFishingIdle,
  tidefallHookStrike,
  tidefallMinigameTap,
  tickTidefallFishing,
} from '../../src/shared/donor/tidefall-phaser/tidefallFishingFsm';

describe('donor tidefall fishing FSM', () => {
  it('runs cast → bite → minigame with hook strike', () => {
    let state = beginTidefallCast(createTidefallFishingIdle(), {
      waitMs: 0,
      targetWidth: 0.4,
      pointerSpeed: 1.2,
      personality: 'NORMAL',
    });
    expect(state.phase).toBe('casting');
    state = tickTidefallFishing(state, 0.5);
    expect(state.phase).toBe('waiting');
    state = tickTidefallFishing(state, 0.05);
    expect(state.phase).toBe('bite');
    state = tidefallHookStrike(state);
    expect(state.phase).toBe('minigame');
  });

  it('lands when repeated taps keep pointer in green zone', () => {
    let state = beginTidefallCast(createTidefallFishingIdle(), {
      waitMs: 0,
      targetWidth: 0.9,
      pointerSpeed: 0.2,
      personality: 'TIMID',
    });
    state = tickTidefallFishing(state, 0.5);
    state = tickTidefallFishing(state, 0.02);
    state = tidefallHookStrike(state);
    for (let i = 0; i < 30; i++) {
      state = { ...state, pointerNorm: state.targetCenter };
      state = tidefallMinigameTap(state);
      if (state.phase === 'landed') break;
    }
    expect(state.phase).toBe('landed');
    expect(state.progress).toBeGreaterThanOrEqual(1);
  });
});