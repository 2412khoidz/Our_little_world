import type { MapId } from '../../shared/types';

export type GameSfxName =
  | 'hoe'
  | 'water'
  | 'plant'
  | 'harvest'
  | 'axe'
  | 'rod'
  | 'footstep'
  | 'door'
  | 'interact'
  | 'shop_buy'
  | 'shop_sell'
  | 'ui_select'
  | 'tool_swap'
  | 'fail';

export type MusicTrackId = 'title' | 'farm' | 'town' | 'forest';

export interface GameAudioSettings {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

const STORAGE_KEY = 'olw_audio_settings_v1';

const SFX_URLS: Record<GameSfxName, string> = {
  hoe: '/assets/audio/sfx/hoe.mp3',
  water: '/assets/audio/sfx/waterPlants.mp3',
  plant: '/assets/audio/sfx/plantSeed.mp3',
  harvest: '/assets/audio/sfx/sickle.mp3',
  axe: '/assets/audio/sfx/hoe.mp3',
  rod: '/assets/audio/sfx/toolSwap.mp3',
  footstep: '/assets/audio/sfx/grassyStep.mp3',
  door: '/assets/audio/sfx/doorOpen.mp3',
  interact: '/assets/audio/sfx/interaction.mp3',
  shop_buy: '/assets/audio/sfx/purchaseClick.mp3',
  shop_sell: '/assets/audio/sfx/sell.mp3',
  ui_select: '/assets/audio/sfx/select.mp3',
  tool_swap: '/assets/audio/sfx/toolSwap.mp3',
  fail: '/assets/audio/sfx/fail.mp3',
};

const MUSIC_URLS: Record<MusicTrackId, string> = {
  title: '/assets/audio/music/title.mp3',
  farm: '/assets/audio/music/farm.mp3',
  town: '/assets/audio/music/town.mp3',
  forest: '/assets/audio/music/forest.mp3',
};

const DEFAULT_SETTINGS: GameAudioSettings = {
  muted: false,
  masterVolume: 0.72,
  musicVolume: 0.36,
  sfxVolume: 0.78,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.7));
}

function loadSettings(): GameAudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameAudioSettings>;
    return {
      muted: Boolean(parsed.muted),
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume),
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function musicTrackForMap(mapId: MapId): MusicTrackId {
  switch (mapId) {
    case 'home':
    case 'garden':
      return 'title';
    case 'farm':
      return 'farm';
    case 'forest':
    case 'beach':
    case 'outdoor':
      return 'forest';
    default:
      return 'town';
  }
}

class GameAudioManager {
  private settings: GameAudioSettings = loadSettings();
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly inflight = new Map<string, Promise<AudioBuffer | null>>();
  private readonly lastPlayMs = new Map<GameSfxName, number>();
  private readonly listeners = new Set<(s: GameAudioSettings) => void>();
  private currentMusicEl: HTMLAudioElement | null = null;
  private currentTrackId: MusicTrackId | null = null;
  private desiredTrackId: MusicTrackId = 'title';
  private overlayPaused = false;
  private unlocked = false;

  getSettings(): GameAudioSettings {
    return { ...this.settings };
  }

  subscribe(fn: (s: GameAudioSettings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setSettings(patch: Partial<GameAudioSettings>): void {
    this.settings = {
      muted: patch.muted ?? this.settings.muted,
      masterVolume: clamp01(patch.masterVolume ?? this.settings.masterVolume),
      musicVolume: clamp01(patch.musicVolume ?? this.settings.musicVolume),
      sfxVolume: clamp01(patch.sfxVolume ?? this.settings.sfxVolume),
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        /* ignore storage quota */
      }
    }
    this.syncMusicVolume();
    for (const fn of this.listeners) fn(this.getSettings());
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    this.unlocked = true;
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* wait for next gesture */
      }
    }
    this.ensureMusicPlaying();
  }

  private loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflight.get(url);
    if (pending) return pending;

    const task = (async () => {
      const ctx = this.ensureCtx();
      if (!ctx || typeof fetch !== 'function') return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arr);
        this.buffers.set(url, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.inflight.delete(url);
      }
    })();
    this.inflight.set(url, task);
    return task;
  }

  playSfx(name: GameSfxName, opts?: { volumeScale?: number; rateJitter?: number; cooldownMs?: number }): void {
    if (this.settings.muted) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldown = opts?.cooldownMs ?? (name === 'footstep' ? 320 : 60);
    const prev = this.lastPlayMs.get(name) ?? 0;
    if (now - prev < cooldown) return;
    this.lastPlayMs.set(name, now);

    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const url = SFX_URLS[name];
    const cached = this.buffers.get(url);
    if (cached) {
      this.playBuffer(ctx, cached, opts?.volumeScale ?? 1, opts?.rateJitter ?? 0.06);
      return;
    }

    void this.loadBuffer(url).then((buf) => {
      if (!buf || this.settings.muted) return;
      if (ctx.state === 'running') {
        this.playBuffer(ctx, buf, opts?.volumeScale ?? 1, opts?.rateJitter ?? 0.06);
      }
    });
  }

  private playBuffer(ctx: AudioContext, buf: AudioBuffer, scale: number, jitter: number): void {
    const vol = clamp01(this.settings.masterVolume * this.settings.sfxVolume * scale);
    if (vol <= 0.005 || ctx.state !== 'running') return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (jitter > 0) {
        src.playbackRate.value = 1 + (Math.random() * 2 - 1) * jitter;
      }
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain).connect(ctx.destination);
      src.start(0);
    } catch {
      /* ignore audio start failure */
    }
  }

  setZoneMusic(mapId: MapId): void {
    const track = musicTrackForMap(mapId);
    this.desiredTrackId = track;
    if (!this.unlocked || this.overlayPaused) return;
    this.ensureMusicPlaying();
  }

  setOverlayPaused(paused: boolean): void {
    this.overlayPaused = paused;
    this.syncMusicVolume();
  }

  private targetMusicVol(): number {
    if (this.settings.muted || this.overlayPaused) return 0;
    return clamp01(this.settings.masterVolume * this.settings.musicVolume);
  }

  private syncMusicVolume(): void {
    if (!this.currentMusicEl) return;
    const v = this.targetMusicVol();
    this.currentMusicEl.volume = v;
    if (v <= 0.001) {
      this.currentMusicEl.pause();
    } else if (this.unlocked && this.currentMusicEl.paused) {
      void this.currentMusicEl.play().catch(() => {});
    }
  }

  private ensureMusicPlaying(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (this.currentTrackId === this.desiredTrackId && this.currentMusicEl) {
      this.syncMusicVolume();
      return;
    }

    const prevEl = this.currentMusicEl;
    if (prevEl) {
      const fadePrev = window.setInterval(() => {
        if (prevEl.volume <= 0.03) {
          window.clearInterval(fadePrev);
          prevEl.pause();
          prevEl.src = '';
        } else {
          prevEl.volume = Math.max(0, prevEl.volume - 0.04);
        }
      }, 45);
    }

    this.currentTrackId = this.desiredTrackId;
    try {
      const next = new Audio(MUSIC_URLS[this.desiredTrackId]);
      next.loop = true;
      next.volume = this.targetMusicVol();
      this.currentMusicEl = next;
      if (this.targetMusicVol() > 0.001) {
        void next.play().catch(() => {});
      }
    } catch {
      this.currentMusicEl = null;
    }
  }
}

export const gameAudio = new GameAudioManager();
