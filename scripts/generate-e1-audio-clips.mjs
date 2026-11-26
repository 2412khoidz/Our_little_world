/**
 * Generates MIT-derived surface footstep variants, CC0 natural cat chirp variant,
 * and original CC0 JRPG-style reward stingers for Mission P.1 Checkpoint E1.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SFX_DIR = path.join(REPO_ROOT, 'public/assets/audio/sfx');
const PET_AUDIO_DIR = path.join(REPO_ROOT, 'public/assets/pet-care-v2/audio');
const SAMPLE_RATE = 44100;

function runFfmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'pipe' });
}

function encodeDerivedClip(srcAbs, outAbs, afFilter) {
  runFfmpeg(['-i', srcAbs, '-af', afFilter, '-ar', String(SAMPLE_RATE), '-ac', '1', '-b:a', '96k', outAbs]);
}

function writeToneSequenceMp3(tmpDir, name, notes, outAbs) {
  const totalSec = notes.reduce((maxT, n) => Math.max(maxT, n.start + n.dur), 0) + 0.08;
  const totalSamples = Math.ceil(totalSec * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  for (const n of notes) {
    const startIdx = Math.floor(n.start * SAMPLE_RATE);
    const lenSamples = Math.max(1, Math.floor(n.dur * SAMPLE_RATE));
    const gain = n.gain ?? 0.28;
    for (let i = 0; i < lenSamples && startIdx + i < totalSamples; i += 1) {
      const t = i / SAMPLE_RATE;
      const envAttack = Math.min(1, t / 0.012);
      const envDecay = Math.exp(-t * (n.decayRate ?? 6.5));
      const env = envAttack * envDecay;
      const phase = 2 * Math.PI * n.freq * t;
      // Warm bell-marimba tone: fundamental sine + soft octave + mild fifth harmonic
      const osc =
        Math.sin(phase) * 0.72 +
        Math.sin(phase * 2) * 0.2 +
        Math.sin(phase * 3) * 0.08;
      samples[startIdx + i] += osc * env * gain;
    }
  }

  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const scale = peak > 0.85 ? 0.85 / peak : 1;

  const pcm = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] * scale));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  const tmpWav = path.join(tmpDir, `${name}.wav`);
  fs.writeFileSync(tmpWav, Buffer.concat([header, pcm]));
  runFfmpeg(['-i', tmpWav, '-ar', String(SAMPLE_RATE), '-ac', '1', '-b:a', '96k', outAbs]);
}

function writePcmSamplesMp3(tmpDir, name, samples, outAbs, afExtra = '') {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const scale = peak > 0.85 ? 0.85 / peak : 1;
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] * scale));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  const tmpWav = path.join(tmpDir, `${name}.wav`);
  fs.writeFileSync(tmpWav, Buffer.concat([header, pcm]));
  const args = ['-i', tmpWav];
  if (afExtra) args.push('-af', afExtra);
  args.push('-ar', String(SAMPLE_RATE), '-ac', '1', '-b:a', '112k', outAbs);
  runFfmpeg(args);
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Formant-filtered kitten syllable synthesizer:
 * produces soft "m"/"ny" nasal onset -> open vowel -> rounded "ow/aa" tail
 * using parallel resonant vocal-tract formants instead of harsh raw buzz.
 */
