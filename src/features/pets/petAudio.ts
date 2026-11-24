// Soft synthesized Web Audio feedback for pet interactions (0đ, zero external audio assets).
// Respects 20s ambient cooldown and hard-mutes when Pomodoro Quiet Study mode is active.

let lastSoundAtMs = 0;
let petMuted = false;

export function isPetSoundMuted(): boolean {
  return petMuted;
}

export function setPetSoundMuted(muted: boolean): void {
  petMuted = muted;
}

export function playPetFeedbackChime(
  kind: 'pet' | 'feed' | 'water' | 'adopt',
  studyQuietActive = false,
): void {
  if (petMuted || studyQuietActive || typeof window === 'undefined') return;
  const now = Date.now();
  if (kind === 'pet' && now - lastSoundAtMs < 800) return;
  lastSoundAtMs = now;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = kind === 'feed' ? 520 : kind === 'adopt' ? 660 : 587;
    const endFreq = kind === 'feed' ? 780 : kind === 'adopt' ? 880 : 740;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 350);
  } catch {
    // Ignore autoplay-blocked AudioContext on first gesture
  }
}
