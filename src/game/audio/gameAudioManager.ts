import type { MapId } from '../../shared/types';

export type AudioDomain = 'world' | 'farming' | 'pet' | 'ui';

export type GameSfxName =
  | 'hoe'
  | 'water'
  | 'get_water'
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
  | 'fail'
  | 'meow_soft'
  | 'meow_happy'
  | 'meow_food';

export type MusicTrackId = 'title' | 'farm' | 'town' | 'forest';

export interface GameAudioSettings {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface SpriteClipRange {
  readonly start: number;
  readonly end: number;
  readonly loop?: boolean;
}

export interface AudioSpriteManifest {
  readonly resources: readonly string[];
  readonly spritemap: Readonly<Record<string, SpriteClipRange>>;
  readonly durationSec?: number;
}

export const SFX_DOMAIN_MAP: Readonly<Record<GameSfxName, { domain: AudioDomain; clip: string; fallbackUrl: string }>> = {
  hoe: { domain: 'farming', clip: 'hoe', fallbackUrl: '/assets/audio/sfx/hoe.mp3' },
  plant: { domain: 'farming', clip: 'plant', fallbackUrl: '/assets/audio/sfx/plantSeed.mp3' },
  water: { domain: 'farming', clip: 'water', fallbackUrl: '/assets/audio/sfx/waterPlants.mp3' },
  get_water: { domain: 'farming', clip: 'get_water', fallbackUrl: '/assets/audio/sfx/getWater.mp3' },
  harvest: { domain: 'farming', clip: 'harvest', fallbackUrl: '/assets/audio/sfx/sickle.mp3' },
  axe: { domain: 'farming', clip: 'hoe', fallbackUrl: '/assets/audio/sfx/hoe.mp3' },
  rod: { domain: 'world', clip: 'rod', fallbackUrl: '/assets/audio/sfx/toolSwap.mp3' },
  footstep: { domain: 'world', clip: 'footstep', fallbackUrl: '/assets/audio/sfx/grassyStep.mp3' },
  door: { domain: 'world', clip: 'door', fallbackUrl: '/assets/audio/sfx/doorOpen.mp3' },
  interact: { domain: 'world', clip: 'interact', fallbackUrl: '/assets/audio/sfx/interaction.mp3' },
  ui_select: { domain: 'ui', clip: 'ui_select', fallbackUrl: '/assets/audio/sfx/select.mp3' },
  tool_swap: { domain: 'ui', clip: 'tool_swap', fallbackUrl: '/assets/audio/sfx/toolSwap.mp3' },
  shop_buy: { domain: 'ui', clip: 'shop_buy', fallbackUrl: '/assets/audio/sfx/purchaseClick.mp3' },
  shop_sell: { domain: 'ui', clip: 'shop_sell', fallbackUrl: '/assets/audio/sfx/sell.mp3' },
  fail: { domain: 'ui', clip: 'fail', fallbackUrl: '/assets/audio/sfx/fail.mp3' },
  meow_soft: { domain: 'pet', clip: 'meow_soft', fallbackUrl: '/assets/pet-care-v2/audio/meow_soft.mp3' },
  meow_happy: { domain: 'pet', clip: 'meow_happy', fallbackUrl: '/assets/pet-care-v2/audio/meow_happy.mp3' },
  meow_food: { domain: 'pet', clip: 'meow_food', fallbackUrl: '/assets/pet-care-v2/audio/meow_food.mp3' },
};

const SPRITE_MANIFEST_URLS: Record<AudioDomain, string> = {
  farming: '/assets/audio/sprites/farming.json',
  world: '/assets/audio/sprites/world.json',
  pet: '/assets/audio/sprites/pet.json',
  ui: '/assets/audio/sprites/ui.json',
};

const SPRITE_AUDIO_URLS: Record<AudioDomain, string> = {
  farming: '/assets/audio/sprites/farming.mp3',
  world: '/assets/audio/sprites/world.mp3',
  pet: '/assets/audio/sprites/pet.mp3',
  ui: '/assets/audio/sprites/ui.mp3',
};

const MUSIC_URLS: Record<MusicTrackId, string> = {
  title: '/assets/audio/music/title.mp3',
  farm: '/assets/audio/music/farm.mp3',
  town: '/assets/audio/music/town.mp3',
  forest: '/assets/audio/music/forest.mp3',
};

const STORAGE_KEY = 'olw_audio_settings_v1';
const QUEUED_SFX_MAX_AGE_MS = 450;

const DEFAULT_SETTINGS: GameAudioSettings = {
  muted: false,
  masterVolume: 0.72,
  musicVolume: 0.36,
  sfxVolume: 0.78,
};

function clamp01(v: number, fallback = 0.7): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : fallback));
}

