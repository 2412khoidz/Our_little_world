// Muted-by-default Web Audio gentle study soundscapes (0đ, zero external files).

export type AmbientTrack = 'none' | 'rain' | 'hearth';

interface AmbientGraphHandle {
  ctx: AudioContext;
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

const activeHandles = new Set<AmbientGraphHandle>();
let currentTrack: AmbientTrack = 'none';
let suspendedForOverlay = false;
let suspendedTrack: AmbientTrack = 'none';

export function getActiveAmbientTrack(): AmbientTrack {
  return currentTrack;
}

function disposeHandle(handle: AmbientGraphHandle): void {
  try {
    const now = typeof handle.ctx.currentTime === 'number' ? handle.ctx.currentTime : 0;
    handle.gain.gain.cancelScheduledValues?.(now);
    handle.gain.gain.setValueAtTime?.(0, now);
    handle.gain.gain.value = 0;
  } catch {
    // Ignore gain zeroing errors
  }
  try {
    handle.src.stop(0);
  } catch {
    // Ignore stop on already stopped node
  }
  try {
    handle.src.disconnect();
    handle.filter.disconnect();
    handle.gain.disconnect();
  } catch {
    // Ignore disconnect errors
  }
  if (typeof handle.ctx.suspend === 'function') {
    void Promise.resolve(handle.ctx.suspend()).catch(() => {});
  }
  if (typeof handle.ctx.close === 'function') {
    void Promise.resolve(handle.ctx.close()).catch(() => {});
  }
}

export function stopStudyAmbient(): void {
  currentTrack = 'none';
  suspendedForOverlay = false;
  suspendedTrack = 'none';
  for (const handle of activeHandles) {
    disposeHandle(handle);
  }
  activeHandles.clear();
}

export function suspendStudyAmbient(): void {
  if (currentTrack === 'none' || suspendedForOverlay) return;
  suspendedTrack = currentTrack;
  suspendedForOverlay = true;
  for (const handle of activeHandles) {
    if (handle.ctx.state === 'running' && typeof handle.ctx.suspend === 'function') {
      void Promise.resolve(handle.ctx.suspend()).catch(() => {});
    }
  }
}

export function resumeStudyAmbient(): void {
  if (!suspendedForOverlay) return;
  const targetTrack = suspendedTrack;
  suspendedForOverlay = false;
  suspendedTrack = 'none';
  if (targetTrack === 'none') return;
  if (activeHandles.size > 0 && currentTrack === targetTrack) {
    for (const handle of activeHandles) {
      if (typeof handle.ctx.resume === 'function') {
        void Promise.resolve(handle.ctx.resume()).catch(() => {});
      }
    }
    return;
  }
  setStudyAmbientTrack(targetTrack);
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
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void Promise.resolve(ctx.resume()).catch(() => {});
    }
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
    src.start(0);

    activeHandles.add({ ctx, src, filter, gain });
    currentTrack = track;
    return track;
  } catch {
    stopStudyAmbient();
    return 'none';
  }
}
