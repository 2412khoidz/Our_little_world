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

    // 2. Natural short trill variant from CC0 cat sample
    encodeDerivedClip(
      path.join(PET_AUDIO_DIR, 'meow_happy.mp3'),
      path.join(PET_AUDIO_DIR, 'meow_chirp.mp3'),
      'atrim=0:0.32,asetrate=44100*1.08,aresample=44100,afade=t=in:st=0:d=0.02,afade=t=out:st=0.22:d=0.10',
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
