import { gameAudio } from '../../audio/gameAudioManager';

export type CatSoundEvent =
  | 'meow_soft'
  | 'meow_happy'
  | 'meow_food'
  | 'meow_short'
  | 'eat_crunch'
  | 'drink_lap'
  | 'footstep'
  | 'ball_bounce'
  | 'bell_jingle'
  | 'box_rustle'
  | 'toy_swish'
  | 'brush_fur';

export type PurrMode = 'active' | 'sleep' | 'off';

type AudioFileKey =
  | CatSoundEvent
  | 'purr_loop'
  | 'purr_sleep'
  | 'eat_crunch_2'
  | 'meow_chirp'
  | 'meow_kitten_cute'
  | 'meow_kitten_double'
  | 'meow_attention';

const AUDIO_FILES: Record<AudioFileKey, string> = {
  meow_soft: '/assets/pet-care-v2/audio/meow_soft.mp3',
  meow_happy: '/assets/pet-care-v2/audio/meow_happy.mp3',
  meow_food: '/assets/pet-care-v2/audio/meow_food.mp3',
  meow_short: '/assets/pet-care-v2/audio/meow_short.mp3',
  meow_chirp: '/assets/pet-care-v2/audio/meow_chirp.mp3',
  meow_kitten_cute: '/assets/pet-care-v2/audio/meow_kitten_cute.mp3',
  meow_kitten_double: '/assets/pet-care-v2/audio/meow_kitten_double.mp3',
  meow_attention: '/assets/pet-care-v2/audio/meow_attention.mp3',
  eat_crunch: '/assets/pet-care-v2/audio/eat_crunch.mp3',
  eat_crunch_2: '/assets/pet-care-v2/audio/eat_crunch_2.mp3',
  drink_lap: '/assets/pet-care-v2/audio/drink_lap.mp3',
  footstep: '/assets/pet-care-v2/audio/footstep.mp3',
  ball_bounce: '/assets/pet-care-v2/audio/ball_bounce.mp3',
  bell_jingle: '/assets/pet-care-v2/audio/bell_jingle.mp3',
  box_rustle: '/assets/pet-care-v2/audio/box_rustle.mp3',
  toy_swish: '/assets/pet-care-v2/audio/toy_swish.mp3',
  brush_fur: '/assets/pet-care-v2/audio/brush_fur.mp3',
  purr_loop: '/assets/pet-care-v2/audio/purr_loop.mp3',
  purr_sleep: '/assets/pet-care-v2/audio/purr_sleep.mp3',
};

const MEOW_EVENT_POOLS: Partial<Record<CatSoundEvent, readonly AudioFileKey[]>> = {
  meow_soft: ['meow_soft', 'meow_kitten_cute', 'meow_chirp'],
  meow_happy: ['meow_happy', 'meow_kitten_double', 'meow_kitten_cute'],
  meow_food: ['meow_food', 'meow_attention', 'meow_kitten_double'],
  meow_short: ['meow_short', 'meow_chirp', 'meow_soft'],
};

const COOLDOWN_MS: Record<CatSoundEvent, number> = {
  meow_soft: 2800,
  meow_happy: 2500,
  meow_food: 2800,
  meow_short: 2400,
  eat_crunch: 520,
  drink_lap: 460,
  footstep: 340,
  ball_bounce: 140,
  bell_jingle: 240,
  box_rustle: 550,
  toy_swish: 340,
  brush_fur: 380,
};

const BASE_GAIN: Record<CatSoundEvent, number> = {
  meow_soft: 0.94,
  meow_happy: 0.98,
  meow_food: 0.96,
  meow_short: 0.92,
  eat_crunch: 0.62,
  drink_lap: 0.42,
  footstep: 0.24,
  ball_bounce: 0.65,
  bell_jingle: 0.56,
  box_rustle: 0.6,
  toy_swish: 0.52,
  brush_fur: 0.48,
};

