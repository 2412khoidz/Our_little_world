/** Lightweight procedural Web Audio SFX for fishing minigame (no network fetches). */

let sharedCtx: AudioContext | null = null;
let muted = false;

export function isFishingAudioMuted(): boolean {
  return muted;
}

export function setFishingAudioMuted(next: boolean): void {
  muted = next;
}

function getAudioContext(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!sharedCtx) sharedCtx = new AudioCtor();
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume().catch(() => undefined);
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  gainPeak = 0.08,
  delaySec = 0,
): void {
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + durationSec);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

export function playCastWhoosh(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 'triangle', 480, 190, 0.14, 0.06);
}

export function playWaterSplash(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 'sine', 210, 460, 0.12, 0.07);
  tone(ctx, 'sine', 340, 620, 0.09, 0.04, 0.06);
}

export function playBiteAlert(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 'triangle', 784, 784, 0.09, 0.11, 0);
  tone(ctx, 'triangle', 1046, 1175, 0.14, 0.12, 0.075);
}

export function playReelTick(inSweetSpot: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (inSweetSpot) {
    tone(ctx, 'triangle', 520, 680, 0.08, 0.08);
  } else {
    tone(ctx, 'sawtooth', 190, 140, 0.09, 0.05);
  }
}

export function playCatchFanfare(rare = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Original JRPG-inspired bright item-get fanfare (dotted uplift motif)
  const melody: ReadonlyArray<readonly [number, number, number]> = rare
    ? [
        [523.25, 0.0, 0.09],
        [523.25, 0.085, 0.08],
        [659.25, 0.17, 0.11],
        [783.99, 0.28, 0.11],
        [987.77, 0.39, 0.11],
        [1046.5, 0.51, 0.28],
        [1318.5, 0.52, 0.26],
      ]
    : [
        [523.25, 0.0, 0.09],
        [659.25, 0.085, 0.09],
        [783.99, 0.17, 0.11],
        [1046.5, 0.28, 0.24],
      ];
  for (const [freq, delay, dur] of melody) {
    tone(ctx, 'triangle', freq, freq * 1.01, dur, 0.095, delay);
  }
}

export function playEscapeSplash(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 'sine', 360, 150, 0.22, 0.08);
  tone(ctx, 'sine', 220, 110, 0.18, 0.06, 0.09);
}
