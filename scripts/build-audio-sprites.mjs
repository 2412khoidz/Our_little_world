/**
 * Packs MIT/CC0 short SFX clips into 4 domain audio sprites (Phaser / audiosprite JSON + MP3)
 * using local ffmpeg and sample-exact 44.1kHz mono PCM concatenation.
 * Long BGM tracks and purr loops remain separate files.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public/assets/audio/sprites');
const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2; // s16le
const PAD_SEC = 0.12;

const DOMAIN_SPECS = {
  farming: {
    hoe: 'public/assets/audio/sfx/hoe.mp3',
    plant: 'public/assets/audio/sfx/plantSeed.mp3',
    water: 'public/assets/audio/sfx/waterPlants.mp3',
    harvest: 'public/assets/audio/sfx/sickle.mp3',
    fail: 'public/assets/audio/sfx/fail.mp3',
  },
  world: {
    footstep: 'public/assets/audio/sfx/grassyStep.mp3',
    door: 'public/assets/audio/sfx/doorOpen.mp3',
    interact: 'public/assets/audio/sfx/interaction.mp3',
    rod: 'public/assets/audio/sfx/toolSwap.mp3',
  },
  pet: {
    meow_soft: 'public/assets/pet-care-v2/audio/meow_soft.mp3',
    meow_happy: 'public/assets/pet-care-v2/audio/meow_happy.mp3',
    meow_food: 'public/assets/pet-care-v2/audio/meow_food.mp3',
    eat_crunch: 'public/assets/pet-care-v2/audio/eat_crunch.mp3',
    drink_lap: 'public/assets/pet-care-v2/audio/drink_lap.mp3',
    ball_bounce: 'public/assets/pet-care-v2/audio/ball_bounce.mp3',
    bell_jingle: 'public/assets/pet-care-v2/audio/bell_jingle.mp3',
    brush_fur: 'public/assets/pet-care-v2/audio/brush_fur.mp3',
    toy_swish: 'public/assets/pet-care-v2/audio/toy_swish.mp3',
  },
  ui: {
    ui_select: 'public/assets/audio/sfx/select.mp3',
    tool_swap: 'public/assets/audio/sfx/toolSwap.mp3',
    shop_buy: 'public/assets/audio/sfx/purchaseClick.mp3',
    shop_sell: 'public/assets/audio/sfx/sell.mp3',
    fail: 'public/assets/audio/sfx/fail.mp3',
  },
};

function decodeToPcmBytes(srcPath, tmpWav) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-i',
      srcPath,
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      String(CHANNELS),
      '-c:a',
      'pcm_s16le',
      tmpWav,
    ],
    { stdio: 'pipe' },
  );
  const buf = fs.readFileSync(tmpWav);
  // Locate 'data' chunk in WAV
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') {
      return buf.subarray(offset + 8, offset + 8 + size);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`Invalid WAV data chunk in ${tmpWav}`);
}

function makeWavBuffer(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, 28);
  header.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-audio-sprites-'));
  const bytesPerSec = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;
  const padBytes = Buffer.alloc(Math.round(PAD_SEC * SAMPLE_RATE) * CHANNELS * BYTES_PER_SAMPLE);

  try {
    for (const [domain, entries] of Object.entries(DOMAIN_SPECS)) {
      const pcmParts = [];
      const spritemap = {};
      let cursorSamples = 0;

      for (const [clipKey, relPath] of Object.entries(entries)) {
        const absSrc = path.join(REPO_ROOT, relPath);
        if (!fs.existsSync(absSrc)) {
          throw new Error(`Missing SFX source: ${absSrc}`);
        }
        const tmpWav = path.join(tmpDir, `${domain}-${clipKey}.wav`);
        const pcm = decodeToPcmBytes(absSrc, tmpWav);
        const samples = Math.floor(pcm.length / (CHANNELS * BYTES_PER_SAMPLE));
        const startSec = Number((cursorSamples / SAMPLE_RATE).toFixed(4));
        const endSec = Number(((cursorSamples + samples) / SAMPLE_RATE).toFixed(4));
        spritemap[clipKey] = {
          start: startSec,
          end: endSec,
          loop: false,
        };
        pcmParts.push(pcm, padBytes);
        cursorSamples += samples + Math.floor(padBytes.length / (CHANNELS * BYTES_PER_SAMPLE));
      }

      const combinedWav = path.join(tmpDir, `${domain}-combined.wav`);
      fs.writeFileSync(combinedWav, makeWavBuffer(Buffer.concat(pcmParts)));

      const outMp3 = path.join(OUT_DIR, `${domain}.mp3`);
      const outJson = path.join(OUT_DIR, `${domain}.json`);
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-i',
          combinedWav,
          '-ar',
          String(SAMPLE_RATE),
          '-ac',
          String(CHANNELS),
          '-b:a',
          '96k',
          outMp3,
        ],
        { stdio: 'pipe' },
      );

      const manifest = {
        resources: [`/assets/audio/sprites/${domain}.mp3`],
        spritemap,
        durationSec: Number((Buffer.concat(pcmParts).length / bytesPerSec).toFixed(4)),
      };
      fs.writeFileSync(outJson, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`Built ${domain} sprite: ${Object.keys(spritemap).length} clips -> ${path.relative(REPO_ROOT, outMp3)}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
