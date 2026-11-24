// Muted-by-default Web Audio gentle study soundscapes (0đ, zero external files).

export type AmbientTrack = 'none' | 'rain' | 'hearth';

let activeCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let currentTrack: AmbientTrack = 'none';

export function getActiveAmbientTrack(): AmbientTrack {
  return currentTrack;
}

export function stopStudyAmbient(): void {
  currentTrack = 'none';
  try {
    activeSource?.stop();
    activeSource?.disconnect();
  } catch {
    // Ignore stop on already stopped node
  }
  activeSource = null;
  if (activeCtx) {
    void activeCtx.close().catch(() => {});
    activeCtx = null;
  }
}

export function setStudyAmbientTrack(track: AmbientTrack): AmbientTrack {
  stopStudyAmbient();
  if (track === 'none' || typeof window === 'undefined') {
    return 'none';
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return 'none';

  try {
    const ctx = new AudioCtx();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);

    // Filtered soft noise buffer (rain or subtle hearth warmth)
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      ch[i] = last * 0.45;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track === 'rain' ? 920 : 420;

    const gain = ctx.createGain();
    gain.gain.value = track === 'rain' ? 0.14 : 0.18;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    activeCtx = ctx;
    activeSource = src;
    currentTrack = track;
    return track;
  } catch {
    return 'none';
  }
}
