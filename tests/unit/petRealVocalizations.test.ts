import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameAudio } from '../../src/game/audio/gameAudioManager';
import { PetCareAudioEngine } from '../../src/game/pet/care/petCareAudio';

class FakeAudioParam {
  value = 1;
  setValueAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
}

class FakeBufferSource {
  buffer: unknown = null;
  playbackRate = new FakeAudioParam();
  started = false;
  connect() {}
  start() {
    this.started = true;
  }
  stop() {}
  disconnect() {}
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

function installMockAudioGlobals(initialState: 'running' | 'suspended' = 'running') {
  const createdSources: FakeBufferSource[] = [];
  let ctxState: 'running' | 'suspended' = initialState;
  const resumeSpy = vi.fn(async () => {
    ctxState = 'running';
  });

  class MockAudioContext {
    currentTime = 0;
    destination = {};
    get state() {
      return ctxState;
    }
    resume = resumeSpy;
    createGain() {
      return new FakeGainNode();
    }
    createBufferSource() {
      const s = new FakeBufferSource();
      createdSources.push(s);
      return s;
    }
    async decodeAudioData() {
      return { duration: 0.65 };
    }
    async close() {}
  }

  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })),
  );
  return { createdSources, resumeSpy };
}

describe('Real cat vocalizations & Safari suspended-unlock safety', () => {
  beforeEach(() => {
    gameAudio.setSettings({ muted: false });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    gameAudio.setSettings({ muted: false });
  });

  it('calls ctx.resume() when AudioContext starts suspended and plays real meow clip without dropping', async () => {
    const { createdSources, resumeSpy } = installMockAudioGlobals('suspended');
    const duckSpy = vi.spyOn(gameAudio, 'duckMusicBriefly');
    const engine = new PetCareAudioEngine();

    const accepted = engine.play('meow_happy', { nowMs: 10_000 });
    expect(accepted).toBe(true);

    // Allow microtask queue (resume + fetch + decodeAudioData) to flush
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 10));

    expect(resumeSpy).toHaveBeenCalledTimes(1);
    expect(duckSpy).toHaveBeenCalled();
    expect(createdSources.length).toBe(1);
    expect(createdSources[0]!.started).toBe(true);
    expect(createdSources[0]!.playbackRate.value).toBeGreaterThanOrEqual(0.97);
    expect(createdSources[0]!.playbackRate.value).toBeLessThanOrEqual(1.03);
    expect(engine.lastMeowClipKey).toMatch(/^meow_/);

    engine.dispose();
  });

  it('rotates across real MEOW_EVENT_POOLS clips without immediate repeats and respects mute state', async () => {
    const { createdSources } = installMockAudioGlobals('running');
    const engine = new PetCareAudioEngine();

    const seen = new Set<string>();
    let prev: string | null = null;
    for (let i = 0; i < 6; i += 1) {
      const ok = engine.play('meow_soft', { nowMs: 50_000 + i * 5000 });
      expect(ok).toBe(true);
      await Promise.resolve();
      const clip = engine.lastMeowClipKey!;
      expect(clip).not.toBe(prev);
      seen.add(clip);
      prev = clip;
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect(createdSources.length).toBe(6);

    gameAudio.setSettings({ muted: true });
    expect(engine.play('meow_food', { nowMs: 120_000 })).toBe(false);

    engine.dispose();
  });
});
