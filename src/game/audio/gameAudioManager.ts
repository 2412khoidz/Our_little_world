import type { MapId } from '../../shared/types';
import {
  CatVocalizationScheduler,
  type CatVocalContext,
} from '../../shared/audio/catVocalizationScheduler';
import {
  footstepSfxForSurface,
  type SurfaceFootstepKind,
} from '../../shared/audio/surfaceFootsteps';

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
  | 'footstep_grass'
  | 'footstep_soil'
  | 'footstep_sand'
  | 'footstep_wood'
  | 'footstep_stone'
  | 'footstep_water'
  | 'door'
  | 'interact'
  | 'shop_buy'
  | 'shop_sell'
  | 'ui_select'
  | 'tool_swap'
  | 'fail'
  | 'meow_soft'
  | 'meow_happy'
  | 'meow_food'
  | 'meow_short'
  | 'meow_chirp'
  | 'stinger_item'
  | 'stinger_fish'
  | 'stinger_rare'
  | 'stinger_quest'
  | 'stinger_area';

export type MusicTrackId = 'title' | 'garden' | 'farm' | 'town' | 'forest' | 'beach';

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
  footstep_grass: { domain: 'world', clip: 'footstep_grass', fallbackUrl: '/assets/audio/sfx/grassyStep.mp3' },
  footstep_soil: { domain: 'world', clip: 'footstep_soil', fallbackUrl: '/assets/audio/sfx/step_soil.mp3' },
  footstep_sand: { domain: 'world', clip: 'footstep_sand', fallbackUrl: '/assets/audio/sfx/step_sand.mp3' },
  footstep_wood: { domain: 'world', clip: 'footstep_wood', fallbackUrl: '/assets/audio/sfx/step_wood.mp3' },
  footstep_stone: { domain: 'world', clip: 'footstep_stone', fallbackUrl: '/assets/audio/sfx/step_stone.mp3' },
  footstep_water: { domain: 'world', clip: 'footstep_water', fallbackUrl: '/assets/audio/sfx/step_water.mp3' },
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
  meow_short: { domain: 'pet', clip: 'meow_short', fallbackUrl: '/assets/pet-care-v2/audio/meow_short.mp3' },
  meow_chirp: { domain: 'pet', clip: 'meow_chirp', fallbackUrl: '/assets/pet-care-v2/audio/meow_chirp.mp3' },
  stinger_item: { domain: 'ui', clip: 'stinger_item', fallbackUrl: '/assets/audio/sfx/stinger_item.mp3' },
  stinger_fish: { domain: 'ui', clip: 'stinger_fish', fallbackUrl: '/assets/audio/sfx/stinger_fish.mp3' },
  stinger_rare: { domain: 'ui', clip: 'stinger_rare', fallbackUrl: '/assets/audio/sfx/stinger_rare.mp3' },
  stinger_quest: { domain: 'ui', clip: 'stinger_quest', fallbackUrl: '/assets/audio/sfx/stinger_quest.mp3' },
  stinger_area: { domain: 'ui', clip: 'stinger_area', fallbackUrl: '/assets/audio/sfx/stinger_area.mp3' },
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
  garden: '/assets/audio/music/garden.mp3',
  farm: '/assets/audio/music/farm.mp3',
  town: '/assets/audio/music/town.mp3',
  forest: '/assets/audio/music/blue_forest.mp3',
  beach: '/assets/audio/music/forest.mp3',
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