const STORAGE_KEY = 'olw:pet-care:audio-v1';

interface StoredAudioPrefs {
  volume: number;
  muted: boolean;
}

function readAudioPrefs(): StoredAudioPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredAudioPrefs>;
      const vol = typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : 0.7;
      const muted = typeof parsed.muted === 'boolean' ? parsed.muted : false;
      return { volume: vol, muted };
    }
  } catch {
    // Ignore storage read failure
  }
  return { volume: 0.7, muted: false };
}

function writeAudioPrefs(prefs: StoredAudioPrefs): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore storage write failure
  }
}

export class PetCareAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly bufferCache = new Map<string, AudioBuffer>();
  private readonly loadingMap = new Map<string, Promise<AudioBuffer | null>>();
  private readonly lastPlayedAt = new Map<CatSoundEvent, number>();
  private readonly unlockCleanups: Array<() => void> = [];

  private volume: number;
  private muted: boolean;
  private disposed = false;
  private purrMode: PurrMode = 'off';
  private purrSource: AudioBufferSourceNode | null = null;
  private purrGain: GainNode | null = null;
  private crunchAlt = false;
  private lastMeowFileKey: AudioFileKey | null = null;

  lastSoundEvent: CatSoundEvent | null = null;
  lastMeowClipKey: AudioFileKey | null = null;

  constructor() {
    const prefs = readAudioPrefs();
    this.volume = prefs.volume;
    this.muted = prefs.muted;
    this.bindGestureUnlock();
  }

  getVolume(): number {
    return this.volume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(next: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(next) ? next : 0.7));
    writeAudioPrefs({ volume: this.volume, muted: this.muted });
    this.syncMasterGain();
  }

  setMuted(next: boolean): void {
    this.muted = Boolean(next);
    writeAudioPrefs({ volume: this.volume, muted: this.muted });
    this.syncMasterGain();
    if (this.muted) {
      this.stopPurrImmediate();
    }
  }

  /** Must be safe to call repeatedly from Safari/iOS pointer or button events. */
  unlock(): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void ctx.resume().catch(() => {});
    }
    // Pre-warm natural meow buffers without noisy playback
    for (const k of ['meow_kitten_cute', 'meow_happy', 'meow_soft', 'meow_food', 'meow_short'] as const) {
      void this.loadBuffer(k);
    }
  }

  private pickMeowFileKey(event: CatSoundEvent): AudioFileKey {
    const pool = MEOW_EVENT_POOLS[event];
    if (!pool || pool.length === 0) return event;
    const candidates =
      pool.length > 1 && this.lastMeowFileKey
        ? pool.filter((k) => k !== this.lastMeowFileKey)
        : pool;
    const list = candidates.length > 0 ? candidates : pool;
    const picked = list[Math.floor(Math.random() * list.length)] ?? pool[0]!;
    this.lastMeowFileKey = picked;
    this.lastMeowClipKey = picked;
    return picked;
  }

  play(event: CatSoundEvent, opts?: { intensity?: number; nowMs?: number }): boolean {
    if (this.disposed || this.muted || gameAudio.getSettings().muted) return false;
    const now = opts?.nowMs ?? Date.now();
    const prev = this.lastPlayedAt.get(event) ?? -Infinity;
    if (now - prev < COOLDOWN_MS[event]) return false;
    this.lastPlayedAt.set(event, now);
    this.lastSoundEvent = event;

    const ctx = this.ensureContext();
    if (!ctx) return false;

    const isMeow = event.startsWith('meow_');
    let key: AudioFileKey = event;
    if (isMeow) {
      key = this.pickMeowFileKey(event);
      gameAudio.duckMusicBriefly(1150, 0.54);
    } else if (event === 'eat_crunch') {
      this.crunchAlt = !this.crunchAlt;
      key = this.crunchAlt ? 'eat_crunch_2' : 'eat_crunch';
    }

    const intensity = Math.min(1.2, Math.max(0.15, opts?.intensity ?? 1));
    const dispatchBuffer = async () => {
      if (this.disposed || !this.ctx) return;
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
        try {
          await this.ctx.resume();
        } catch {
          /* wait for browser gesture unlock */
        }
      }
      if (this.disposed || this.muted || gameAudio.getSettings().muted || this.ctx.state !== 'running') {
        return;
      }
      const buf = await this.loadBuffer(key);
      if (!buf || this.disposed || this.muted || !this.ctx || !this.masterGain) return;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        // Keep real cat vocalizations natural — tight pitch range for meows
        src.playbackRate.value = isMeow ? 0.97 + Math.random() * 0.06 : 0.94 + Math.random() * 0.12;
        const g = this.ctx.createGain();
        g.gain.value = BASE_GAIN[event] * intensity;
        src.connect(g);
        g.connect(this.masterGain);
        src.start();
      } catch {
        // Ignore transient WebAudio errors
      }
    };
    void dispatchBuffer();
    return true;
  }

  setPurr(mode: PurrMode): void {
    if (this.disposed) return;
    if (this.muted) mode = 'off';
    if (mode === this.purrMode) return;
    this.purrMode = mode;

    if (mode === 'off') {
      this.stopPurrSmooth();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const key: 'purr_loop' | 'purr_sleep' = mode === 'sleep' ? 'purr_sleep' : 'purr_loop';
    const targetGain = mode === 'sleep' ? 0.24 : 0.36;

    void this.loadBuffer(key).then((buf) => {
      if (!buf || this.disposed || this.muted || this.purrMode !== mode || !this.ctx || !this.masterGain) return;
      this.stopPurrImmediate();
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = this.ctx.createGain();
        const t0 = this.ctx.currentTime;
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(targetGain, t0 + 0.35);
        src.connect(g);
        g.connect(this.masterGain);
        src.start();
        this.purrSource = src;
        this.purrGain = g;
      } catch {
        // Ignore transient WebAudio errors
      }
    });
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  private syncMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
    } catch {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  private async loadBuffer(key: keyof typeof AUDIO_FILES): Promise<AudioBuffer | null> {
    const url = AUDIO_FILES[key];
    const cached = this.bufferCache.get(url);
    if (cached) return cached;
    const inflight = this.loadingMap.get(url);
    if (inflight) return inflight;

    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        if (typeof fetch !== 'function' || !this.ctx) return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        if (this.disposed || !this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(arr);
        this.bufferCache.set(url, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.loadingMap.delete(url);
      }
    })();

    this.loadingMap.set(url, promise);
    return promise;
  }

  private stopPurrSmooth(): void {
    if (!this.ctx || !this.purrSource || !this.purrGain) return;
    const src = this.purrSource;
    const g = this.purrGain;
    this.purrSource = null;
    this.purrGain = null;
    try {
      const t0 = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t0);
      g.gain.setValueAtTime(g.gain.value, t0);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 0.25);
      src.stop(t0 + 0.28);
    } catch {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    }
  }

  private stopPurrImmediate(): void {
    if (this.purrSource) {
      try {
        this.purrSource.stop();
        this.purrSource.disconnect();
      } catch {
        // Ignore
      }
      this.purrSource = null;
    }
    if (this.purrGain) {
      try {
        this.purrGain.disconnect();
      } catch {
        // Ignore
      }
      this.purrGain = null;
    }
  }

  private bindGestureUnlock(): void {
    if (typeof window === 'undefined') return;
    const onGesture = () => this.unlock();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture, { passive: true });
    this.unlockCleanups.push(() => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('keydown', onGesture);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const u of this.unlockCleanups) u();
    this.unlockCleanups.length = 0;
    this.stopPurrImmediate();
    this.bufferCache.clear();
    this.loadingMap.clear();
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      if (typeof ctx.close === 'function') {
        void ctx.close().catch(() => {});
      }
    }
  }
}
