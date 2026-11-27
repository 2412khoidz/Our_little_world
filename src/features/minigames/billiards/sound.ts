/**
 * Procedural Web Audio billiards foley (zero audio asset files).
 * Supports OLW global masterVolume and clean AudioContext disposal on exit.
 */
class BilliardsSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastHit = 0;
  public muted = false;
  private volume = 1;

  public setMasterVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(m ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  public dispose(): void {
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore already disconnected gain node
      }
      this.masterGain = null;
    }
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.noiseBuf = null;
      this.lastHit = 0;
      void ctx.close().catch(() => {});
    }
  }

  private get out(): AudioNode | null {
    return this.masterGain;
  }

  public playCue(powerRatio: number): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuf || !this.out) return;
    const now = this.ctx.currentTime;
    const p = Math.max(0.12, Math.min(1, powerRatio));

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950 + p * 1100, now);
    bp.Q.setValueAtTime(2.8, now);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.45 * p, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
    src.connect(bp);
    bp.connect(g1);
    g1.connect(this.out);
    src.start(now);
    src.stop(now + 0.02);

    const osc = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(155 + p * 55, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.055);
    g2.gain.setValueAtTime(0.32 * p, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(g2);
    g2.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playBallHit(speed: number): void {
    if (this.muted || this.volume <= 0 || speed < 18) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuf || !this.out) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHit < 0.012) return;
    this.lastHit = now;

    const norm = Math.min(1, Math.pow(speed / 1050, 0.78));
    const vol = Math.min(0.62, 0.05 + norm * 0.55);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3400 + Math.random() * 800, now);
    bp.Q.setValueAtTime(1.6, now);
    const gN = this.ctx.createGain();
    gN.gain.setValueAtTime(vol * 0.9, now);
    gN.gain.exponentialRampToValueAtTime(0.001, now + 0.007);
    src.connect(bp);
    bp.connect(gN);
    gN.connect(this.out);
    src.start(now);
    src.stop(now + 0.01);

    [2780 + Math.random() * 180, 4580 + Math.random() * 240].forEach((freq, idx) => {
      if (!this.ctx || !this.out) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol * (idx === 0 ? 0.36 : 0.2), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (idx === 0 ? 0.02 : 0.013));
      osc.connect(g);
      g.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.024);
    });
  }

  public playCushion(speed: number): void {
    if (this.muted || this.volume <= 0 || speed < 24) return;
    this.playCushionNorm(Math.min(1, speed / 950));
  }

  public playBallHitMetric(speedMps: number): void {
    if (this.muted || this.volume <= 0 || speedMps < 0.06) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuf || !this.out) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHit < 0.012) return;
    this.lastHit = now;

    const norm = Math.min(1, Math.pow(speedMps / 3.2, 0.78));
    const vol = Math.min(0.65, 0.05 + norm * 0.58);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3400 + Math.random() * 800, now);
    bp.Q.setValueAtTime(1.6, now);
    const gN = this.ctx.createGain();
    gN.gain.setValueAtTime(vol * 0.9, now);
    gN.gain.exponentialRampToValueAtTime(0.001, now + 0.007);
    src.connect(bp);
    bp.connect(gN);
    gN.connect(this.out);
    src.start(now);
    src.stop(now + 0.01);

    [2780 + Math.random() * 180, 4580 + Math.random() * 240].forEach((freq, idx) => {
      if (!this.ctx || !this.out) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol * (idx === 0 ? 0.36 : 0.2), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (idx === 0 ? 0.02 : 0.013));
      osc.connect(g);
      g.connect(this.out);
      osc.start(now);
      osc.stop(now + 0.024);
    });
  }

  public playCushionMetric(speedMps: number): void {
    if (this.muted || this.volume <= 0 || speedMps < 0.08) return;
    this.playCushionNorm(Math.min(1, speedMps / 3.0));
  }

  private playCushionNorm(norm: number): void {
    this.unlock();
    if (!this.ctx || !this.noiseBuf || !this.out) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.4, 0.04 + norm * 0.34);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(280 + norm * 160, now);
    const gN = this.ctx.createGain();
    gN.gain.setValueAtTime(vol * 0.85, now);
    gN.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    src.connect(lp);
    lp.connect(gN);
    gN.connect(this.out);
    src.start(now);
    src.stop(now + 0.065);

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.065);
    g.gain.setValueAtTime(vol * 0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(g);
    g.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPocket(): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuf || !this.out) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g0 = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.09);
    g0.gain.setValueAtTime(0.28, now);
    g0.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g0);
    g0.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.11);

    [0.095, 0.175, 0.245].forEach((offset, idx) => {
      if (!this.ctx || !this.noiseBuf || !this.out) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920 + idx * 140, now + offset);
      bp.Q.setValueAtTime(3.2, now + offset);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2 - idx * 0.05, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.032);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.out);
      src.start(now + offset);
      src.stop(now + offset + 0.04);
    });
  }

  public playTick(): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.out) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.025);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g);
    g.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playFoul(): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.out) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.24);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(this.out);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playWin(): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    if (!this.ctx || !this.out) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.out) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.2, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
      osc.connect(g);
      g.connect(this.out);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.3);
    });
  }
}

export const billiardsSound = new BilliardsSoundEngine();