export function musicTrackForMap(mapId: MapId): MusicTrackId {
  switch (mapId) {
    case 'home':
      return 'title';
    case 'garden':
    case 'outdoor':
      return 'garden';
    case 'farm':
      return 'farm';
    case 'forest':
      return 'forest';
    case 'beach':
      return 'beach';
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
  playbackRate?: number;
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
  private readonly catVoice = new CatVocalizationScheduler();
  private currentMusicEl: HTMLAudioElement | null = null;
  private currentTrackId: MusicTrackId | null = null;
  private desiredTrackId: MusicTrackId = 'title';
  private overlayPaused = false;
  private unlocked = false;
  private surfNodes: { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode } | null = null;

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

  getActiveMusicTrackId(): MusicTrackId | null {
    return this.currentTrackId;
  }

  getDesiredMusicTrackId(): MusicTrackId {
    return this.desiredTrackId;
  }

  getSpriteDebugInfo(): {
    unlocked: boolean;
    loadedDomains: AudioDomain[];
    queuedCount: number;
    musicTrack: MusicTrackId;
  } {
    return {
      unlocked: this.unlocked,
      loadedDomains: this.getLoadedDomains(),
      queuedCount: this.pendingQueue.length,
      musicTrack: this.desiredTrackId,
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
    this.syncCoastalAmbience();
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
    this.syncCoastalAmbience();
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

  playSfx(
    name: GameSfxName,
    opts?: { volumeScale?: number; rateJitter?: number; cooldownMs?: number; playbackRate?: number },
  ): void {
    const mapping = SFX_DOMAIN_MAP[name];
    if (!mapping) return;
    this.playDomainSfx(mapping.domain, mapping.clip, {
      ...opts,
      fallbackUrl: mapping.fallbackUrl,
      cooldownKey: name,
    });
  }

  playFootstepForSurface(surface: SurfaceFootstepKind, opts?: { running?: boolean }): void {
    const running = Boolean(opts?.running);
    const sfx = footstepSfxForSurface(surface);
    this.playSfx(sfx, {
      volumeScale: surface === 'water' ? 0.42 : running ? 0.44 : 0.33,
      cooldownMs: running ? 240 : 340,
      rateJitter: 0.08,
    });
  }

  playNaturalCatMeow(
    context: CatVocalContext,
    opts?: { isSleeping?: boolean; force?: boolean },
  ): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pick = this.catVoice.pick(context, now, opts);
    if (!pick) return false;
    this.playSfx(pick.clip, {
      volumeScale: pick.volumeScale * 0.65,
      playbackRate: pick.playbackRate,
      rateJitter: 0,
      cooldownMs: 300,
    });
    return true;
  }

  playStinger(kind: 'item' | 'fish' | 'rare' | 'quest' | 'area'): void {
    const sfx: GameSfxName =
      kind === 'fish'
        ? 'stinger_fish'
        : kind === 'rare'
          ? 'stinger_rare'
          : kind === 'quest'
            ? 'stinger_quest'
            : kind === 'area'
              ? 'stinger_area'
              : 'stinger_item';
    this.playSfx(sfx, {
      volumeScale: kind === 'rare' || kind === 'quest' ? 0.92 : 0.84,
      rateJitter: 0,
      cooldownMs: 250,
    });
  }

  playDomainSfx(
    domain: AudioDomain,
    clipKey: string,
    opts?: {
      volumeScale?: number;
      rateJitter?: number;
      cooldownMs?: number;
      playbackRate?: number;
      fallbackUrl?: string;
      cooldownKey?: string;
    },
  ): void {
    if (this.settings.muted) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isStep = clipKey === 'footstep' || clipKey.startsWith('footstep_');
    const cooldown = opts?.cooldownMs ?? (isStep ? 320 : 50);
    const key = opts?.cooldownKey ?? `${domain}:${clipKey}`;
    const prev = this.lastPlayMs.get(key) ?? -Infinity;
    if (now - prev < cooldown) return;
    this.lastPlayMs.set(key, now);

    const ctx = this.ensureCtx();
    if (!ctx) return;

    const volumeScale = Number.isFinite(opts?.volumeScale) ? Math.max(0, Math.min(2, opts!.volumeScale!)) : 1;
    const rateJitter = Number.isFinite(opts?.rateJitter) ? Math.max(0, Math.min(0.3, opts!.rateJitter!)) : 0.06;
    const playbackRate = opts?.playbackRate;

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          this.syncCoastalAmbience();
          this.flushPendingQueue();
        })
        .catch(() => {});
      this.enqueuePending({
        domain,
        clipKey,
        fallbackUrl: opts?.fallbackUrl ?? null,
        volumeScale,
        rateJitter,
        playbackRate,
        queuedAtMs: now,
      });
      void this.loadDomainSprite(domain);
      return;
    }

    const sprite = this.domainSprites.get(domain);
    if (sprite && this.playFromSprite(ctx, sprite, clipKey, volumeScale, rateJitter, playbackRate)) {
      return;
    }

    void this.loadDomainSprite(domain).then((loaded) => {
      if (this.settings.muted) return;
      if (loaded && this.ctx?.state === 'running') {
        if (this.playFromSprite(this.ctx, loaded, clipKey, volumeScale, rateJitter, playbackRate)) {
          return;
        }
      }
      if (opts?.fallbackUrl && this.ctx) {
        void this.loadBuffer(opts.fallbackUrl).then((buf) => {
          if (buf && this.ctx?.state === 'running' && !this.settings.muted) {
            this.playBufferSlice(this.ctx, buf, 0, buf.duration, volumeScale, rateJitter, playbackRate);
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
      if (sprite && this.playFromSprite(ctx, sprite, item.clipKey, item.volumeScale, item.rateJitter, item.playbackRate)) {
        continue;
      }
      void this.loadDomainSprite(item.domain).then((loaded) => {
        if (this.settings.muted || !this.ctx || this.ctx.state !== 'running') return;
        if (loaded && this.playFromSprite(this.ctx, loaded, item.clipKey, item.volumeScale, item.rateJitter, item.playbackRate)) {
          return;
        }
        if (item.fallbackUrl) {
          void this.loadBuffer(item.fallbackUrl).then((buf) => {
            if (buf && this.ctx?.state === 'running' && !this.settings.muted) {
              this.playBufferSlice(this.ctx, buf, 0, buf.duration, item.volumeScale, item.rateJitter, item.playbackRate);
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
    explicitRate?: number,
  ): boolean {
    const range = sprite.manifest.spritemap[clipKey];
    if (!range) return false;
    const startSec = Math.max(0, Number.isFinite(range.start) ? range.start : 0);
    const endSec = Math.min(sprite.buffer.duration, Number.isFinite(range.end) ? range.end : sprite.buffer.duration);
    const durationSec = Math.max(0.01, endSec - startSec);
    if (!Number.isFinite(durationSec) || durationSec <= 0) return false;
    this.playBufferSlice(ctx, sprite.buffer, startSec, durationSec, scale, jitter, explicitRate);
    return true;
  }

  private playBufferSlice(
    ctx: AudioContext,
    buf: AudioBuffer,
    offsetSec: number,
    durationSec: number,
    scale: number,
    jitter: number,
    explicitRate?: number,
  ): void {
    const vol = clamp01(this.settings.masterVolume * this.settings.sfxVolume * scale, 0.6);
    if (vol <= 0.005 || ctx.state !== 'running') return;
    const safeOffset = Math.max(0, Math.min(buf.duration, Number.isFinite(offsetSec) ? offsetSec : 0));
    const safeDuration = Math.max(0.01, Math.min(buf.duration - safeOffset, Number.isFinite(durationSec) ? durationSec : buf.duration));
    if (safeDuration <= 0.005) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (typeof explicitRate === 'number' && Number.isFinite(explicitRate)) {
        src.playbackRate.value = Math.max(0.5, Math.min(2, explicitRate));
      } else if (jitter > 0) {
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

  private syncCoastalAmbience(): void {
    const wantSurf =
      this.unlocked &&
      !this.settings.muted &&
      !this.overlayPaused &&
      this.desiredTrackId === 'beach' &&
      this.targetMusicVol() > 0.005;

    if (!wantSurf) {
      if (this.surfNodes) {
        try {
          this.surfNodes.src.stop();
          this.surfNodes.lfo.stop();
          this.surfNodes.gain.disconnect();
        } catch {
          /* ignore stop cleanup */
        }
        this.surfNodes = null;
      }
      return;
    }

    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== 'running' || typeof ctx.createBiquadFilter !== 'function' || typeof ctx.createOscillator !== 'function') {
      return;
    }

    const surfVol = clamp01(this.targetMusicVol() * 0.14, 0.04);
    if (this.surfNodes) {
      this.surfNodes.gain.gain.value = surfVol;
      return;
    }

    try {
      const len = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.035 * white) / 1.035;
        data[i] = last * 1.8;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 240;
      lfo.connect(lfoGain).connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.value = surfVol;

      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
      lfo.start();
      this.surfNodes = { src, lfo, gain };
    } catch {
      this.surfNodes = null;
    }
  }

  setZoneMusic(mapId: MapId): void {
    const track = musicTrackForMap(mapId);
    this.desiredTrackId = track;
    if (!this.unlocked || this.overlayPaused) {
      this.syncCoastalAmbience();
      return;
    }
    this.ensureMusicPlaying();
    this.syncCoastalAmbience();
  }

  setOverlayPaused(paused: boolean): void {
    this.overlayPaused = paused;
    this.syncMusicVolume();
    this.syncCoastalAmbience();
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
