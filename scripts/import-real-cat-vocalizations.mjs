/**
 * Imports genuine recorded cat/kitten vocalizations from verified CC0 (Freesound)
 * and royalty-free (Mixkit) donors into `public/assets/pet-care-v2/audio/`.
 * Replaces any previously synthesized formant meows with real audio recordings.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public/assets/pet-care-v2/audio');

export const REAL_CAT_VOCALIZATION_DONORS = [
  {
    id: 'meow_kitten_cute',
    url: 'https://cdn.freesound.org/previews/448/448084_9159316-hq.mp3',
    source: 'Freesound #448084 (Breviceps — Cute Kitten Meow, CC0 1.0)',
    startSec: null,
    endSec: null,
    loudnorm: true,
  },
  {
    id: 'meow_short',
    url: 'https://cdn.freesound.org/previews/813/813119_71257-hq.mp3',
    source: 'Freesound #813119 (qubodup — Cat Meow, CC0 1.0)',
    startSec: null,
    endSec: null,
    loudnorm: true,
  },
  {
    id: 'meow_soft',
    url: 'https://cdn.freesound.org/previews/813/813113_71257-hq.mp3',
    source: 'Freesound #813113 (qubodup — Cat Meowing, CC0 1.0)',
    startSec: null,
    endSec: null,
    loudnorm: true,
  },
  {
    id: 'meow_kitten_double',
    url: 'https://cdn.freesound.org/previews/476/476918_3211895-hq.mp3',
    source: 'Freesound #476918 (Luke100000 — Kitten meows, CC0 1.0, double call slice)',
    startSec: 0.44,
    endSec: 2.6,
    loudnorm: true,
  },
  {
    id: 'meow_chirp',
    url: 'https://cdn.freesound.org/previews/476/476918_3211895-hq.mp3',
    source: 'Freesound #476918 (Luke100000 — Kitten meows, CC0 1.0, gentle chirp-meow slice)',
    startSec: 3.88,
    endSec: 4.39,
    loudnorm: true,
  },
  {
    id: 'meow_happy',
    url: 'https://assets.mixkit.co/active_storage/sfx/92/92-preview.mp3',
    source: 'Mixkit #92 (Sweet kitty meow — double meow, Mixkit Free License)',
    startSec: 0,
    endSec: 2.26,
    loudnorm: true,
  },
  {
    id: 'meow_food',
    url: 'https://assets.mixkit.co/active_storage/sfx/86/86-preview.mp3',
    source: 'Mixkit #86 (Domestic cat hungry meow, Mixkit Free License)',
    startSec: null,
    endSec: null,
    loudnorm: true,
  },
  {
    id: 'meow_attention',
    url: 'https://assets.mixkit.co/active_storage/sfx/96/96-preview.mp3',
    source: 'Mixkit #96 (Little cat attention meow, Mixkit Free License)',
    startSec: 0,
    endSec: 3.28,
    loudnorm: true,
  },
];

async function downloadWithCache(url, cacheMap, tmpDir, idx) {
  if (cacheMap.has(url)) return cacheMap.get(url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OurLittleWorld-AudioImporter/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2048) {
    throw new Error(`Suspiciously small download (${buf.length}B) for ${url}`);
  }
  const srcPath = path.join(tmpDir, `src-${idx}.mp3`);
  fs.writeFileSync(srcPath, buf);
  cacheMap.set(url, srcPath);
  return srcPath;
}

function transcodeRealClip(srcPath, outPath, spec) {
  const args = ['-y', '-loglevel', 'error'];
  if (spec.startSec !== null && spec.endSec !== null) {
    args.push('-ss', String(spec.startSec), '-to', String(spec.endSec));
  }
  args.push('-i', srcPath);

  const filters = ['highpass=f=110', 'silenceremove=start_periods=1:start_threshold=-42dB'];
  if (spec.loudnorm) {
    filters.push('loudnorm=I=-15:TP=-1.5:LRA=11');
  }
  filters.push('afade=t=in:st=0:d=0.01');
  args.push('-af', filters.join(','), '-ar', '44100', '-ac', '1', '-b:a', '128k', outPath);
  execFileSync('ffmpeg', args, { stdio: 'pipe' });

  const durText = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', outPath],
    { encoding: 'utf8' },
  ).trim();
  const durationSec = Number.parseFloat(durText);
  if (!Number.isFinite(durationSec) || durationSec < 0.25) {
    throw new Error(`Invalid duration (${durText}s) for ${outPath}`);
  }
  const md5 = crypto.createHash('md5').update(fs.readFileSync(outPath)).digest('hex');
  return { durationSec, md5 };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-real-meows-'));
  const cacheMap = new Map();
  try {
    const hashes = new Set();
    for (let i = 0; i < REAL_CAT_VOCALIZATION_DONORS.length; i += 1) {
      const spec = REAL_CAT_VOCALIZATION_DONORS[i];
      const srcPath = await downloadWithCache(spec.url, cacheMap, tmpDir, i);
      const outPath = path.join(OUT_DIR, `${spec.id}.mp3`);
      const { durationSec, md5 } = transcodeRealClip(srcPath, outPath, spec);
      hashes.add(md5);
      console.log(`Imported ${spec.id}.mp3 (${durationSec.toFixed(2)}s, md5=${md5.slice(0, 8)}) <- ${spec.source}`);
    }
    if (hashes.size !== REAL_CAT_VOCALIZATION_DONORS.length) {
      throw new Error('Duplicate MD5 hash detected across imported cat clips!');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
