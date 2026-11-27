import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveAmbientTrack,
  setStudyAmbientTrack,
  stopStudyAmbient,
} from '../../src/features/study/ambientAudio';
import { gameAudio } from '../../src/game/audio/gameAudioManager';

describe('Study room quiet audio & BGM pause control', () => {
  afterEach(() => {
    stopStudyAmbient();
    gameAudio.setOverlayPaused(false);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('zeros gain, stops, disconnects, suspends and closes all active AudioContexts when toggled to Tắt', () => {
    const instances: Array<{
      state: AudioContextState;
      currentTime: number;
      sampleRate: number;
      destination: object;
      resume: ReturnType<typeof vi.fn>;
      suspend: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      createBuffer: ReturnType<typeof vi.fn>;
      createBufferSource: ReturnType<typeof vi.fn>;
      createBiquadFilter: ReturnType<typeof vi.fn>;
      createGain: ReturnType<typeof vi.fn>;
      lastGainNode: { gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; cancelScheduledValues: ReturnType<typeof vi.fn> }; disconnect: ReturnType<typeof vi.fn> } | null;
      lastSourceNode: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } | null;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'suspended';
      currentTime = 1.5;
      sampleRate = 8000;
      destination = {};
      lastGainNode: {
        gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; cancelScheduledValues: ReturnType<typeof vi.fn> };
        disconnect: ReturnType<typeof vi.fn>;
        connect: ReturnType<typeof vi.fn>;
      } | null = null;
      lastSourceNode: {
        buffer: unknown;
        loop: boolean;
        connect: ReturnType<typeof vi.fn>;
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
      } | null = null;

      constructor() {
        instances.push(this as unknown as (typeof instances)[number]);
      }

      resume = vi.fn(async () => {
        this.state = 'running';
      });
      suspend = vi.fn(async () => {
        this.state = 'suspended';
      });
      close = vi.fn(async () => {
        this.state = 'closed';
      });
      createBuffer = vi.fn((_c: number, len: number) => ({
        getChannelData: () => new Float32Array(len),
      }));
      createBufferSource = vi.fn(() => {
        const src = {
          buffer: null,
          loop: false,
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        };
        this.lastSourceNode = src;
        return src;
      });
      createBiquadFilter = vi.fn(() => ({
        type: 'lowpass',
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }));
      createGain = vi.fn(() => {
        const g = {
          gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        this.lastGainNode = g;
        return g;
      });
    }

    vi.stubGlobal('AudioContext', FakeAudioContext);

    expect(setStudyAmbientTrack('rain')).toBe('rain');
    expect(getActiveAmbientTrack()).toBe('rain');
    expect(instances).toHaveLength(1);
    expect(instances[0]!.resume).toHaveBeenCalledTimes(1);
    expect(instances[0]!.lastSourceNode?.start).toHaveBeenCalledTimes(1);

    // Rapid switch from rain -> hearth disposes first handle cleanly
    expect(setStudyAmbientTrack('hearth')).toBe('hearth');
    expect(instances[0]!.lastGainNode?.gain.setValueAtTime).toHaveBeenCalledWith(0, 1.5);
    expect(instances[0]!.lastSourceNode?.stop).toHaveBeenCalledTimes(1);
    expect(instances[0]!.close).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(2);

    // Switching back to Tắt ('none') silences active hearth graph immediately
    expect(setStudyAmbientTrack('none')).toBe('none');
    expect(getActiveAmbientTrack()).toBe('none');
    expect(instances[1]!.lastGainNode?.gain.value).toBe(0);
    expect(instances[1]!.lastGainNode?.disconnect).toHaveBeenCalledTimes(1);
    expect(instances[1]!.lastSourceNode?.stop).toHaveBeenCalledTimes(1);
    expect(instances[1]!.lastSourceNode?.disconnect).toHaveBeenCalledTimes(1);
    expect(instances[1]!.suspend).toHaveBeenCalledTimes(1);
    expect(instances[1]!.close).toHaveBeenCalledTimes(1);
  });

  it('pauses active world BGM when overlayPaused is enabled and clears music volume to 0', () => {
    const pauseSpy = vi.fn();
    const playSpy = vi.fn(async () => {});
    class FakeHtmlAudio {
      src = '/assets/audio/music/garden.mp3';
      loop = false;
      preload = 'auto';
      volume = 0.25;
      paused = false;
      onerror: (() => void) | null = null;
      pause = pauseSpy.mockImplementation(() => {
        this.paused = true;
      });
      play = playSpy.mockImplementation(async () => {
        this.paused = false;
      });
    }
    vi.stubGlobal('Audio', FakeHtmlAudio);

    gameAudio.setZoneMusic('home');
    void gameAudio.unlock();
    gameAudio.setOverlayPaused(true);
    expect(pauseSpy).toHaveBeenCalled();

    gameAudio.setOverlayPaused(false);
    expect(playSpy).toHaveBeenCalled();
  });
});