function loadSettings(): GameAudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameAudioSettings>;
    return {
      muted: Boolean(parsed.muted),
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume, DEFAULT_SETTINGS.masterVolume),
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
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

function decodeAudioSafe(ctx: AudioContext, arr: ArrayBuffer): Promise<AudioBuffer | null> {
  return new Promise((resolve) => {
    try {
      const maybePromise = ctx.decodeAudioData(
        arr,
        (decoded) => resolve(decoded),
        () => resolve(null),
      );
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(resolve, () => resolve(null));
      }
    } catch {
      resolve(null);
    }
  });
}

interface LoadedDomainSprite {
  manifest: AudioSpriteManifest;
  buffer: AudioBuffer;
}

interface PendingSfxTrigger {
  domain: AudioDomain;
  clipKey: string;
  fallbackUrl: string | null;
  volumeScale: number;
  rateJitter: number;
  queuedAtMs: number;
}

class GameAudioManager {
  private settings: GameAudioSettings = loadSettings();
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly inflightBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly domainSprites = new Map<AudioDomain, LoadedDomainSprite>();
  private readonly inflightDomains = new Map<AudioDomain, Promise<LoadedDomainSprite | null>>();
  private readonly lastPlayMs = new Map<string, number>();
  private readonly pendingQueue: PendingSfxTrigger[] = [];
  private readonly listeners = new Set<(s: GameAudioSettings) => void>();
  private currentMusicEl: HTMLAudioElement | null = null;
  private currentTrackId: MusicTrackId | null = null;
  private desiredTrackId: MusicTrackId = 'title';
  private overlayPaused = false;
  private unlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const onFirstGesture = () => {
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('touchstart', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
        void this.unlock();
      };
      window.addEventListener('pointerdown', onFirstGesture, { capture: true, passive: true });
      window.addEventListener('touchstart', onFirstGesture, { capture: true, passive: true });
      window.addEventListener('keydown', onFirstGesture, { capture: true, passive: true });
    }
  }

  getSettings(): GameAudioSettings {
    return { ...this.settings };
  }

  getLoadedDomains(): AudioDomain[] {
    return Array.from(this.domainSprites.keys());
  }

  getSpriteDebugInfo(): {
    unlocked: boolean;
    loadedDomains: AudioDomain[];
    queuedCount: number;
  } {
    return {
      unlocked: this.unlocked,
      loadedDomains: this.getLoadedDomains(),
      queuedCount: this.pendingQueue.length,
    };
  }

  subscribe(fn: (s: GameAudioSettings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setSettings(patch: Partial<GameAudioSettings>): void {
    this.settings = {
      muted: patch.muted ?? this.settings.muted,
      masterVolume: clamp01(patch.masterVolume ?? this.settings.masterVolume, this.settings.masterVolume),
      musicVolume: clamp01(patch.musicVolume ?? this.settings.musicVolume, this.settings.musicVolume),
      sfxVolume: clamp01(patch.sfxVolume ?? this.settings.sfxVolume, this.settings.sfxVolume),
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
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    if (ctx) {
      // iOS Safari unlock: play a 1-sample silent buffer synchronously inside the user gesture BEFORE await
      try {
        if (typeof ctx.createBuffer === 'function' && typeof ctx.createBufferSource === 'function') {
          const silent = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = silent;
          src.connect(ctx.destination);
          src.start(0);
        }
      } catch {
        /* ignore Safari unlock noop */
      }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          await ctx.resume();
        } catch {
          /* wait for next gesture */
        }
      }
    }
    this.ensureMusicPlaying();
    this.flushPendingQueue();
  }

  async preloadDomain(domain: AudioDomain): Promise<void> {
    await this.loadDomainSprite(domain);
  }

  private loadDomainSprite(domain: AudioDomain): Promise<LoadedDomainSprite | null> {
    const existing = this.domainSprites.get(domain);
    if (existing) return Promise.resolve(existing);
    const pending = this.inflightDomains.get(domain);
    if (pending) return pending;

    const task = (async () => {
      const ctx = this.ensureCtx();
      if (!ctx || typeof fetch !== 'function') return null;
      try {
        const [manifestRes, audioRes] = await Promise.all([
          fetch(SPRITE_MANIFEST_URLS[domain]),
          fetch(SPRITE_AUDIO_URLS[domain]),
        ]);
        if (!manifestRes.ok || !audioRes.ok) return null;
        const manifest = (await manifestRes.json()) as AudioSpriteManifest;
        const arr = await audioRes.arrayBuffer();
        const decoded = await decodeAudioSafe(ctx, arr);
        if (!decoded || !manifest?.spritemap) return null;
        const loaded: LoadedDomainSprite = { manifest, buffer: decoded };
        this.domainSprites.set(domain, loaded);
        return loaded;
      } catch {
        return null;
      } finally {
        this.inflightDomains.delete(domain);
      }
    })();

    this.inflightDomains.set(domain, task);
    return task;
  }

  private loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflightBuffers.get(url);
    if (pending) return pending;

    const task = (async () => {
      const ctx = this.ensureCtx();
      if (!ctx || typeof fetch !== 'function') return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const decoded = await decodeAudioSafe(ctx, arr);
        if (decoded) this.buffers.set(url, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.inflightBuffers.delete(url);
      }
    })();

    this.inflightBuffers.set(url, task);
    return task;
  }

  playSfx(name: GameSfxName, opts?: { volumeScale?: number; rateJitter?: number; cooldownMs?: number }): void {
    const mapping = SFX_DOMAIN_MAP[name];
    if (!mapping) return;
    this.playDomainSfx(mapping.domain, mapping.clip, {
      ...opts,
      fallbackUrl: mapping.fallbackUrl,
      cooldownKey: name,
    });
  }

  playDomainSfx(
    domain: AudioDomain,
    clipKey: string,
    opts?: {
      volumeScale?: number;
      rateJitter?: number;
      cooldownMs?: number;
      fallbackUrl?: string;
      cooldownKey?: string;
    },
  ): void {
    if (this.settings.muted) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldown = opts?.cooldownMs ?? (clipKey === 'footstep' ? 320 : 50);
    const key = opts?.cooldownKey ?? `${domain}:${clipKey}`;
    const prev = this.lastPlayMs.get(key) ?? -Infinity;
    if (now - prev < cooldown) return;
    this.lastPlayMs.set(key, now);

    const ctx = this.ensureCtx();
    if (!ctx) return;

    const volumeScale = Number.isFinite(opts?.volumeScale) ? Math.max(0, Math.min(2, opts!.volumeScale!)) : 1;
    const rateJitter = Number.isFinite(opts?.rateJitter) ? Math.max(0, Math.min(0.3, opts!.rateJitter!)) : 0.06;

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => this.flushPendingQueue())
        .catch(() => {});
      this.enqueuePending({
        domain,
        clipKey,
        fallbackUrl: opts?.fallbackUrl ?? null,
        volumeScale,
        rateJitter,
        queuedAtMs: now,
      });
      void this.loadDomainSprite(domain);
      return;
    }

    const sprite = this.domainSprites.get(domain);
    if (sprite && this.playFromSprite(ctx, sprite, clipKey, volumeScale, rateJitter)) {
      return;
    }

    void this.loadDomainSprite(domain).then((loaded) => {
      if (this.settings.muted) return;
      if (loaded && this.ctx?.state === 'running') {
        if (this.playFromSprite(this.ctx, loaded, clipKey, volumeScale, rateJitter)) {
          return;
        }
      }
      if (opts?.fallbackUrl && this.ctx) {
        void this.loadBuffer(opts.fallbackUrl).then((buf) => {
          if (buf && this.ctx?.state === 'running' && !this.settings.muted) {
            this.playBufferSlice(this.ctx, buf, 0, buf.duration, volumeScale, rateJitter);
          }
        });
      }
    });
  }

  private enqueuePending(entry: PendingSfxTrigger): void {
    if (this.pendingQueue.length >= 6) {
      this.pendingQueue.shift();
    }
    this.pendingQueue.push(entry);
  }

  private flushPendingQueue(): void {
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running' || this.pendingQueue.length === 0) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const items = this.pendingQueue.splice(0, this.pendingQueue.length);
    for (const item of items) {
      if (now - item.queuedAtMs > QUEUED_SFX_MAX_AGE_MS) continue;
      const sprite = this.domainSprites.get(item.domain);
      if (sprite && this.playFromSprite(ctx, sprite, item.clipKey, item.volumeScale, item.rateJitter)) {
        continue;
      }
      void this.loadDomainSprite(item.domain).then((loaded) => {
        if (this.settings.muted || !this.ctx || this.ctx.state !== 'running') return;
        if (loaded && this.playFromSprite(this.ctx, loaded, item.clipKey, item.volumeScale, item.rateJitter)) {
          return;
        }
        if (item.fallbackUrl) {
          void this.loadBuffer(item.fallbackUrl).then((buf) => {
            if (buf && this.ctx?.state === 'running' && !this.settings.muted) {
              this.playBufferSlice(this.ctx, buf, 0, buf.duration, item.volumeScale, item.rateJitter);
            }
          });
        }
      });
    }
  }

  private playFromSprite(
    ctx: AudioContext,
    sprite: LoadedDomainSprite,
    clipKey: string,
    scale: number,
    jitter: number,
  ): boolean {
    const range = sprite.manifest.spritemap[clipKey];
    if (!range) return false;
    const startSec = Math.max(0, Number.isFinite(range.start) ? range.start : 0);
    const endSec = Math.min(sprite.buffer.duration, Number.isFinite(range.end) ? range.end : sprite.buffer.duration);
    const durationSec = Math.max(0.01, endSec - startSec);
    if (!Number.isFinite(durationSec) || durationSec <= 0) return false;
    this.playBufferSlice(ctx, sprite.buffer, startSec, durationSec, scale, jitter);
    return true;
  }

  private playBufferSlice(
    ctx: AudioContext,
    buf: AudioBuffer,
    offsetSec: number,
    durationSec: number,
    scale: number,
    jitter: number,
  ): void {
    const vol = clamp01(this.settings.masterVolume * this.settings.sfxVolume * scale, 0.6);
    if (vol <= 0.005 || ctx.state !== 'running') return;
    const safeOffset = Math.max(0, Math.min(buf.duration, Number.isFinite(offsetSec) ? offsetSec : 0));
    const safeDuration = Math.max(0.01, Math.min(buf.duration - safeOffset, Number.isFinite(durationSec) ? durationSec : buf.duration));
    if (safeDuration <= 0.005) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (jitter > 0) {
        src.playbackRate.value = Math.max(0.5, Math.min(2, 1 + (Math.random() * 2 - 1) * jitter));
      }
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain).connect(ctx.destination);
      src.start(0, safeOffset, safeDuration);
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
    return clamp01(this.settings.masterVolume * this.settings.musicVolume, 0.3);
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
