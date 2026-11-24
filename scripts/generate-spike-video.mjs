import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT_DIR = path.join(process.cwd(), 'public', 'spike');
const OUT_FILE = path.join(OUT_DIR, 'sample-cozy-sync.mp4');
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = [
  '-y',
  '-f', 'lavfi',
  '-i', 'testsrc2=size=480x270:rate=30:duration=8',
  '-f', 'lavfi',
  '-i', 'sine=frequency=440:sample_rate=44100:duration=8',
  '-c:v', 'libx264',
  '-profile:v', 'baseline',
  '-level', '3.0',
  '-pix_fmt', 'yuv420p',
  '-g', '30',
  '-c:a', 'aac',
  '-b:a', '96k',
  '-movflags', '+faststart',
  OUT_FILE,
];

const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (res.error || res.status !== 0) {
  console.error('Không thể chạy ffmpeg để tạo video mẫu Spike 0.', res.error ?? '');
  process.exit(res.status ?? 1);
}

const stat = fs.statSync(OUT_FILE);
console.log(`Đã tạo video mẫu Spike 0: ${OUT_FILE} (${(stat.size / 1024).toFixed(1)} KB)`);
