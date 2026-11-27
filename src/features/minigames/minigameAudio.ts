/** Lightweight Web Audio feedback (0₫, no external assets). */

const MUTE_KEY = 'olw-minigame-sound-muted';

function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();

export function isMinigameSoundMuted(): boolean {
  return muted;
}

export function setMinigameSoundMuted(next: boolean): void {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function beep(freq: number, durationMs: number, gain = 0.06): void {
  if (muted || typeof window === 'undefined') return;
  const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
  void ctx.close();
}

export type MinigameSoundKind = 'place' | 'flip' | 'match' | 'miss' | 'hit' | 'splash' | 'win';

export function playMinigameChime(kind: MinigameSoundKind): void {
  switch (kind) {
    case 'place':
      beep(520, 55);
      break;
    case 'flip':
      beep(380, 40, 0.05);
      break;
    case 'match':
      beep(660, 90);
      setTimeout(() => beep(880, 70), 70);
      break;
    case 'miss':
      beep(220, 120, 0.045);
      break;
    case 'hit':
      beep(180, 80, 0.07);
      break;
    case 'splash':
      beep(300, 50, 0.04);
      break;
    case 'win':
      beep(587, 80);
      setTimeout(() => beep(740, 100), 90);
      break;
  }
}