function renderKittenSyllables(syllables, totalSec) {
  const totalSamples = Math.ceil(totalSec * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  // One resonator biquad state per formant (F1, F2, F3)
  const resStep = (state, x, freqHz, bwHz) => {
    const r = Math.exp((-Math.PI * bwHz) / SAMPLE_RATE);
    const omega = (2 * Math.PI * Math.min(freqHz, SAMPLE_RATE * 0.42)) / SAMPLE_RATE;
    const a1 = -2 * r * Math.cos(omega);
    const a2 = r * r;
    const g = (1 - r) * 0.85;
    const y = g * x - a1 * state.y1 - a2 * state.y2;
    state.y2 = state.y1;
    state.y1 = y;
    return y;
  };

  for (const s of syllables) {
    const startIdx = Math.floor(s.start * SAMPLE_RATE);
    const len = Math.max(1, Math.floor(s.dur * SAMPLE_RATE));
    const f1State = { y1: 0, y2: 0 };
    const f2State = { y1: 0, y2: 0 };
    const f3State = { y1: 0, y2: 0 };
    let glottalPhase = 0;
    let breathLp = 0;
    let seed = Math.round(s.fStart * 17) + 1337;

    for (let i = 0; i < len && startIdx + i < totalSamples; i += 1) {
      const u = i / len;
      const tSec = i / SAMPLE_RATE;

      // Natural smooth pitch contour: rise gently into vowel peak, glide warmly at release
      const pitchBase =
        u < 0.34
          ? lerp(s.fStart, s.fPeak, Math.sin(((u / 0.34) * Math.PI) / 2))
          : lerp(s.fPeak, s.fEnd, Math.pow((u - 0.34) / 0.66, 0.85));
      const vib = 1 + Math.sin(2 * Math.PI * 5.6 * tSec) * 0.011 * Math.min(1, u * 3);
      const trillMod = s.trillHz ? 1 + Math.sin(2 * Math.PI * s.trillHz * tSec) * 0.055 * (1 - u * 0.5) : 1;
      const f0 = pitchBase * vib * trillMod;
      glottalPhase = (glottalPhase + f0 / SAMPLE_RATE) % 1;

      // Soft warm glottal wave (fundamental + gently rolling overtones)
      const g1 = Math.sin(2 * Math.PI * glottalPhase);
      const g2 = Math.sin(2 * Math.PI * 2 * glottalPhase) * 0.42;
      const g3 = Math.sin(2 * Math.PI * 3 * glottalPhase) * 0.19;
      const g4 = Math.sin(2 * Math.PI * 4 * glottalPhase) * 0.08;
      const glottal = g1 + g2 + g3 + g4;

      // Subtle pink breathy air noise on onset/release
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = ((seed >>> 16) / 32768) - 1;
      breathLp = breathLp * 0.78 + white * 0.22;
      const breathGain = u < 0.16 ? 0.075 * (1 - u / 0.16) : 0.018;

      // Vowel trajectory: nasal murmur -> bright eh/aa -> soft ow/a
      let f1;
      let f2;
      let f3;
      if (u < 0.15) {
        const k = u / 0.15;
        f1 = lerp(340, s.vowelPeakF1 ?? 860, k);
        f2 = lerp(s.nasalF2 ?? 1380, s.vowelPeakF2 ?? 2050, k);
        f3 = 3150;
      } else {
        const k = Math.pow((u - 0.15) / 0.85, 0.9);
        f1 = lerp(s.vowelPeakF1 ?? 860, s.tailF1 ?? 460, k);
        f2 = lerp(s.vowelPeakF2 ?? 2050, s.tailF2 ?? 1020, k);
        f3 = lerp(3150, 2750, k);
      }

      const src = glottal + breathLp * breathGain;
      const r1 = resStep(f1State, src, f1, 95) * 0.62;
      const r2 = resStep(f2State, src, f2, 135) * 0.42;
      const r3 = resStep(f3State, src, f3, 210) * 0.14;
      const body = g1 * 0.24;

      const attack = Math.min(1, u / 0.09);
      const release = Math.min(1, (1 - u) / 0.18);
      const mouthOpen = u < 0.12 ? lerp(0.45, 1.0, u / 0.12) : 1.0;
      const trillAmp = s.trillHz ? 0.86 + 0.14 * Math.sin(2 * Math.PI * s.trillHz * tSec) : 1;
      const env = Math.sin((attack * Math.PI) / 2) * Math.pow(release, 0.72) * mouthOpen * trillAmp;

      out[startIdx + i] += (r1 + r2 + r3 + body) * env * (s.gain ?? 0.55);
    }
  }
  return out;
}

function main() {
  fs.mkdirSync(SFX_DIR, { recursive: true });
  fs.mkdirSync(PET_AUDIO_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-e1-audio-'));

  try {
    // 1. Acoustic surface footsteps derived from verified MIT SFX
    encodeDerivedClip(
      path.join(SFX_DIR, 'grassyStep.mp3'),
      path.join(SFX_DIR, 'step_soil.mp3'),
      'lowpass=f=760,asetrate=44100*0.86,aresample=44100,atrim=0:0.22,afade=t=out:st=0.14:d=0.08',
    );
    encodeDerivedClip(
      path.join(SFX_DIR, 'grassyStep.mp3'),
      path.join(SFX_DIR, 'step_sand.mp3'),
      'highpass=f=1200,lowpass=f=4800,volume=0.85,atrim=0:0.24,afade=t=out:st=0.15:d=0.09',
    );
    encodeDerivedClip(
      path.join(SFX_DIR, 'doorOpen.mp3'),
      path.join(SFX_DIR, 'step_wood.mp3'),
      'bandpass=f=520:w=420,asetrate=44100*1.45,aresample=44100,volume=0.82,atrim=0:0.16,afade=t=out:st=0.08:d=0.08',
    );
    encodeDerivedClip(
      path.join(SFX_DIR, 'select.mp3'),
      path.join(SFX_DIR, 'step_stone.mp3'),
      'highpass=f=900,lowpass=f=2800,volume=0.65,atrim=0:0.14,afade=t=out:st=0.06:d=0.08',
    );
    encodeDerivedClip(
      path.join(SFX_DIR, 'waterPlants.mp3'),
      path.join(SFX_DIR, 'step_water.mp3'),
      'highpass=f=600,lowpass=f=3600,volume=0.72,atrim=0:0.24,afade=t=out:st=0.14:d=0.10',
    );

    // 2. Cute natural formant-synthesized kitten vocalizations (meo meo, meow, nyaa~)
    const meowSmoothAf = 'highpass=f=240,lowpass=f=3600,aecho=0.85:0.7:18:0.12,afade=t=in:st=0:d=0.015';
    writePcmSamplesMp3(
      tmpDir,
      'meow_soft',
      renderKittenSyllables(
        [
          {
            start: 0.01,
            dur: 0.56,
            fStart: 560,
            fPeak: 770,
            fEnd: 520,
            nasalF2: 1450,
            vowelPeakF1: 840,
            vowelPeakF2: 1960,
            tailF1: 440,
            tailF2: 960,
            gain: 0.62,
          },
        ],
        0.64,
      ),
      path.join(PET_AUDIO_DIR, 'meow_soft.mp3'),
      meowSmoothAf,
    );
    writePcmSamplesMp3(
      tmpDir,
      'meow_happy',
      renderKittenSyllables(
        [
          {
            start: 0.01,
            dur: 0.21,
            fStart: 690,
            fPeak: 890,
            fEnd: 740,
            nasalF2: 1850,
            vowelPeakF1: 920,
            vowelPeakF2: 2240,
            tailF1: 620,
            tailF2: 1320,
            trillHz: 26,
            gain: 0.58,
          },
          {
            start: 0.25,
            dur: 0.36,
            fStart: 640,
            fPeak: 930,
            fEnd: 700,
            nasalF2: 1750,
            vowelPeakF1: 900,
            vowelPeakF2: 2150,
            tailF1: 480,
            tailF2: 1080,
            gain: 0.64,
          },
        ],
        0.68,
      ),
      path.join(PET_AUDIO_DIR, 'meow_happy.mp3'),
      meowSmoothAf,
    );
    writePcmSamplesMp3(
      tmpDir,
      'meow_chirp',
      renderKittenSyllables(
        [
          {
            start: 0.01,
            dur: 0.32,
            fStart: 710,
            fPeak: 990,
            fEnd: 840,
            nasalF2: 2100,
            vowelPeakF1: 950,
            vowelPeakF2: 2380,
            tailF1: 720,
            tailF2: 1820,
            trillHz: 30,
            gain: 0.62,
          },
        ],
        0.38,
      ),
      path.join(PET_AUDIO_DIR, 'meow_chirp.mp3'),
      meowSmoothAf,
    );
    writePcmSamplesMp3(
      tmpDir,
      'meow_short',
      renderKittenSyllables(
        [
          {
            start: 0.01,
            dur: 0.22,
            fStart: 700,
            fPeak: 880,
            fEnd: 760,
            nasalF2: 1700,
            vowelPeakF1: 880,
            vowelPeakF2: 2180,
            tailF1: 540,
            tailF2: 1240,
            gain: 0.6,
          },
        ],
        0.27,
      ),
      path.join(PET_AUDIO_DIR, 'meow_short.mp3'),
      meowSmoothAf,
    );
    writePcmSamplesMp3(
      tmpDir,
      'meow_food',
      renderKittenSyllables(
        [
          {
            start: 0.01,
            dur: 0.56,
            fStart: 620,
            fPeak: 920,
            fEnd: 850,
            nasalF2: 1950,
            vowelPeakF1: 940,
            vowelPeakF2: 2260,
            tailF1: 680,
            tailF2: 1620,
            gain: 0.62,
          },
        ],
        0.64,
      ),
      path.join(PET_AUDIO_DIR, 'meow_food.mp3'),
      meowSmoothAf,
    );

    // 3. Original CC0 JRPG-style success stingers (warm bell-marimba arpeggios)
    writeToneSequenceMp3(
      tmpDir,
      'stinger_item',
      [
        { start: 0.0, dur: 0.14, freq: 523.25, gain: 0.25 },
        { start: 0.1, dur: 0.14, freq: 659.25, gain: 0.26 },
        { start: 0.2, dur: 0.28, freq: 783.99, gain: 0.3, decayRate: 5.5 },
      ],
      path.join(SFX_DIR, 'stinger_item.mp3'),
    );

    writeToneSequenceMp3(
      tmpDir,
      'stinger_fish',
      [
        { start: 0.0, dur: 0.14, freq: 392.0, gain: 0.24 },
        { start: 0.1, dur: 0.14, freq: 493.88, gain: 0.25 },
        { start: 0.2, dur: 0.14, freq: 587.33, gain: 0.26 },
        { start: 0.3, dur: 0.32, freq: 783.99, gain: 0.3, decayRate: 5.0 },
      ],
      path.join(SFX_DIR, 'stinger_fish.mp3'),
    );

    writeToneSequenceMp3(
      tmpDir,
      'stinger_rare',
      [
        { start: 0.0, dur: 0.12, freq: 523.25, gain: 0.22 },
        { start: 0.09, dur: 0.12, freq: 659.25, gain: 0.24 },
        { start: 0.18, dur: 0.12, freq: 783.99, gain: 0.25 },
        { start: 0.27, dur: 0.14, freq: 880.0, gain: 0.26 },
        { start: 0.38, dur: 0.14, freq: 987.77, gain: 0.27 },
        { start: 0.49, dur: 0.46, freq: 1046.5, gain: 0.32, decayRate: 4.0 },
        { start: 0.49, dur: 0.44, freq: 783.99, gain: 0.16, decayRate: 4.5 },
      ],
      path.join(SFX_DIR, 'stinger_rare.mp3'),
    );

    writeToneSequenceMp3(
      tmpDir,
      'stinger_quest',
      [
        { start: 0.0, dur: 0.13, freq: 587.33, gain: 0.25 },
        { start: 0.11, dur: 0.13, freq: 739.99, gain: 0.26 },
        { start: 0.22, dur: 0.13, freq: 880.0, gain: 0.27 },
        { start: 0.33, dur: 0.15, freq: 783.99, gain: 0.26 },
        { start: 0.46, dur: 0.4, freq: 1174.66, gain: 0.32, decayRate: 4.2 },
      ],
      path.join(SFX_DIR, 'stinger_quest.mp3'),
    );

    writeToneSequenceMp3(
      tmpDir,
      'stinger_area',
      [
        { start: 0.0, dur: 0.15, freq: 659.25, gain: 0.24 },
        { start: 0.12, dur: 0.15, freq: 830.61, gain: 0.25 },
        { start: 0.24, dur: 0.15, freq: 987.77, gain: 0.26 },
        { start: 0.36, dur: 0.38, freq: 1318.51, gain: 0.28, decayRate: 4.5 },
      ],
      path.join(SFX_DIR, 'stinger_area.mp3'),
    );

    console.log('Generated E1 footsteps, cat chirp & JRPG stingers.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
