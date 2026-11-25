import { describe, expect, it } from 'vitest';
import { createChillReelReady, startChillReel, tickChillReel } from '../../src/shared/donor/chill-fishing/reelMinigame';

describe('donor chill reel minigame', () => {
  const fish = { reelBehavior: 'normal' as const, speed: 0.6 };

  it('starts reeling and accumulates progress when fish stays in catch zone', () => {
    let state = startChillReel(createChillReelReady(fish, 0.35));
    expect(state.phase).toBe('reeling');
    for (let i = 0; i < 200; i++) {
      const zonePos = state.zonePos;
      const zoneEnd = zonePos + state.zoneW;
      state = {
        ...state,
        holding: true,
        fishPos: (zonePos + zoneEnd) / 2,
        fishDir: 0,
        fishSpd: 0,
      };
      state = tickChillReel(state, 0.05, () => 0);
      if (state.phase === 'caught') break;
    }
    expect(state.phase).toBe('caught');
    expect(state.progress).toBeGreaterThanOrEqual(1);
  });
});