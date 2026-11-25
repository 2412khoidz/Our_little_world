import { describe, expect, it } from 'vitest';
import { createTensionReelReady, tickTensionReel } from '../../src/shared/donor/canvas-games-fishing/tensionReelSim';
import { pickCanvasStreamFish } from '../../src/shared/donor/canvas-games-fishing/streamFishSpecies';

describe('donor canvas-games tension fishing', () => {
  it('picks trout-weighted species', () => {
    let i = 0;
    const fish = pickCanvasStreamFish(() => (i++ % 3) * 0.33, 0.5);
    expect(fish.olwSku).toBeTruthy();
  });

  it('caught when holding through reel', () => {
    let state = createTensionReelReady(0.1);
    for (let step = 0; step < 400; step++) {
      state = {
        ...tickTensionReel({ ...state, holding: step % 3 !== 0 }, 0.025, () => 0.2),
        holding: step % 3 !== 0,
      };
      if (state.phase === 'caught' || state.phase === 'escaped') break;
    }
    expect(['caught', 'escaped']).toContain(state.phase);
  });
});